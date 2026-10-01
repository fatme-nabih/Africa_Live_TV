import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

test.use({ trace: 'off', screenshot: 'off' });

async function fixture(page: Page, options: { expired?: boolean; late?: boolean; denied?: boolean } = {}) {
  const resolutions: string[] = [], vlc: string[] = [], events: { channelId: string; event: string }[] = [];
  const channels = ['Alpha', 'Beta', 'Gamma', 'VLC', 'Indisponible'].map((name, i) => ({
    id: `l5-${i}`, name, countryCode: i === 2 ? 'CI' : 'SN', groupTitle: 'News', logoUrl: null,
    playbackMode: i === 3 ? 'EXTERNAL' : 'BROWSER', availabilityStatus: 'READY',
  }));
  await page.addInitScript(() => {
    localStorage.setItem('iptv_vlc_notice_dismissed', 'true');
    const removed: HTMLVideoElement[] = [];
    Object.assign(window, { l5Removed: removed });
    new MutationObserver(records => {
      for (const record of records) for (const node of record.removedNodes) {
        if (node instanceof HTMLVideoElement) removed.push(node);
        else if (node instanceof Element) removed.push(...node.querySelectorAll('video'));
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.route('**/api/filters', route => route.fulfill({ json: { countries: ['SN', 'CI'], groups: ['News'], languages: ['fr'], statuses: [] } }));
  await page.route('**/api/favorites', route => route.fulfill({ json: { favorites: [] } }));
  await page.route('**/api/channels', route => {
    const { country, search } = route.request().postDataJSON();
    return route.fulfill({ json: { channels: channels.filter(c => (!country || c.countryCode === country) && (!search || c.name.includes(search))), canPlay: !options.expired, hasMore: false, limit: 30, nextCursor: null } });
  });
  await page.context().route('**/api/playback-events', route => { events.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
  await page.context().route('**/api/open-vlc', route => { vlc.push(route.request().postDataJSON().channelId); return route.fulfill({ json: { ok: true } }); });
  await page.context().route('**/api/playback/resolutions', async route => {
    const { channelId } = route.request().postDataJSON(); resolutions.push(channelId);
    if (options.late && channelId === 'l5-0') await new Promise(resolve => setTimeout(resolve, 650));
    if (options.denied) return route.fulfill({ status: 403, json: { error: 'Accès actif requis.', code: 'ACCESS_REQUIRED' } });
    if (channelId === 'l5-3') return route.fulfill({ status: 409, json: { error: 'VLC requis.', code: 'WEB_PLAYBACK_UNAVAILABLE' } });
    if (channelId === 'l5-4') return route.fulfill({ status: 404, json: { error: 'Aucun flux disponible.', code: 'NO_ACTIVE_STREAM' } });
    return route.fulfill({ json: { playbackSessionId: randomUUID(), attemptId: randomUUID(), channel: { id: channelId, name: channels.find(c => c.id === channelId)!.name }, sourceUrl: `https://media.fixture.test/${channelId === 'l5-2' ? 'sample.mp4' : 'index.m3u8'}` } });
  });
  await page.context().route('https://media.fixture.test/**', async route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    await route.fulfill({ body: await readFile(path.join(process.cwd(), 'e2e/fixtures/hls', name)), contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : name.endsWith('.mp4') ? 'video/mp4' : 'video/mp2t', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/app');
  await expect(page.locator('#catalogue').getByRole('button', { name: 'Regarder Alpha', exact: true })).toBeVisible();
  return { resolutions, vlc, events };
}

async function activate(page: Page) {
  await page.getByLabel('VLC et mes autres lecteurs sont arrêtés').check();
  await page.getByRole('button', { name: 'Activer le lecteur ancré', exact: true }).click();
}

function anchor(page: Page) { return page.getByRole('region', { name: 'Lecteur ancré', exact: true }); }
async function select(page: Page, name: string) { await page.locator('#catalogue').getByRole('button', { name: `Regarder ${name}`, exact: true }).click(); }
async function assertReleased(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const videos = (window as unknown as { l5Removed: HTMLVideoElement[] }).l5Removed;
    return videos.length > 0 && videos.every(v => v.paused && !v.getAttribute('src') && !v.srcObject);
  })).toBe(true);
}

test('Activation opt-in, HLS sans autoplay, pause/reprise/volume et arrêt destructif', async ({ page }) => {
  const { vlc, events } = await fixture(page);
  await expect(anchor(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Activer le lecteur ancré' })).toBeDisabled();
  await activate(page); await select(page, 'Alpha');
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  expect(events.filter(e => e.event === 'started')).toHaveLength(0);
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await anchor(page).getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  const slider = anchor(page).getByRole('slider', { name: 'Volume', exact: true });
  await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).volume)).toBeCloseTo(0.05);
  await anchor(page).getByRole('button', { name: 'Lire', exact: true }).click();
  await expect(anchor(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await anchor(page).getByRole('button', { name: 'Arrêter la lecture', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0); await assertReleased(page);
  await expect.poll(() => events.some(e => e.event === 'stopped' && e.channelId === 'l5-0')).toBe(true);
  expect(vlc).toHaveLength(0);
});

test('Attente sans autoplay durable, volume conservé au zapping et refus de lecture sans VLC', async ({ page }) => {
  const { vlc } = await fixture(page); await activate(page); await select(page, 'Alpha');
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
  await page.waitForTimeout(13_000);
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
  const slider = anchor(page).getByRole('slider', { name: 'Volume', exact: true });
  await slider.focus(); await slider.press('Home'); await slider.press('ArrowRight');
  await select(page, 'Gamma');
  await expect(slider).toHaveValue('0.05');
  await page.evaluate(() => { HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Refus', 'NotAllowedError')); });
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  await expect(anchor(page).getByText('Touchez pour autoriser la lecture', { exact: true })).toBeVisible();
  expect(vlc).toHaveLength(0);
  await anchor(page).getByRole('button', { name: 'Arrêter la lecture', exact: true }).click(); await assertReleased(page);
});

test('Fenêtre web réellement décodée : message étranger refusé, arrêt et fenêtre nommée réutilisée', async ({ page, context }) => {
  await fixture(page); await select(page, 'Alpha');
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Ouvrir dans une fenêtre séparée', exact: true }).click();
  const popup = await popupPromise;
  await expect.poll(() => popup.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await popup.evaluate(() => window.dispatchEvent(new MessageEvent('message', { origin: 'https://foreign.fixture.test', source: window.opener, data: { type: 'africa-live-stop-player' } })));
  await expect(popup.locator('video')).toHaveCount(1);
  await select(page, 'Beta'); await expect(popup.locator('video')).toHaveCount(0);
  await expect(popup.getByRole('status')).toHaveText(/Lecture arrêtée depuis le catalogue/);
  await page.getByRole('button', { name: 'Ouvrir dans une fenêtre séparée', exact: true }).click();
  await expect(popup).toHaveURL(/\/player\/l5-1$/);
  expect(context.pages()).toHaveLength(2);
  await expect.poll(() => popup.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
});

test('Zapping rapide : réponse tardive ignorée, précédent détruit et dernier choix seul', async ({ page }) => {
  const { resolutions, vlc } = await fixture(page, { late: true });
  await activate(page); await select(page, 'Beta');
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  await select(page, 'Alpha'); await expect.poll(() => resolutions.includes('l5-0')).toBe(true);
  await select(page, 'Beta'); await select(page, 'Gamma');
  await expect(anchor(page).getByRole('heading', { name: 'Gamma', exact: true })).toBeVisible();
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('video')).toHaveCount(1); await assertReleased(page);
  expect(await page.locator('video').evaluate(v => (v as HTMLVideoElement).paused)).toBe(true);
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  await expect.poll(() => page.locator('video').evaluate(v => (v as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
  expect(vlc).toHaveLength(0);
  await anchor(page).getByRole('button', { name: 'Arrêter la lecture', exact: true }).click();
  await assertReleased(page);
});

test('Filtres, résultats vides et pagination de zapping ne remplacent pas le flux ; désactivation nettoie', async ({ page }) => {
  const { resolutions } = await fixture(page); await activate(page); await select(page, 'Alpha');
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  await expect(anchor(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const video = await page.locator('video').elementHandle();
  await page.getByLabel('Pays', { exact: true }).selectOption('CI');
  await expect(anchor(page).getByText(/hors des résultats actuels/)).toBeVisible();
  await expect(anchor(page).getByRole('button', { name: 'Chaîne suivante', exact: true })).toBeDisabled();
  expect(await video!.evaluate(v => v.isConnected && !(v as HTMLVideoElement).paused)).toBe(true);
  await page.getByLabel('Recherche', { exact: true }).fill('aucun');
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(0);
  expect(resolutions).toEqual(['l5-0']);
  await page.getByRole('button', { name: 'Désactiver le lecteur ancré', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0); await assertReleased(page);
});

test('VLC reste explicite : sortie du prototype vers la modale, aucune concurrence web', async ({ page }) => {
  const { vlc } = await fixture(page); await activate(page); await select(page, 'VLC');
  await expect(anchor(page).getByRole('heading', { name: 'Lecteur VLC requis' })).toBeVisible();
  expect(vlc).toHaveLength(0);
  await anchor(page).getByRole('button', { name: 'Lancer VLC', exact: true }).click();
  await expect(anchor(page)).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'VLC lancé' })).toBeVisible();
  expect(vlc).toEqual(['l5-3']);
  await expect(page.locator('video')).toHaveCount(1); await assertReleased(page);
  await page.getByRole('button', { name: 'Fermer le lecteur', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Activer le lecteur ancré' })).toBeDisabled();
});

test('Indisponibilité et refus serveur honnêtes ; aucun VLC automatique ni contournement du droit', async ({ page }) => {
  const { vlc } = await fixture(page); await activate(page); await select(page, 'Indisponible');
  await expect(anchor(page).getByText('Aucun flux disponible.', { exact: true })).toBeVisible();
  expect(vlc).toHaveLength(0);
  await select(page, 'Beta');
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant' })).toBeVisible();
  await page.route('**/api/playback/resolutions', route => route.fulfill({ status: 403, json: { error: 'Accès actif requis.', code: 'ACCESS_REQUIRED' } }));
  await select(page, 'Gamma'); await expect(anchor(page).getByText('Accès actif requis.', { exact: true })).toBeVisible();
  await assertReleased(page); expect(vlc).toHaveLength(0);
});

test('Expiration du catalogue : prototype interdit et aucune résolution', async ({ page }) => {
  const { resolutions } = await fixture(page, { expired: true });
  await page.getByLabel('VLC et mes autres lecteurs sont arrêtés').check();
  await expect(page.getByRole('button', { name: 'Activer le lecteur ancré' })).toBeDisabled();
  await select(page, 'Alpha'); await expect(anchor(page)).toHaveCount(0);
  await expect(page.locator('video')).toHaveCount(0); expect(resolutions).toHaveLength(0);
});

for (const width of [1366, 390, 320]) test(`Clavier, plein écran, démontage et catalogue accessible à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
  await fixture(page); await activate(page); await select(page, 'Alpha');
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(anchor(page).getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  const fullscreen = anchor(page).getByRole('button', { name: 'Plein écran', exact: true });
  await fullscreen.click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  // Same accessible button exits fullscreen, without depending on OS Escape in headless mode.
  await fullscreen.click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
  await anchor(page).getByRole('button', { name: 'Chaîne suivante', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(anchor(page).getByRole('heading', { name: 'Beta', exact: true })).toBeVisible();
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/l5-anchored-${width}.png`, fullPage: false });
  await page.getByRole('button', { name: 'Lecture directe', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(1); await assertReleased(page);
  await page.keyboard.press('Escape'); await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lecture directe', exact: true })).toBeFocused();
});

test('Fenêtre séparée conservée, fermée avant retour au lecteur ancré', async ({ page, context }) => {
  await fixture(page); await activate(page); await select(page, 'Alpha');
  await anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true }).click();
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Ouvrir dans une fenêtre pop-up séparée', exact: true }).click();
  const popup = await popupPromise;
  await expect(page.locator('video')).toHaveCount(0); await assertReleased(page);
  await expect(popup).toHaveURL(/\/player\/l5-0$/);
  await select(page, 'Beta'); await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(anchor(page).getByRole('button', { name: 'Lire maintenant', exact: true })).toBeVisible();
});

test('Plein écran refusé et requête pendante annulée au démontage de la page', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => { Element.prototype.requestFullscreen = () => Promise.reject(new DOMException('Refus', 'NotAllowedError')); });
  await activate(page); await select(page, 'Alpha');
  await anchor(page).getByRole('button', { name: 'Plein écran', exact: true }).click();
  await expect(anchor(page).getByRole('status')).toHaveText('Le plein écran a été refusé par le navigateur.');
  await page.route('**/api/playback/resolutions', () => {});
  const request = page.waitForRequest('**/api/playback/resolutions');
  await select(page, 'Beta'); const pending = await request;
  const failed = page.waitForEvent('requestfailed', { predicate: r => r === pending });
  await page.getByRole('link', { name: 'Compte', exact: true }).click();
  await failed; await expect(page.locator('video')).toHaveCount(0); await assertReleased(page);
});
