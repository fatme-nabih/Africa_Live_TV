import { createHash, randomUUID } from 'node:crypto';

import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';

import { db } from '@/db';
import { apiAbuseCases, apiAbuseEvents } from '@/db/schema';
import type { RateLimitResult } from '@/lib/rate-limit';

const RATE_LIMIT_SIGNAL = 'RATE_LIMIT_EXCEEDED';
const EVENT_RETENTION_DAYS = 30;

export async function recordRateLimitAlert({
  userId,
  result,
}: {
  userId: string;
  result: RateLimitResult;
}) {
  const eventWindow = new Date().toISOString().slice(0, 16);
  let eventId: string | null = null;
  await db.transaction(async (tx) => {
    const caseResult = await tx.execute<{ id: string }>(sql`
      insert into api_abuse_cases (
        id,
        user_id,
        state,
        primary_signal,
        score,
        first_signal_at,
        last_signal_at,
        warned_at,
        created_at,
        updated_at
      ) values (
        ${randomUUID()},
        ${userId},
        'WARNED',
        ${RATE_LIMIT_SIGNAL},
        1,
        now(),
        now(),
        now(),
        now(),
        now()
      )
      on conflict (user_id, primary_signal)
        where state in ('WATCH', 'WARNED', 'SUSPENDED')
      do update set
        score = least(api_abuse_cases.score + 1, 1000000),
        last_signal_at = now(),
        warned_at = coalesce(api_abuse_cases.warned_at, now()),
        state = case
          when api_abuse_cases.state = 'WATCH' then 'WARNED'
          else api_abuse_cases.state
        end,
        updated_at = now()
      returning id
    `);
    const caseId = caseResult.rows[0]?.id;
    if (!caseId) throw new Error('Abuse case could not be recorded.');
    eventId = createHash('sha256')
      .update(
        JSON.stringify([
          'rate-limit-alert:v1',
          caseId,
          result.bucket,
          result.dimension,
          eventWindow,
        ]),
      )
      .digest('hex');

    await tx
      .insert(apiAbuseEvents)
      .values({
        id: eventId,
        caseId,
        userId,
        code: RATE_LIMIT_SIGNAL,
        severity: 'warning',
        bucket: result.bucket,
        aggregates: {
          dimension: result.dimension,
          limit: result.limit,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        expiresAt: new Date(
          Date.now() + EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000,
        ).toISOString(),
      })
      .onConflictDoNothing();
  });
  if (!eventId) throw new Error('Abuse event could not be recorded.');
  return eventId;
}

export async function getActiveAbuseSuspension(userId: string) {
  return (
    await db
      .select({
        id: apiAbuseCases.id,
        unlockAfter: apiAbuseCases.unlockAfter,
      })
      .from(apiAbuseCases)
      .where(
        and(
          eq(apiAbuseCases.userId, userId),
          eq(apiAbuseCases.state, 'SUSPENDED'),
          or(
            isNull(apiAbuseCases.unlockAfter),
            gt(apiAbuseCases.unlockAfter, new Date().toISOString()),
          ),
        ),
      )
      .limit(1)
  )[0] ?? null;
}

export async function clearAbuseCase({
  caseId,
  reviewedBy,
}: {
  caseId: string;
  reviewedBy: string;
}) {
  const now = new Date().toISOString();
  const [cleared] = await db
    .update(apiAbuseCases)
    .set({
      state: 'CLEARED',
      reviewedAt: now,
      reviewedBy,
      updatedAt: now,
    })
    .where(eq(apiAbuseCases.id, caseId))
    .returning({ id: apiAbuseCases.id });
  return cleared ?? null;
}
