import { sql } from 'drizzle-orm';

import { db, pool } from '../db';
import { cleanupExpiredRateLimits } from '../lib/rate-limit';
import { structuredLog } from '../lib/structured-log';

const EVENT_RETENTION_DAYS = 90;
const SESSION_RETENTION_DAYS = 180;
const BATCH_SIZE = 5000;

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Acquérir un verrou PostgreSQL pour empêcher des exécutions multiples simultanées
  const lockResult = await db.execute<{ locked: boolean }>(
    sql`select pg_try_advisory_lock(hashtext('worker_maintenance')) as locked`,
  );
  if (!lockResult.rows[0]?.locked) {
    console.log('Un autre worker de maintenance est déjà en cours. Arrêt.');
    return;
  }

  try {
    // Timeout global pour la maintenance
    await db.execute(sql`set local statement_timeout = '5min'`);

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

    // --- Rate limits (Déjà nettoyés dans la librairie) ---
    const deletedRateLimits = await cleanupExpiredRateLimits();

    // --- Abuse events (par lots) ---
    let deletedAbuseEventsTotal = 0;
    while (true) {
      const deleted = await db.execute<{ count: number }>(sql`
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
      const deleted = await db.execute<{ count: number }>(sql`
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
    await db.execute(sql`
      update playback_sessions
      set status = 'expired', ended_at = coalesce(ended_at, expires_at)
      where status = 'active' and expires_at < now()
    `);

    // --- Sessions terminées/expirées (suppression par lots) ---
    let deletedSessionsTotal = 0;
    while (true) {
      const deleted = await db.execute<{ count: number }>(sql`
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
  } finally {
    await db.execute(sql`select pg_advisory_unlock(hashtext('worker_maintenance'))`);
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
