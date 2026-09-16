import { sql } from 'drizzle-orm';

import { db } from '../db';
import { requireDestructiveConfirmation } from '../lib/destructive-operation';
import { structuredLog } from '../lib/structured-log';

const EVENT_RETENTION_DAYS = 90;
const SESSION_RETENTION_DAYS = 180;

type CountRow = { count: number };

async function candidates() {
  const [events, sessions] = await Promise.all([
    db.execute<CountRow>(sql`
      select count(*)::int as count from playback_events
      where received_at < now() - (${EVENT_RETENTION_DAYS} * interval '1 day')
    `),
    db.execute<CountRow>(sql`
      select count(*)::int as count from playback_sessions
      where (
        status in ('stopped', 'expired')
        and coalesce(ended_at, expires_at, created_at) < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
      ) or (
        status = 'active'
        and expires_at < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
      )
    `),
  ]);
  return {
    events: events.rows[0]?.count ?? 0,
    sessions: sessions.rows[0]?.count ?? 0,
  };
}

async function run() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => !['--dry-run', '--force'].includes(arg));
  if (unknown.length) throw new Error(`Argument(s) inconnu(s): ${unknown.join(', ')}`);
  if (args.includes('--dry-run') && args.includes('--force')) {
    throw new Error('--dry-run et --force sont incompatibles.');
  }

  const before = await candidates();
  if (!args.includes('--force')) {
    console.log(JSON.stringify({ mode: 'dry-run', policy: { eventDays: EVENT_RETENTION_DAYS, sessionDays: SESSION_RETENTION_DAYS }, candidates: before }, null, 2));
    return;
  }

  await requireDestructiveConfirmation({
    operation: `supprimer ${before.events} événements et ${before.sessions} sessions expirés`,
    confirmationText: 'PURGER TELEMETRIE',
    args: ['--force'],
  });
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      delete from playback_events
      where received_at < now() - (${EVENT_RETENTION_DAYS} * interval '1 day')
    `);
    await tx.execute(sql`
      update playback_sessions
      set status = 'expired', ended_at = coalesce(ended_at, expires_at)
      where status = 'active' and expires_at < now()
    `);
    await tx.execute(sql`
      delete from playback_sessions
      where status in ('stopped', 'expired')
        and coalesce(ended_at, expires_at, created_at) < now() - (${SESSION_RETENTION_DAYS} * interval '1 day')
    `);
    await tx.execute(sql`delete from api_rate_limits where expires_at < now()`);
  });
  structuredLog('info', 'telemetry.retention.completed', {
    deletedEvents: before.events,
    deletedSessions: before.sessions,
    eventRetentionDays: EVENT_RETENTION_DAYS,
    sessionRetentionDays: SESSION_RETENTION_DAYS,
  });
}

run().catch((error) => {
  structuredLog('error', 'telemetry.retention.failed', {
    errorName: error instanceof Error ? error.name : 'UnknownError',
  });
  process.exit(1);
});
