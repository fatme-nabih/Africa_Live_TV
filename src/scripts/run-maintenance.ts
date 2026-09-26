import { Client } from 'pg';
import { sql } from 'drizzle-orm';

import { db, pool } from '../db';
import { cleanupExpiredRateLimits } from '../lib/rate-limit';
import { structuredLog } from '../lib/structured-log';

const EVENT_RETENTION_DAYS = 90;
const SESSION_RETENTION_DAYS = 180;
const BATCH_SIZE = 5000;

// Advisory lock key — fixed 32-bit integer, named so lock and unlock
// always use the same value.  hashtext('africa_live_maintenance') = 1929456431.
const MAINTENANCE_LOCK_KEY = 1_929_456_431;

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Use a dedicated pg.Client (not a pool connection) for the advisory lock.
  // pg_try_advisory_lock and pg_advisory_unlock must run on the same TCP
  // connection; pool.connect() does not guarantee that.
  const client = new Client({ connectionString: process.env.DATABASE_URL! });
  await client.connect();

  try {
    const lockResult = await client.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock(${MAINTENANCE_LOCK_KEY}) AS locked`,
    );
    if (!lockResult.rows[0]?.locked) {
      console.log('Un autre worker de maintenance est déjà en cours. Arrêt.');
      return;
    }

    try {
      if (dryRun) {
        console.log('Mode --dry-run activé. Calcul des candidats...');
        const [events, sessions, abuse] = await Promise.all([
          db.execute<{ count: number }>(sql`
            select count(*)::int as count from playback_events
            where received_at < now() - (${EVENT_RETENTION_DAYS} * interval '1 day')
          `),
          db.execute<{ count: number }>(sql`
            select count(*)::int as count from playback_sessions
            where (
              status in ('stopped', 'expired')
              and coalesce(ended_at, expires_at, created_at) < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
            ) or (
              status = 'active'
              and expires_at < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
            )
          `),
          db.execute<{ count: number }>(sql`
            select count(*)::int as count from api_abuse_events where expires_at < now()
          `),
        ]);
        console.log(
          JSON.stringify(
            {
              policy: { eventDays: EVENT_RETENTION_DAYS, sessionDays: SESSION_RETENTION_DAYS },
              candidates: {
                events: events.rows[0]?.count ?? 0,
                sessions: sessions.rows[0]?.count ?? 0,
                abuse: abuse.rows[0]?.count ?? 0,
              },
            },
            null,
            2,
          ),
        );
        return;
      }

      // Apply a statement_timeout inside an explicit transaction so SET LOCAL
      // takes effect and does not leak across pool connections.
      await db.transaction(async (tx) => {
        await tx.execute(sql`set local statement_timeout = '5min'`);

        // --- Rate limits ---
        const deletedRateLimits = await cleanupExpiredRateLimits();

        // --- Abuse events (par lots) ---
        let deletedAbuseEventsTotal = 0;
        while (true) {
          const deleted = await tx.execute<{ count: number }>(sql`
            with expired as (
              select id from api_abuse_events where expires_at < now() limit ${BATCH_SIZE}
            ),
            deleted as (
              delete from api_abuse_events where id in (select id from expired) returning 1
            )
            select count(*)::int as count from deleted
          `);
          const count = Number(deleted.rows[0]?.count ?? 0);
          deletedAbuseEventsTotal += count;
          if (count < BATCH_SIZE) break;
        }

        // --- Playback events (par lots) ---
        let deletedPlaybackEventsTotal = 0;
        while (true) {
          const deleted = await tx.execute<{ count: number }>(sql`
            with expired as (
              select id from playback_events
              where received_at < now() - (${EVENT_RETENTION_DAYS} * interval '1 day')
              limit ${BATCH_SIZE}
            ),
            deleted as (
              delete from playback_events where id in (select id from expired) returning 1
            )
            select count(*)::int as count from deleted
          `);
          const count = Number(deleted.rows[0]?.count ?? 0);
          deletedPlaybackEventsTotal += count;
          if (count < BATCH_SIZE) break;
        }

        // --- Sessions actives expirées (mise à jour) ---
        await tx.execute(sql`
          update playback_sessions
          set status = 'expired', ended_at = coalesce(ended_at, expires_at)
          where status = 'active' and expires_at < now()
        `);

        // --- Sessions terminées/expirées (suppression par lots) ---
        let deletedSessionsTotal = 0;
        while (true) {
          const deleted = await tx.execute<{ count: number }>(sql`
            with expired as (
              select id from playback_sessions
              where status in ('stopped', 'expired')
                and coalesce(ended_at, expires_at, created_at) < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
              limit ${BATCH_SIZE}
            ),
            deleted as (
              delete from playback_sessions where id in (select id from expired) returning 1
            )
            select count(*)::int as count from deleted
          `);
          const count = Number(deleted.rows[0]?.count ?? 0);
          deletedSessionsTotal += count;
          if (count < BATCH_SIZE) break;
        }

        structuredLog('info', 'maintenance.completed', {
          deletedRateLimits,
          deletedAbuseEvents: deletedAbuseEventsTotal,
          deletedPlaybackEvents: deletedPlaybackEventsTotal,
          deletedSessions: deletedSessionsTotal,
          eventRetentionDays: EVENT_RETENTION_DAYS,
          sessionRetentionDays: SESSION_RETENTION_DAYS,
        });
        console.log('Maintenance terminée avec succès.');
      });
    } finally {
      // Release the lock on the same dedicated client that acquired it.
      await client.query(`SELECT pg_advisory_unlock(${MAINTENANCE_LOCK_KEY})`);
    }
  } finally {
    await client.end();
  }
}

run()
  .catch((error) => {
    structuredLog('error', 'maintenance.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    console.error('Erreur de maintenance:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
