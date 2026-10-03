import { expect, test } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { countryPicker, expectCountry, selectCountry } from './helpers/country';

test('RW-007 : onglets et compteurs utilisent le périmètre rédactionnel avec le même filtre pays/24 h', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  const now = new Date().toISOString();
  const base = { id: 'rfi', domain: 'example.org', countryCode: 'SN', sourceType: 'rss', publishedAt: now };
  const articles = [
    { ...base, title: 'RFI Monde Sénégal', sourceName: 'RFI Monde', url: 'https://example.org/rfi', category: 'Monde', editorialScope: 'international' },
    { ...base, id: 'rfi-af', title: 'RFI Afrique Sénégal', sourceName: 'RFI Afrique', url: 'https://example.org/rfi-af', category: 'Afrique', editorialScope: 'international' },
    { ...base, id: 'mali', title: 'MaliJet Sénégal', sourceName: 'MaliJet', url: 'https://example.org/mali', category: 'International', editorialScope: 'africa' },
    { ...base, id: 'ci', title: 'France 24 Côte d’Ivoire', sourceName: 'France 24', countryCode: 'CI', url: 'https://example.org/f24', category: 'Politique', editorialScope: 'international' },
  ];
  await page.route('**/api/live/rss', route => route.fulfill({ json: { articles, undatedArticles: [{ ...articles[0], title: 'RFI sans date', url: 'https://example.org/unknown', publishedAt: null }], sources: [], updatedAt: now } }));
  await page.goto('/app/live?country=SN');
  await expect(page.getByRole('button', { name: 'Toutes (3)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Afrique & National (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'International (2)', exact: true }).click();
  await expect(page.getByText('RFI Monde Sénégal', { exact: true })).toBeVisible();
  await expect(page.getByText('RFI Afrique Sénégal', { exact: true })).toBeVisible();
  await expect(page.getByText('RFI sans date', { exact: true })).toBeVisible();
  await expect(page.getByText('MaliJet Sénégal', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Afrique & National (1)', exact: true }).click();
  await expect(page.getByText('MaliJet Sénégal', { exact: true })).toBeVisible();
  await selectCountry(page, 'CI');
  await expect(page.getByRole('button', { name: 'Toutes (1)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'International (1)', exact: true }).click();
  await expect(page.getByText('France 24 Côte d’Ivoire', { exact: true })).toBeVisible();
});

test('RW-008 : météo, villes rapides, URL/historique, RSS et lien TV partagent le pays', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  await page.goto('/app/live?country=SN&context=weather#feed');
  const weather = page.getByRole('combobox', { name: 'Choisir le pays ou la ville pour la météo', exact: true });
  await weather.focus(); await expect(weather).toBeFocused(); await weather.selectOption('CI');
  await expectCountry(page, 'CI'); await expect(page).toHaveURL(/country=CI/);
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voir les chaînes du pays', exact: true })).toHaveAttribute('href', '/app?country=CI');
  await selectCountry(page, 'GH'); await expect(weather).toHaveValue('GH');
  await expect(page.getByText('Aucune dépêche pour : Ghana', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Abidjan CI', exact: true }).click(); await expectCountry(page, 'CI');
  expect(new URL(page.url()).searchParams.get('context')).toBe('weather'); expect(new URL(page.url()).hash).toBe('#feed');
  await page.goBack(); await expectCountry(page, 'GH'); await expect(weather).toHaveValue('GH');
  await page.goForward(); await expectCountry(page, 'CI'); await page.reload(); await expect(weather).toHaveValue('CI');
  const options = await weather.locator('option').evaluateAll(nodes => nodes.map(n => ({ code: (n as HTMLOptionElement).value, label: n.textContent! })));
  expect(new Set(options.map(o => o.code)).size).toBe(options.length);
  expect(options.map(o => o.label)).toEqual([...options.map(o => o.label)].sort((a, b) => a.localeCompare(b, 'fr')));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Pays partagé : lien direct, clavier, retour/précédent, refresh, reset et code invalide', async ({ page }) => {
  await fixtureRadar(page, { weatherOk: true });
  await page.goto('/app/live?country=SN&context=test#feed');
  const country = countryPicker(page);
  await expectCountry(page, 'SN');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  await country.focus(); await expect(country).toBeFocused();
  await country.press('ArrowDown'); await country.press('Home'); await country.press('Enter');
  await expectCountry(page, null);
  await selectCountry(page, 'CI');
  await expect(page).toHaveURL(/country=CI/);
  expect(new URL(page.url()).searchParams.get('context')).toBe('test');
  expect(new URL(page.url()).hash).toBe('#feed');
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await page.reload(); await expectCountry(page, 'CI');
  await selectCountry(page, 'SN'); await page.goBack(); await expectCountry(page, 'CI');
  await page.goForward(); await expectCountry(page, 'SN');
  await page.getByRole('button', { name: 'Réinitialiser le pays', exact: true }).click();
  expect(new URL(page.url()).searchParams.has('country')).toBe(false);
  expect(new URL(page.url()).searchParams.get('context')).toBe('test');
  await page.goto('/app/live?country=ZZ');
  await expectCountry(page, null);
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
    if (width === 390) await page.screenshot({ path: '.local-logs/rw/screenshots/l2-dashboard-mobile.png', fullPage: false });
  }
  await selectCountry(page, 'GH');
  await expect(page.getByText('Aucune dépêche pour : Ghana', { exact: true })).toBeVisible();
  await expect(page.getByText('Comment lire le radar', { exact: true })).toBeVisible();
  await selectCountry(page, 'SN');
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
  await selectCountry(page, 'SN'); await selectCountry(page, 'CI');
  await page.getByRole('button', { name: /Chaînes TV/ }).click();
  await expect(page.getByText('Chaîne CI', { exact: true })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page.getByText('Chaîne SN', { exact: true })).toHaveCount(0);
  await expectCountry(page, 'CI');
  await expect(page).toHaveURL(/country=CI/);
  await expect(page.locator('article').filter({ has: page.locator('#weather-country-select') }).getByText('Abidjan', { exact: true }).last()).toBeVisible();
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
  await expectCountry(page, 'SN');
  const globe = page.getByRole('button', { name: /Globe 3D/ });
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'true');
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Recadrer la carte sur le continent africain' }).click();
  await expectCountry(page, null);
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.local-logs/rw/screenshots/l2-dashboard-desktop.png', fullPage: false });
});

test('Connexion lente : sélection du pays disponible avant la fin des dépêches', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  await page.route('**/api/live/rss', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.fallback();
  });
  await page.goto('/app/live');
  await selectCountry(page, 'CI');
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
  await expect(panel.getByText('à la demande', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Feux NASA|Séismes & GDACS/ })).toHaveCount(0);
  await fixtureRadar(page, { weatherOk: true });
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText(/Sources disponibles/);
  await page.route('**/api/live/rss', route => route.fulfill({ json: { articles: [], sources: [], updatedAt: new Date().toISOString(), availability: [{ provider: 'RSS', scope: 'Afrique', status: 'not_configured', fetchedAt: '', lastSuccessAt: null, dataAt: null, cacheExpiresAt: null, count: 0 }] } }));
  await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(panel.getByText('non configuré', { exact: true })).toBeVisible();
  await expect(panel.getByRole('status')).toHaveText(/Couverture partielle/);
  const text = await panel.getByRole('status').textContent();
  await page.waitForTimeout(1100); expect(await panel.getByRole('status').textContent()).toBe(text);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.local-logs/rw/screenshots/l2-dashboard-mobile-sources.png', fullPage: false });
});

test('RW-009 : carte médias 2D/globe sans contrôles ni requêtes FIRMS/USGS, bandeau préservé', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  const layers: string[] = [], errors: string[] = [];
  page.on('request', request => { if (/\/api\/live\/(firms|events)/.test(request.url())) layers.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/live');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: /Feux NASA|Séismes & GDACS/ })).toHaveCount(0);
  const marker = page.locator('.tactical-radar-marker').filter({ hasText: 'Sénégal' });
  await marker.focus(); await marker.press('Enter');
  await expectCountry(page, 'SN');
  const globe = page.getByRole('button', { name: /Globe 3D/ });
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'true');
  await globe.click(); await expect(globe).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  await page.getByText('Marchés et événements · bandeau daté', { exact: true }).click();
  await expect(page.getByRole('link', { name: 'Source : Économie africaine du bandeau' })).toHaveCount(1);
  expect(layers).toEqual([]); expect(errors).toEqual([]);
});

test('RW-009 : panne WebGL réelle du canvas laisse pays, météo et RSS utilisables', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function (this: HTMLCanvasElement, ...args: unknown[]) {
      if (typeof args[0] === 'string' && /webgl/i.test(args[0])) return null;
      return Reflect.apply(original, this, args);
    } });
  });
  await page.goto('/app/live');
  await expect(page.getByText('WebGL non supporté', { exact: true })).toBeVisible();
  await selectCountry(page, 'CI');
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Choisir le pays ou la ville pour la météo', exact: true })).toHaveValue('CI');
  await expect(page.getByRole('button', { name: /Feux NASA|Séismes & GDACS/ })).toHaveCount(0);
});
