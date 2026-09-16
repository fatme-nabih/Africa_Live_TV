import { sql } from 'drizzle-orm';

import { db, pool } from '../db';
import { cleanupExpiredRateLimits } from '../lib/rate-limit';
import { structuredLog } from '../lib/structured-log';

async function run() {
  const deletedRateLimits = await cleanupExpiredRateLimits();
  const eventsResult = await db.execute<{ deleted: number }>(sql`
    with expired as (
      select id
      from api_abuse_events
      where expires_at < now()
      order by expires_at
      limit 5000
    ),
    deleted as (
      delete from api_abuse_events
      where id in (select id from expired)
      returning 1
    )
    select count(*)::int as deleted from deleted
  `);
  structuredLog('info', 'abuse.retention.completed', {
    deletedRateLimits,
    deletedAbuseEvents: Number(eventsResult.rows[0]?.deleted ?? 0),
  });
}

run()
  .catch((error) => {
    structuredLog('error', 'abuse.retention.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
