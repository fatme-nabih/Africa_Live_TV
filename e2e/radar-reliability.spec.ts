import { expect, test } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';

const servedBuild = process.env.RADAR_BUILD_TEST === 'true';

for (const width of [1366, 390, 320]) test(`Radar : dates, identités, filtre et carte à ${width}px`, async ({ page }) => {
  test.skip(servedBuild);
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fixtureRadar(page);
  const errors: string[] = [], workers: string[] = [], briefing: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (/same key|unique.*key|worker.*error/i.test(message.text())) errors.push(message.text()); });
  page.on('worker', worker => workers.push(worker.url()));
  page.on('request', request => { if (request.url().includes('/api/live/briefing')) briefing.push(request.url()); });
  await page.goto('/app/live');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Dépêche sans date', { exact: true })).toBeVisible();
  await expect(page.getByText('Ancienne dépêche exclue', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Future dépêche exclue', { exact: true })).toHaveCount(0);
  if (width < 1280) await page.getByRole('button', { name: 'Afficher la carte', exact: true }).click();
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  await expect(page.locator('.tactical-radar-marker').first()).toBeVisible();
  await expect.poll(() => workers.some(url => url.endsWith('/maplibre-gl-worker.mjs'))).toBe(true);
  await page.getByText('Marchés et événements · bandeau daté', { exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Périmètre du bandeau' })).toHaveValue('Africa');
  await expect(page.getByText('Événement mondial', { exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Périmètre du bandeau' }).selectOption('World');
  await expect(page.getByRole('link', { name: 'Source : Événement mondial' })).toHaveCount(1);
  await expect(page.locator('[aria-hidden="true"][inert]')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Choisir un pays' }).selectOption('SN');
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Briefing — bientôt' })).toBeDisabled();
  expect(briefing).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Worker bloqué et RSS en panne : pays et fil restent utilisables après navigation répétée', async ({ page }) => {
  test.skip(servedBuild);
  await fixtureRadar(page, { rssFails: true });
  await page.route('**/maplibre/*.mjs', route => route.abort());
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (let visit = 0; visit < 2; visit++) {
    await page.goto('/app/live');
    await expect(page.getByText('Carte indisponible. Le fil et le choix du pays restent accessibles.', { exact: true })).toBeVisible();
    await expect(page.getByText('RSS indisponible(s). Les autres sources restent consultables.').first()).toBeVisible();
    await page.getByRole('combobox', { name: 'Choisir un pays' }).selectOption('SN');
    await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('Build servi : module worker réel, dépendance et protection dashboard', async ({ page, request }) => {
  test.skip(!servedBuild);
  const worker = await request.get('/maplibre/maplibre-gl-worker.mjs');
  expect(worker.status()).toBe(200);
  expect(worker.headers()['content-type']).toContain('javascript');
  const shared = await request.get('/maplibre/maplibre-gl-shared.mjs');
  expect(shared.status()).toBe(200);
  await page.goto('/');
  const result = await page.evaluate(() => new Promise<string>(resolve => {
    const worker = new Worker('/maplibre/worker-check.mjs', { type: 'module' });
    const timer = setTimeout(() => { worker.terminate(); resolve('timeout'); }, 5000);
    worker.onmessage = event => { clearTimeout(timer); worker.terminate(); resolve(event.data); };
    worker.onerror = () => { clearTimeout(timer); worker.terminate(); resolve('error'); };
  }));
  expect(result).toBe('ready');
  await page.goto('/app/live');
  await expect(page).toHaveURL(/sign-in/);
});

test('Options de catalogue dupliquées : une option par valeur, aucun avertissement React', async ({ page }) => {
  test.skip(servedBuild);
  const errors: string[] = [];
  page.on('console', message => { if (/same key|unique.*key/i.test(message.text())) errors.push(message.text()); });
  await page.route('**/api/filters', route => route.fulfill({ json: { countries: ['SN', 'SN', ' CI ', 'CI'], groups: ['Informations', 'Informations'], languages: ['fr', 'fr'], statuses: ['BROWSER_OK'] } }));
  await page.goto('/app');
  await expect(page.getByLabel('Pays', { exact: true }).locator('option[value="SN"]')).toHaveCount(1);
  await expect(page.getByLabel('Pays', { exact: true }).locator('option[value="CI"]')).toHaveCount(1);
  await expect(page.locator('option[value="News"]')).toHaveCount(1);
  await expect(page.locator('option[value="fr"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('Résumé TV réel : références et candidates cohérentes sur africa_live_dev', async ({ request }) => {
  test.skip(servedBuild);
  const response = await request.get('/api/live/channels?summary=true');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toBe('private, no-store');
  const summary = await response.json();
  expect(summary.totalChannels).toBeGreaterThan(0);
  let references = 0, web = 0, vlc = 0;
  for (const country of Object.values(summary.countries) as Array<{ channelCount: number; directWebCount: number; directVlcCount: number }>) {
    expect(country.directWebCount).toBeLessThanOrEqual(country.directVlcCount);
    expect(country.directVlcCount).toBeLessThanOrEqual(country.channelCount);
    references += country.channelCount; web += country.directWebCount; vlc += country.directVlcCount;
  }
  expect([references, web, vlc]).toEqual([summary.totalChannels, summary.totalDirectWeb, summary.totalDirectVlc]);
  expect(Number.isFinite(Date.parse(summary.updatedAt))).toBe(true);
});
