import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/db';
import { channels, streams, users } from '@/db/schema';
import { assertIntegrationTarget } from './integration-test-safety';
import { checkHlsStream } from './stream-verification';
const enabled = process.env.L3_INTEGRATION_TEST === '1';
const ids: string[] = [];
const userIds:string[] = [];
before(async () => { if (enabled) await assertIntegrationTarget(pool); });
after(async () => { if (enabled) { for (const id of ids) await db.delete(channels).where(eq(channels.id, id)); for (const id of userIds) await db.delete(users).where(eq(users.id,id)); await pool.end(); } });
test('B03-B05: invalid/incomplete evidence removes usable web qualification without renewing history', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const { buildVerificationUpdate } = await import('../scripts/verify-streams');
  const now = new Date('2026-10-09T12:00:00Z'), success = '2026-10-09T11:00:00Z';
  const id = randomUUID(); ids.push(id);
  const userId = randomUUID(); userIds.push(userId); await db.insert(users).values({ id:userId,clerkUserId:'fixture-' + userId });
  await db.insert(channels).values({ id, name: 'Fixture Evidence', normalizedName: 'fixture evidence' });
  const [stream] = await db.insert(streams).values({ id: randomUUID(), channelId: id, url: 'https://media.fixture.test/live.m3u8', status: 'BROWSER_OK', verificationState: 'HEALTHY', directEligibility: 'PUBLIC_DIRECT_WEB', lastSuccessAt: success, lastCheckedAt: success }).returning();
  for (const evidence of ['invalid', 'incomplete'] as const) {
    const result = await checkHlsStream(stream.url,{ timeoutMs:100,retries:0,fetcher:async url => new Response(url.pathname.endsWith('.m3u8') ? '#EXTM3U\n' + (evidence === 'incomplete' ? '#EXT-X-KEY:METHOD=SAMPLE-AES,URI="key"\n' : '') + '#EXTINF:4,\nsegment.ts' : '{"error":"unavailable"}',{ headers:{ 'access-control-allow-origin':'*' } }) });
    assert.equal(result.evidence,evidence);
    const update = buildVerificationUpdate(stream, result, now);
    await db.update(streams).set(update).where(eq(streams.id, stream.id));
    const [stored] = await db.select().from(streams).where(eq(streams.id, stream.id));
    assert.equal(stored.directEligibility, 'REVIEW_REQUIRED'); assert.notEqual(stored.verificationState, 'HEALTHY');
    assert.equal(new Date(stored.lastSuccessAt!).toISOString(), new Date(success).toISOString());
    const { resolvePlaybackAttempt } = await import('./playback-resolution');
    await assert.rejects(resolvePlaybackAttempt({ userId,channelId:id,destination:'web',playbackSessionId:null,previousAttemptId:null,accessExpiresAt:null }),{ code:'WEB_PLAYBACK_UNAVAILABLE' });
  }
});
