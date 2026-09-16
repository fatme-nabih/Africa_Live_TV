import assert from 'node:assert/strict';
import { test } from 'node:test';

import { eq } from 'drizzle-orm';

import { db, pool } from '@/db';
import { apiAbuseCases, apiRateLimits, sessions, users } from '@/db/schema';

import { clearAbuseCase, recordRateLimitAlert } from './abuse-alerts';
import { syncClerkSession, syncClerkUser } from './identity';
import { consumeRateLimit } from './rate-limit';

const enabled = process.env.L3_INTEGRATION_TEST === '1';

test('identity sync is idempotent and rate limits are enforced', { skip: !enabled }, async () => {
  const clerkUserId = 'user_l3_integration_test';
  await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
  await db.delete(apiRateLimits);

  try {
    const first = await syncClerkUser({
      clerkUserId,
      email: 'first@example.test',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const second = await syncClerkUser({
      clerkUserId,
      email: 'updated@example.test',
      status: 'active',
      createdAt: new Date('2026-02-01T00:00:00.000Z'),
    });

    assert.equal(second.id, first.id);
    assert.equal(second.email, 'updated@example.test');
    assert.equal(second.trialStartedAt, first.trialStartedAt);
    assert.equal(second.trialEndsAt, first.trialEndsAt);
    assert.equal(
      (await db.select().from(users).where(eq(users.clerkUserId, clerkUserId))).length,
      1,
    );

    await syncClerkSession({
      id: 'sess_l3_integration_test',
      userId: first.id,
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastSeenAt: new Date('2026-01-01T00:01:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      endedAt: null,
    });
    await syncClerkSession({
      id: 'sess_l3_integration_test',
      userId: first.id,
      status: 'ended',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastSeenAt: new Date('2026-01-01T00:02:00.000Z'),
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      endedAt: new Date('2026-01-01T00:02:00.000Z'),
    });
    const storedSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, 'sess_l3_integration_test'));
    assert.equal(storedSessions.length, 1);
    assert.equal(storedSessions[0]?.status, 'ended');

    const options = { userId: first.id, bucket: 'integration', limit: 2, windowSeconds: 60 };
    assert.equal((await consumeRateLimit(options)).allowed, true);
    assert.equal((await consumeRateLimit(options)).allowed, true);
    const denied = await consumeRateLimit(options);
    assert.equal(denied.allowed, false);
    await recordRateLimitAlert({ userId: first.id, result: denied });
    const [abuseCase] = await db
      .select()
      .from(apiAbuseCases)
      .where(eq(apiAbuseCases.userId, first.id));
    assert.equal(abuseCase?.state, 'WARNED');
    assert.ok(abuseCase);
    assert.ok(
      await clearAbuseCase({
        caseId: abuseCase.id,
        reviewedBy: 'integration-test',
      }),
    );

    const concurrent = await Promise.all(
      Array.from({ length: 20 }, () =>
        consumeRateLimit({
          userId: first.id,
          bucket: 'integration.concurrent',
          limit: 5,
          windowSeconds: 60,
        }),
      ),
    );
    assert.equal(concurrent.filter((result) => result.allowed).length, 5);
    assert.equal(concurrent.filter((result) => !result.allowed).length, 15);
  } finally {
    await db.delete(users).where(eq(users.clerkUserId, clerkUserId));
    await db.delete(apiRateLimits);
    await pool.end();
  }
});
