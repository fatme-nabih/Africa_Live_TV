import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { eq, inArray } from 'drizzle-orm';

import { db, pool } from '@/db';
import {
  channels,
  playbackAttempts,
  playbackSessions,
  streams,
  users,
} from '@/db/schema';

const integrationEnabled =
  process.env.LOT8_RESOLUTION_INTEGRATION_TEST === '1';

test(
  'server-owned resolution creates a session and permits only a unit fallback',
  { skip: !integrationEnabled },
  async () => {
    assert.notEqual(process.env.NODE_ENV, 'production');

    const suffix = randomUUID();
    const userId = `lot8-user-${suffix}`;
    const otherUserId = `lot8-other-${suffix}`;
    const channelId = `lot8-channel-${suffix}`;
    const firstStreamId = `lot8-stream-a-${suffix}`;
    const secondStreamId = `lot8-stream-b-${suffix}`;
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1_000).toISOString();

    try {
      await db.insert(users).values([
        { id: userId, clerkUserId: `clerk-${userId}` },
        { id: otherUserId, clerkUserId: `clerk-${otherUserId}` },
      ]);
      await db.insert(channels).values({
        id: channelId,
        name: 'Lot 8 Integration',
        normalizedName: 'lot 8 integration',
      });
      await db.insert(streams).values([
        {
          id: firstStreamId,
          channelId,
          url: 'https://integration.invalid/a.m3u8',
          status: 'BROWSER_OK',
          corsAllowed: true,
          mixedContent: false,
          httpStatus: 200,
          verificationState: 'HEALTHY',
          directEligibility: 'PUBLIC_DIRECT_WEB',
          eligibilityReason: 'FRESH_BROWSER_CHECK',
          eligibilityCheckedAt: now.toISOString(),
          lastCheckedAt: now.toISOString(),
          lastSuccessAt: now.toISOString(),
        },
        {
          id: secondStreamId,
          channelId,
          url: 'https://integration.invalid/b.m3u8',
          status: 'BROWSER_OK',
          corsAllowed: true,
          mixedContent: false,
          httpStatus: 200,
          verificationState: 'HEALTHY',
          directEligibility: 'PUBLIC_DIRECT_WEB',
          eligibilityReason: 'FRESH_BROWSER_CHECK',
          eligibilityCheckedAt: now.toISOString(),
          lastCheckedAt: now.toISOString(),
          lastSuccessAt: now.toISOString(),
        },
      ]);

      const { PlaybackResolutionError, resolvePlaybackAttempt } =
        await import('./playback-resolution');
      const initial = await resolvePlaybackAttempt({
        userId,
        channelId,
        destination: 'web',
        playbackSessionId: null,
        previousAttemptId: null,
        accessExpiresAt,
        now,
      });

      const [createdSession] = await db
        .select()
        .from(playbackSessions)
        .where(eq(playbackSessions.id, initial.playbackSessionId));
      assert.equal(createdSession?.userId, userId);
      assert.equal(createdSession?.streamId, initial.source.id);
      assert.equal(createdSession?.status, 'active');

      const [createdAttempt] = await db
        .select()
        .from(playbackAttempts)
        .where(eq(playbackAttempts.id, initial.attemptId));
      assert.equal(createdAttempt?.playbackSessionId, initial.playbackSessionId);
      assert.equal(createdAttempt?.previousAttemptId, null);
      assert.equal(createdAttempt?.destination, 'web');

      await assert.rejects(
        resolvePlaybackAttempt({
          userId: otherUserId,
          channelId,
          destination: 'web',
          playbackSessionId: initial.playbackSessionId,
          previousAttemptId: initial.attemptId,
          accessExpiresAt,
          now,
        }),
        (error: unknown) =>
          error instanceof PlaybackResolutionError &&
          error.code === 'PLAYBACK_SESSION_NOT_FOUND',
      );

      const fallback = await resolvePlaybackAttempt({
        userId,
        channelId,
        destination: 'web',
        playbackSessionId: initial.playbackSessionId,
        previousAttemptId: initial.attemptId,
        accessExpiresAt,
        now,
      });
      assert.notEqual(fallback.source.id, initial.source.id);

      const attempts = await db
        .select()
        .from(playbackAttempts)
        .where(eq(playbackAttempts.playbackSessionId, initial.playbackSessionId));
      assert.equal(attempts.length, 2);
      assert.equal(
        attempts.find((attempt) => attempt.id === fallback.attemptId)?.previousAttemptId,
        initial.attemptId,
      );

      await assert.rejects(
        resolvePlaybackAttempt({
          userId,
          channelId,
          destination: 'web',
          playbackSessionId: initial.playbackSessionId,
          previousAttemptId: initial.attemptId,
          accessExpiresAt,
          now,
        }),
        (error: unknown) =>
          error instanceof PlaybackResolutionError &&
          error.code === 'PLAYBACK_ATTEMPT_SUPERSEDED',
      );

      await assert.rejects(
        resolvePlaybackAttempt({
          userId,
          channelId,
          destination: 'web',
          playbackSessionId: fallback.playbackSessionId,
          previousAttemptId: fallback.attemptId,
          accessExpiresAt,
          now,
        }),
        (error: unknown) =>
          error instanceof PlaybackResolutionError &&
          error.code === 'WEB_PLAYBACK_UNAVAILABLE',
      );

      const [updatedSession] = await db
        .select()
        .from(playbackSessions)
        .where(eq(playbackSessions.id, initial.playbackSessionId));
      assert.equal(updatedSession?.streamId, fallback.source.id);
    } finally {
      await db.delete(users).where(inArray(users.id, [userId, otherUserId]));
      await db.delete(channels).where(eq(channels.id, channelId));
      await pool.end();
    }
  },
);
