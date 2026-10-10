import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:3001';
const result = (url: string, id = '22222222-2222-4222-8222-222222222222') => ({ playbackSessionId: '11111111-1111-4111-8111-111111111111', attemptId: id, channel: { id: 'fixture-channel', name: 'Fixture' }, sourceUrl: url });
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  await page.route('**/api/playback-events', route => route.fulfill({ json: { ok: true } }));
});

for (const status of [404, 403]) test(`B02: actual hls.js fatal manifest ${status} finishes exactly once without local flags`, async ({ page }) => {
  const failed: unknown[] = [];
  await page.route('**/api/playback-events', route => {
    if (route.request().postDataJSON().event === 'failed') failed.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: result(base + '/missing.m3u8') }));
  await page.route('**/missing.m3u8', route => route.fulfill({ status, body: 'Missing' }));
  await page.goto('/?kind=player');
  await expect(page.getByRole('button', { name: 'Lancer VLC', exact: true })).toBeVisible();
  await expect.poll(() => failed.length).toBe(1);
});

test('B02: preparation timeout covers a response that never ends', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  await page.route('**/api/playback/resolutions', route => ++requests === 1 ? route.fulfill({ json: result(base + '/held.m3u8') }) : route.fulfill({ status: 403, json: { code: 'ACCESS_REQUIRED', error: 'Fixture access' } }));
  await page.route('**/held.m3u8', () => {});
  await page.goto('/?kind=player');
  await expect(page.getByText(/Veuillez patienter/)).toBeVisible();
  await page.clock.runFor(16_000);
  await expect(page.getByText('Erreur réseau', { exact: true })).toBeVisible();
  expect(requests).toBe(2);
});

test('B02: actual hls.js retries a 503 then prepares successfully without downloading Eco segments', async ({ page }) => {
  let manifests = 0, segments = 0;
  await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
  const manifest = await readFile('e2e/fixtures/hls/index.m3u8', 'utf8');
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: result(base + '/index.m3u8') }));
  await page.route('**/index.m3u8', route => ++manifests === 1 ? route.fulfill({ status: 503, body: 'temporary' }) : route.fulfill({ contentType: 'application/vnd.apple.mpegurl', body: manifest }));
  await page.route('**/index*.ts', async route => { segments++; const filename = new URL(route.request().url()).pathname.slice(1); await route.fulfill({ contentType: 'video/mp2t', body: await readFile('e2e/fixtures/hls/' + filename) }); });
  await page.goto('/?kind=player');
  await expect(page.getByRole('button', { name: 'Lire maintenant' })).toBeVisible();
  expect(manifests).toBe(2); expect(segments).toBe(0);
  await page.getByRole('button', { name: 'Lire maintenant' }).click();
  await expect.poll(() => segments).toBeGreaterThan(0);
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});

test('B06: native MP4 downloads nothing before Eco click, then really plays', async ({ page }) => {
  const mp4 = await readFile('e2e/fixtures/hls/sample.mp4');
  let requests = 0;
  await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: result(base + '/sample.mp4') }));
  await page.route('**/sample.mp4', route => { requests++; return route.fulfill({ contentType: 'video/mp4', body: mp4 }); });
  await page.goto('/?kind=player');
  await expect(page.getByRole('button', { name: 'Lire maintenant' })).toBeVisible();
  await page.clock.install(); await page.clock.runFor(30_000);
  expect(requests).toBe(0);
  expect(await page.locator('video').getAttribute('src')).toBeNull();
  await page.getByRole('button', { name: 'Lire maintenant' }).click();
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});

test('B02: fatal manifest advances to a healthy source, with one failure and actual playback', async ({ page }) => {
  const mp4 = await readFile('e2e/fixtures/hls/sample.mp4');
  let resolutions = 0, failures = 0;
  await page.route('**/api/playback-events', route => { if (route.request().postDataJSON().event === 'failed') failures++; return route.fulfill({ json: { ok: true } }); });
  await page.route('**/api/playback/resolutions', route => {
    const first = ++resolutions === 1;
    return route.fulfill({ json: result(base + (first ? '/bad.m3u8' : '/good.mp4'), first ? '22222222-2222-4222-8222-222222222222' : '33333333-3333-4333-8333-333333333333') });
  });
  await page.route('**/bad.m3u8', route => route.fulfill({ status: 404, body: 'missing' }));
  await page.route('**/good.mp4', route => route.fulfill({ contentType: 'video/mp4', body: mp4 }));
  await page.goto('/?kind=player');
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  expect(resolutions).toBe(2); expect(failures).toBe(1);
});

for (const throws of [false, true]) test(`B12: refused popup keeps the exact video instance (throws=${throws})`, async ({ page }) => {
  const mp4 = await readFile('e2e/fixtures/hls/sample.mp4');
  await page.addInitScript(({ throws }) => { window.open = () => { if (throws) throw new Error('blocked'); return null; }; }, { throws });
  await page.route('**/api/playback/resolutions', route => route.fulfill({ json: result(base + '/playing.mp4') }));
  await page.route('**/playing.mp4', route => route.fulfill({ contentType: 'video/mp4', body: mp4 }));
  await page.goto('/?kind=dock'); await page.getByRole('button', { name: 'Open dock' }).click();
  await expect(page.locator('video')).toHaveCount(1);
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await page.locator('video').evaluate(video => video.setAttribute('data-kept', 'yes'));
  await page.getByRole('button', { name: 'Ouvrir dans une fenêtre séparée' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('data-kept', 'yes');
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(false);
  await expect(page.getByRole('alert')).toContainText('fenêtre');
});

test('B02: a late old manifest after zapping cannot replace the new playing source', async ({ page }) => {
  const mp4 = await readFile('e2e/fixtures/hls/sample.mp4');
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const loading = new Promise<void>(resolve => { arrived = resolve; });
  await page.route('**/api/playback/resolutions', route => {
    const first = route.request().postDataJSON().channelId === 'fixture-channel';
    return route.fulfill({ json: result(base + (first ? '/old.m3u8' : '/new.mp4'), first ? '22222222-2222-4222-8222-222222222222' : '33333333-3333-4333-8333-333333333333') });
  });
  await page.route('**/old.m3u8', async route => { arrived(); await held; await route.fulfill({ contentType: 'application/vnd.apple.mpegurl', body: '#EXTM3U\n#EXTINF:4,\nold.ts' }).catch(() => {}); });
  await page.route('**/new.mp4', route => route.fulfill({ contentType: 'video/mp4', body: mp4 }));
  await page.goto('/?kind=player'); await loading;
  await page.getByRole('button', { name: 'Next channel' }).click();
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  release();
  await expect(page.locator('video')).toHaveAttribute('src', base + '/new.mp4');
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(false);
});
