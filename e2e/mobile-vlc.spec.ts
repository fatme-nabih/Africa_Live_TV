import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolved } from './helpers/tv-fixture';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const STREAM = 'http://media.fixture.test:8080/cnews/live.m3u8?token=a%2Fb%3D&quality=hd#video';

async function captureHandoffs(page: Page) {
  await page.addInitScript(() => {
    const handoffs: { href: string; trusted: boolean }[] = [];
    Object.assign(window, { __vlcHandoffs: handoffs });
    document.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link && /^(vlc|vlc-x-callback|intent):/.test(link.href)) {
        handoffs.push({ href: link.href, trusted: event.isTrusted });
        // Record the native navigation without opening an installed desktop app.
        event.preventDefault();
      }
    }, true);
  });
}

async function mockExternalChannel(page: Page, denied = false) {
  const destinations: string[] = [];
  const events: { event: string; playerEngine?: string }[] = [];
  let localLaunches = 0;
  await captureHandoffs(page);
  // Optional isolated Player bundle: receive the component without a Clerk
  // session, database writes, or changing the running development server.
  if (process.env.E2E_PLAYER_COMPONENT_BUNDLE) {
    const bundle = await readFile(process.env.E2E_PLAYER_COMPONENT_BUNDLE, 'utf8');
    await page.route('**/player/*', route => route.fulfill({ contentType: 'text/html',
      body: '<!doctype html><div id="root"></div><script src="/__player-component.js"></script>' }));
    await page.route('**/__player-component.js', route => route.fulfill({ contentType: 'application/javascript', body: bundle }));
  }
  await page.route('**/api/open-vlc', route => {
    localLaunches += 1;
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/playback-events', route => {
    events.push(route.request().postDataJSON());
    return route.fulfill({ json: { ok: true } });
  });
  await page.route('**/api/playback/resolutions', route => {
    const { channelId, destination } = route.request().postDataJSON();
    destinations.push(destination);
    if (denied) return route.fulfill({ status: 403, json: { error: 'Accès requis.', code: 'ACCESS_REQUIRED' } });
    if (destination === 'web') return route.fulfill({ status: 409, json: { error: 'VLC requis.', code: 'WEB_PLAYBACK_UNAVAILABLE' } });
    return route.fulfill({ json: resolved(channelId, STREAM, 'CNews') });
  });
  return { destinations, events, localLaunches: () => localLaunches };
}

async function handoffs(page: Page) {
  return page.evaluate(() => (window as unknown as {
    __vlcHandoffs: { href: string; trusted: boolean }[];
  }).__vlcHandoffs);
}

test.describe('VLC sur iPhone', () => {
  test.use({ userAgent: IPHONE, viewport: { width: 390, height: 844 }, hasTouch: true });

  test('le flux est préparé puis transmis par un vrai clic, y compris au retour de VLC', async ({ page }) => {
    const fixture = await mockExternalChannel(page);
    await page.goto('/player/test-cnews');
    const link = page.getByRole('link', { name: 'Ouvrir dans VLC', exact: true });
    await expect(link).toBeVisible();
    const href = await link.getAttribute('href');
    expect(new URL(href!).searchParams.get('url')).toBe(STREAM);
    expect(await handoffs(page)).toEqual([]);
    expect(fixture.events.filter(event => event.event === 'opened')).toEqual([]);
    expect(fixture.destinations).toEqual(['web', 'vlc-mobile']);
    expect(fixture.localLaunches()).toBe(0);

    await link.click();
    await expect(page.getByRole('heading', { name: 'Ouverture de VLC demandée' })).toBeVisible();
    expect(await handoffs(page)).toEqual([{ href, trusted: true }]);
    await page.getByRole('link', { name: 'Réessayer dans VLC', exact: true }).click();
    expect(await handoffs(page)).toEqual([{ href, trusted: true }, { href, trusted: true }]);
    expect(fixture.destinations).toEqual(['web', 'vlc-mobile']);
    await expect.poll(() => fixture.events.filter(event => event.event === 'opened').length).toBe(1);
  });

  test('un refus d’accès ne prépare ni n’ouvre VLC', async ({ page }) => {
    const fixture = await mockExternalChannel(page, true);
    await page.goto('/player/test-denied');
    await expect(page.getByText('Accès requis.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ouvrir dans VLC' })).toHaveCount(0);
    expect(await handoffs(page)).toEqual([]);
    expect(fixture.destinations).toEqual(['web']);
    expect(fixture.localLaunches()).toBe(0);
  });

  test('une résolution lente attend le lien avant tout lancement', async ({ page }) => {
    await mockExternalChannel(page);
    let release!: () => void;
    const ready = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/playback/resolutions', async route => {
      const { channelId, destination } = route.request().postDataJSON();
      if (destination !== 'vlc-mobile') return route.fallback();
      await ready;
      return route.fulfill({ json: resolved(channelId, STREAM, 'CNews') });
    });
    await page.goto('/player/test-slow');
    await expect(page.getByRole('heading', { name: 'Ouverture de VLC…' })).toBeVisible();
    expect(await handoffs(page)).toEqual([]);
    release();
    await page.getByRole('link', { name: 'Ouvrir dans VLC', exact: true }).click();
    expect(await handoffs(page)).toEqual([{
      href: `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(STREAM)}`, trusted: true,
    }]);
  });

  test('une réponse avec un protocole interdit ne produit pas de lien VLC', async ({ page }) => {
    await mockExternalChannel(page);
    await page.route('**/api/playback/resolutions', route => {
      const { channelId, destination } = route.request().postDataJSON();
      return destination === 'web' ? route.fallback()
        : route.fulfill({ json: resolved(channelId, 'file:///private/video.mp4') });
    });
    await page.goto('/player/test-invalid');
    await expect(page.getByRole('heading', { name: 'Lecture impossible' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ouvrir dans VLC' })).toHaveCount(0);
    expect(await handoffs(page)).toEqual([]);
  });
});

test('VLC sur ordinateur conserve un seul lancement automatique', async ({ page }) => {
  const fixture = await mockExternalChannel(page);
  await page.goto('/player/test-desktop');
  await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
  expect(fixture.localLaunches() + (await handoffs(page)).length).toBe(1);
  await expect(page.getByRole('link', { name: 'Ouvrir dans VLC' })).toHaveCount(0);
});

test.describe('VLC sur iPadOS en mode bureau', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', hasTouch: true });

  test('utilise le lien iOS plutôt que le protocole desktop', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 }));
    await mockExternalChannel(page);
    await page.goto('/player/test-ipad');
    await expect(page.getByRole('link', { name: 'Ouvrir dans VLC', exact: true })).toHaveAttribute('href', /^vlc-x-callback:\/\/x-callback-url\/stream\?url=/);
    expect(await handoffs(page)).toEqual([]);
  });
});

test.describe('VLC sur Android', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Samsung) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36', hasTouch: true });

  test('conserve le lancement automatique et le flux complet', async ({ page }) => {
    const fixture = await mockExternalChannel(page);
    await page.goto('/player/test-android');
    await expect(page.getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
    expect(await handoffs(page)).toEqual([{
      href: 'intent://media.fixture.test:8080/cnews/live.m3u8?token=a%2Fb%3D&quality=hd%23video#Intent;scheme=http;package=org.videolan.vlc;type=video/*;end',
      trusted: false,
    }]);
    expect(fixture.destinations).toEqual(['web', 'vlc-mobile']);
    expect(fixture.localLaunches()).toBe(0);
  });
});
