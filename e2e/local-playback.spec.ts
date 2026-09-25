import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test.use({ trace: 'off', screenshot: 'off' });

async function mockVlc(page: Page, missing = false) {
  const intents: { channelId: string; launchId: string }[] = [];
  await page.route('**/api/open-vlc', async route => {
    intents.push(route.request().postDataJSON());
    await route.fulfill({ status: missing ? 404 : 200, json: missing
      ? { error: 'VLC est introuvable. Installez VLC ou corrigez VLC_PATH.', code: 'VLC_NOT_INSTALLED' }
      : { ok: true } });
  });
  await page.route('**/api/playback-events', route => route.fulfill({ status: 200, json: { ok: true } }));
  return intents;
}

function resolved(channelId: string, sourceUrl: string) {
  return { playbackSessionId: randomUUID(), attemptId: randomUUID(), channel: { id: channelId, name: 'Chaîne de test' }, sourceUrl };
}

async function serveVideo(page: Page) {
  await page.route('https://media.fixture.test/**', async route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    const body = await readFile(path.join(process.cwd(), 'e2e/fixtures/hls', name));
    await route.fulfill({ body, contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : name.endsWith('.mp4') ? 'video/mp4' : 'video/mp2t', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
}

test('HLS is decoded in the browser and never opens VLC', async ({ page }) => {
  const intents = await mockVlc(page);
  await serveVideo(page);
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: resolved('test-browser', 'https://media.fixture.test/index.m3u8') }));
  await page.goto('/player/test-browser');
  await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await expect(page.getByText('Mode effectif : Navigateur')).toBeVisible();
  expect(intents).toHaveLength(0);
});

test('an external-only channel opens VLC automatically once', async ({ page }) => {
  const intents = await mockVlc(page);
  await page.route('**/api/playback/resolutions', route => route.fulfill({ status: 409, json: { error: 'Lecteur externe requis.', code: 'WEB_PLAYBACK_UNAVAILABLE' } }));
  await page.goto('/player/test-external');
  await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
  expect(intents).toHaveLength(1);
  expect(intents[0].channelId).toBe('test-external');
  expect(intents[0].launchId).toMatch(/^[0-9a-f-]{36}$/);
});

test('a direct MP4 source uses the browser video element', async ({ page }) => {
  const intents = await mockVlc(page);
  await serveVideo(page);
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: resolved('test-file', 'https://media.fixture.test/sample.mp4') }));
  await page.goto('/player/test-file');
  await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  expect(intents).toHaveLength(0);
});

test('a failed browser source is replaced before falling back to VLC', async ({ page }) => {
  const intents = await mockVlc(page);
  await serveVideo(page);
  let attempts = 0;
  let firstAttempt: ReturnType<typeof resolved>;
  await page.route('**/api/playback/resolutions', async route => {
    attempts += 1;
    if (attempts === 1) {
      firstAttempt = resolved('test-alternative', 'https://failure.fixture.test/first.m3u8');
      await route.fulfill({ json: firstAttempt });
    } else {
      expect(route.request().postDataJSON()).toMatchObject({ playbackSessionId: firstAttempt.playbackSessionId, previousAttemptId: firstAttempt.attemptId });
      await route.fulfill({ json: { ...resolved('test-alternative', 'https://media.fixture.test/index.m3u8'), playbackSessionId: firstAttempt.playbackSessionId } });
    }
  });
  await page.route('https://failure.fixture.test/**', route => route.fulfill({ status: 404 }));
  await page.goto('/player/test-alternative');
  await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(0);
  expect(attempts).toBe(2);
  expect(intents).toHaveLength(0);
});

test('three failed web sources trigger one automatic VLC launch', async ({ page }) => {
  await page.clock.install();
  const intents = await mockVlc(page);
  let attempts = 0;
  await page.route('**/api/playback/resolutions', route => {
    attempts += 1;
    return route.fulfill({ json: resolved('test-fallback', `https://failure.fixture.test/${attempts}.m3u8`) });
  });
  await page.route('https://failure.fixture.test/**', route => route.fulfill({ status: 404 }));
  await page.goto('/player/test-fallback');
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
  expect(attempts).toBe(3);
  expect(intents).toHaveLength(1);
});

test('missing VLC displays an error and an explicit retry creates a new intent', async ({ page }) => {
  const intents = await mockVlc(page, true);
  await page.route('**/api/playback/resolutions', route => route.fulfill({ status: 409, json: { error: 'Lecteur externe requis.', code: 'WEB_PLAYBACK_UNAVAILABLE' } }));
  await page.goto('/player/test-missing');
  await expect(page.getByText(/VLC est introuvable/)).toBeVisible();
  expect(intents).toHaveLength(1);
  await page.getByRole('button', { name: /lancer vlc/i }).click();
  await expect.poll(() => intents.length).toBe(2);
  expect(intents[0].launchId).not.toBe(intents[1].launchId);
});

test('autoplay rejection asks for a click without triggering VLC', async ({ page }) => {
  const intents = await mockVlc(page);
  await serveVideo(page);
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
  });
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: resolved('test-autoplay', 'https://media.fixture.test/index.m3u8') }));
  await page.goto('/player/test-autoplay');
  await expect(page.getByText('Touchez pour autoriser la lecture')).toBeVisible();
  expect(intents).toHaveLength(0);
});

test('a manifest that never responds times out and switches to VLC', async ({ page }) => {
  await page.clock.install();
  const intents = await mockVlc(page);
  let attempts = 0;
  await page.route('**/api/playback/resolutions', route => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ json: resolved('test-timeout', 'https://hanging.fixture.test/live.m3u8') })
      : route.fulfill({ status: 409, json: { error: 'Aucune autre source web.', code: 'WEB_PLAYBACK_UNAVAILABLE' } });
  });
  await page.route('https://hanging.fixture.test/**', () => {});
  const manifest = page.waitForRequest('https://hanging.fixture.test/live.m3u8');
  await page.goto('/player/test-timeout');
  await manifest;
  await page.clock.fastForward(13_000);
  await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
  expect(intents).toHaveLength(1);
  expect(attempts).toBe(2);
});
