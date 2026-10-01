import { expect, test } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';

test('Pays partagé : lien direct, clavier, retour/précédent, refresh, reset et code invalide', async ({ page }) => {
  await fixtureRadar(page, { weatherOk: true });
  await page.goto('/app/live?country=SN&context=test#feed');
  const country = page.getByRole('combobox', { name: 'Choisir un pays' });
  await expect(country).toHaveValue('SN');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  await country.focus(); await expect(country).toBeFocused();
  await country.press('Home'); await country.press('Enter');
  await expect(country).toHaveValue('');
  await country.selectOption('CI');
  await expect(page).toHaveURL(/country=CI/);
  expect(new URL(page.url()).searchParams.get('context')).toBe('test');
  expect(new URL(page.url()).hash).toBe('#feed');
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await page.reload(); await expect(country).toHaveValue('CI');
  await country.selectOption('SN'); await page.goBack(); await expect(country).toHaveValue('CI');
  await page.goForward(); await expect(country).toHaveValue('SN');
  await page.getByRole('button', { name: 'Réinitialiser le pays', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  expect(new URL(page.url()).searchParams.get('context')).toBe('test');
  await page.goto('/app/live?country=ZZ');
  await expect(country).toHaveValue('');
  await expect(page.getByText('Pays inconnu dans le lien : vue Afrique affichée.')).toBeVisible();
});

for (const [width, height] of [[390, 844], [320, 844], [844, 390], [683, 384]]) test(`Fil prioritaire sans carte : ${width}×${height}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  await fixtureRadar(page, { weatherOk: true });
  const workers: string[] = [], layers: string[] = [], errors: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/api\/live\/(firms|events)/.test(request.url())) layers.push(request.url()); });
  await page.route('**/maplibre/*.mjs', route => route.abort());
  await page.goto('/app/live');
  const article = page.getByText('Dépêche Sénégal récente', { exact: true });
  await expect(article).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
  expect(workers).toEqual([]); expect(layers).toEqual([]);
  if (height === 844) {
    expect((await page.getByText('Économie Côte d’Ivoire', { exact: true }).boundingBox())!.y).toBeLessThan(height - 40);
    expect((await page.getByRole('combobox', { name: 'Choisir un pays' }).boundingBox())!.y).toBeLessThan(250);
    if (width === 390) await page.screenshot({ path: 'docs/screenshots/l2-dashboard-mobile.png', fullPage: false });
  }
  await page.getByRole('combobox', { name: 'Choisir un pays' }).selectOption('GH');
  await expect(page.getByText('Aucune dépêche pour : Ghana', { exact: true })).toBeVisible();
  await expect(page.getByText('Comment lire le radar', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Choisir un pays' }).selectOption('SN');
  await expect(article).toBeVisible();
  await page.getByRole('button', { name: 'Afficher la carte', exact: true }).click();
  await expect(page.getByText('Carte indisponible. Le fil et le choix du pays restent accessibles.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Masquer la carte', exact: true }).click();
  await expect(article).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Pays rapides SN→CI : réponses météo et TV obsolètes ignorées', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  await page.route('**/api/live/weather?code=SN', async route => {
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.fallback();
  });
  await page.route('**/api/live/channels?country=*', async route => {
    const code = new URL(route.request().url()).searchParams.get('country');
    if (code === 'SN') await new Promise(resolve => setTimeout(resolve, 800));
    await route.fulfill({ json: { channels: [{ id: code, name: `Chaîne ${code}`, countryCode: code, logoUrl: null, groupTitle: null, playbackMode: 'BROWSER', availabilityStatus: 'READY' }], total: 1, canPlay: true } });
  });
  await page.goto('/app/live');
  const country = page.getByRole('combobox', { name: 'Choisir un pays' });
  await country.selectOption('SN'); await country.selectOption('CI');
  await page.getByRole('button', { name: /Chaînes TV/ }).click();
  await expect(page.getByText('Chaîne CI', { exact: true })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.getByText('Chaîne SN', { exact: true })).toHaveCount(0);
  await expect(country).toHaveValue('CI');
  await expect(page).toHaveURL(/country=CI/);
  await expect(page.getByText('Abidjan', { exact: true }).first()).toBeVisible();
});

test('Carte et contrôle partagent le pays ; médias restent accessibles en 2D et 3D', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/live');
  const marker = page.locator('.tactical-radar-marker').filter({ hasText: 'Sénégal' });
  await expect(marker).toBeVisible();
  expect((await marker.boundingBox())!.y).toBeLessThan(768);
  expect((await page.getByText('Fil des dépêches', { exact: true }).boundingBox())!.y).toBeLessThan(768);
  await marker.focus(); await marker.press('Enter');
  await expect(page).toHaveURL(/country=SN/);
  await expect(page.getByRole('combobox', { name: 'Choisir un pays' })).toHaveValue('SN');
  const globe = page.getByRole('button', { name: /Globe 3D/ });
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'true');
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Recadrer la carte sur le continent africain' }).click();
  await expect(page.getByRole('combobox', { name: 'Choisir un pays' })).toHaveValue('');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/screenshots/l2-dashboard-desktop.png', fullPage: false });
});

test('Connexion lente : sélection du pays disponible avant la fin des dépêches', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  await page.route('**/api/live/news', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.fulfill({ json: { articles: [], countries: [], updatedAt: new Date().toISOString() } });
  });
  await page.goto('/app/live');
  await page.getByRole('combobox', { name: 'Choisir un pays' }).selectOption('CI');
  await expect(page).toHaveURL(/country=CI/);
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
});

test('Fraîcheur expirée : table et couverture deviennent périmées selon leur cadence', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00Z') });
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true, asOf: '2026-09-30T12:00:00Z' });
  await page.goto('/app/live');
  const panel = page.getByRole('region', { name: 'Disponibilité des sources' });
  await expect(panel.getByRole('status')).toHaveText(/Sources disponibles/);
  await panel.getByText('Disponibilité et fraîcheur par source', { exact: true }).click();
  await page.clock.fastForward(6 * 60_000);
  await expect(panel.getByRole('status')).toHaveText(/Couverture partielle/);
  await expect(panel.getByText('cache périmé', { exact: true }).first()).toBeVisible();
  await expect(panel.getByRole('row').filter({ hasText: 'Catalogue TV' }).getByText('disponible', { exact: true })).toBeVisible();
});

test('Sources : panne totale, état non configuré/périmé, reprise et annonces stables', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { allFail: true });
  await page.goto('/app/live');
  const panel = page.getByRole('region', { name: 'Disponibilité des sources' });
  await expect(panel.getByRole('status')).toHaveText('Sources indisponibles');
  await panel.getByText('Disponibilité et fraîcheur par source', { exact: true }).click();
  await expect(panel.getByRole('table')).toBeVisible();
  await expect(panel.getByText('à la demande', { exact: true })).toHaveCount(2);
  await fixtureRadar(page, { weatherOk: true });
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText(/Sources disponibles/);
  await page.route('**/api/live/news', route => route.fulfill({ json: { articles: [], countries: [], updatedAt: new Date().toISOString(), availability: [{ provider: 'GDELT', scope: 'Afrique', status: 'not_configured', fetchedAt: '', lastSuccessAt: null, dataAt: null, cacheExpiresAt: null, count: 0 }] } }));
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(panel.getByText('non configuré', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toHaveText(/Couverture partielle/);
  const text = await panel.getByRole('status').textContent();
  await page.waitForTimeout(1100); expect(await panel.getByRole('status').textContent()).toBe(text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/l2-dashboard-mobile-sources.png', fullPage: false });
});

test('Couches opt-in : invalides exclus, panne isolée, retry, cache, activation concurrente et retour médias', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  let firmsRequests = 0, eventsRequests = 0, fail = true;
  const now = new Date().toISOString();
  const metadata = { updatedAt: now, stale: false, availability: [{ provider: 'NASA FIRMS', scope: 'Afrique', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(), count: 1 }] };
  await page.route('**/api/live/firms*', async route => {
    firmsRequests++;
    await new Promise(resolve => setTimeout(resolve, 150));
    await route.fulfill({ status: fail ? 503 : 200, json: { type: 'FeatureCollection', metadata, features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [17.5, 3.5] }, properties: { id: 1, frp: 10, brightness: 320, confidence: 80, date: '2026-09-30', time: '12:00 UTC', dayNight: 'D' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 120] }, properties: { id: 2, frp: 10, brightness: 320, confidence: 80 } },
    ] } });
  });
  await page.route('**/api/live/events*', async route => {
    eventsRequests++;
    await route.fulfill({ json: { type: 'FeatureCollection', metadata: { ...metadata, availability: [{ ...metadata.availability[0], provider: 'USGS', status: 'empty', count: 0 }, { ...metadata.availability[0], provider: 'GDACS', status: 'unavailable', count: 0 }] }, features: [] } });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/live');
  const fires = page.getByRole('button', { name: /Feux NASA/ }), events = page.getByRole('button', { name: /Séismes & GDACS/ });
  await expect(fires).toHaveAttribute('aria-pressed', 'false'); await expect(events).toHaveAttribute('aria-pressed', 'false');
  expect(firmsRequests).toBe(0); expect(eventsRequests).toBe(0);
  await fires.click(); await events.click();
  await expect(page.getByRole('button', { name: 'Réessayer les feux', exact: true })).toBeVisible();
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  fail = false; await page.getByRole('button', { name: 'Réessayer les feux', exact: true }).click();
  await expect(page.getByText('1 géométries ou mesures invalides exclues.')).toBeVisible();
  await expect(fires).toContainText('1');
  await fires.click(); await fires.click();
  expect(firmsRequests).toBe(2);
  const canvas = page.locator('.maplibregl-canvas');
  await expect(async () => {
    const bounds = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
    await expect(page.locator('.tactical-fire-popup')).toBeVisible();
  }).toPass({ timeout: 5000 });
  await expect(page.locator('.tactical-fire-popup')).toContainText('Observation 30/09');
  await events.click(); await events.click(); expect(eventsRequests).toBe(1);
  await fires.click(); await events.click();
  await expect(fires).toHaveAttribute('aria-pressed', 'false'); await expect(events).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.tactical-radar-marker').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('Couche désactivée pendant le chargement : réponse tardive ignorée et activation suivante réussie', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  let calls = 0;
  await page.route('**/api/live/firms*', async route => {
    calls++;
    const call = calls;
    if (call === 1) await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { type: 'FeatureCollection', features: [], metadata: { updatedAt: new Date().toISOString(), stale: false } } });
  });
  await page.goto('/app/live');
  const fires = page.getByRole('button', { name: /Feux NASA/ });
  await fires.click(); await expect.poll(() => calls).toBe(1); await fires.click();
  await expect(fires).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(800);
  await fires.click(); await expect.poll(() => calls).toBe(2);
  await expect(fires).toContainText('0');
  await expect(fires).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
});
