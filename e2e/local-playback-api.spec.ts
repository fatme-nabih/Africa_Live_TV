import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
import { assertLocalE2ETarget } from '../src/lib/integration-test-safety';

loadEnvConfig(process.cwd());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const channelId = `lot2-${randomUUID()}`;
const firstUrl = `https://media.fixture.test/${channelId}/first.m3u8`;
const secondUrl = `https://media.fixture.test/${channelId}/second.m3u8?token=fixture`;
test.use({ trace: 'off', screenshot: 'off' });

test.beforeAll(async ({ baseURL }) => {
  assertLocalE2ETarget(process.env, baseURL);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO channels (id, name, normalized_name) VALUES ($1, $2, $2)', [channelId, 'Lot 2 source fixture']);
    await client.query(`INSERT INTO streams (id, channel_id, url, status, cors_allowed, direct_eligibility, last_success_at) VALUES
      ($1, $4, $5, 'BROWSER_OK', true, 'PUBLIC_DIRECT_WEB', '2020-01-01'),
      ($2, $4, $6, 'OFFLINE', false, 'REVIEW_REQUIRED', null),
      ($3, $4, $7, 'VLC_ONLY', false, 'PUBLIC_DIRECT_VLC', '2020-01-01')`,
    [`${channelId}-a`, `${channelId}-b`, `${channelId}-c`, channelId, firstUrl, secondUrl, `https://external.fixture.test/${channelId}/live.m3u8`]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
});

test.afterAll(async () => {
  try {
    assertLocalE2ETarget(process.env, process.env.E2E_BASE_URL ?? 'http://localhost:3001');
    await pool.query('DELETE FROM playback_sessions WHERE channel_id = $1', [channelId]);
    await pool.query('DELETE FROM channels WHERE id = $1', [channelId]);
  } finally { await pool.end(); }
});

test('real API resolves expired checks and historical failures without fetching media', async ({ request, baseURL }) => {
  const headers = { Origin: baseURL! };
  const first = await request.post('/api/playback/resolutions', { headers, data: { channelId, destination: 'web' } });
  expect(first.status()).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.sourceUrl).toBe(firstUrl);
  expect(Object.keys(firstBody).sort()).toEqual(['attemptId', 'channel', 'playbackSessionId', 'sourceUrl']);
  const second = await request.post('/api/playback/resolutions', { headers, data: {
    channelId, destination: 'web', playbackSessionId: firstBody.playbackSessionId, previousAttemptId: firstBody.attemptId,
  } });
  expect(second.status()).toBe(200);
  const secondBody = await second.json();
  expect(secondBody.sourceUrl).toBe(secondUrl);
  expect(secondBody.playbackSessionId).toBe(firstBody.playbackSessionId);
  const exhausted = await request.post('/api/playback/resolutions', { headers, data: {
    channelId, destination: 'web', playbackSessionId: secondBody.playbackSessionId, previousAttemptId: secondBody.attemptId,
  } });
  expect(exhausted.status()).toBe(409);
  expect((await exhausted.json()).code).toBe('WEB_PLAYBACK_UNAVAILABLE');
  const originalCheck = await pool.query('SELECT last_success_at FROM streams WHERE id = $1', [`${channelId}-a`]);
  expect(originalCheck.rows[0].last_success_at.getUTCFullYear()).toBe(2020);
});

test('VLC API rejects arbitrary client URLs and foreign origins', async ({ request, baseURL }) => {
  const arbitrary = await request.post('/api/open-vlc', { headers: { Origin: baseURL! }, data: { channelId, url: 'file:///private.txt' } });
  expect(arbitrary.status()).toBe(400);
  const foreign = await request.post('/api/open-vlc', { headers: { Origin: 'https://foreign.example' }, data: { channelId } });
  expect(foreign.status()).toBe(403);
});
