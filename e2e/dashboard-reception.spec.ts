import { expect, test } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { assertLocalE2ETarget } from '../src/lib/integration-test-safety';

test.beforeAll(({ baseURL }) => { assertLocalE2ETarget(process.env, baseURL); });

for (const width of [1366, 390, 683]) test(`L4 réception datée, clavier et reflow à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : width === 683 ? 384 : 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-01T17:00:00Z') });
  await fixtureRadar(page, { weatherOk: true, asOf: '2026-10-01T17:00:00Z' });
  const briefingRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/live/briefing')) briefingRequests.push(request.url()); });
  await page.goto('/app/live?country=SN');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  const country = page.getByRole('combobox', { name: /Choisir un pays/ });
  await country.focus();
  await expect(country).toBeFocused();
  await country.selectOption('CI');
  await expect(page).toHaveURL(/country=CI/);
  await expect(page.getByText('Économie Côte d’Ivoire', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Briefing/ })).toBeDisabled();
  expect(briefingRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `docs/screenshots/l4-dashboard-${width}.png` });
});

test('L4 fond cartographique bloqué : choix pays et fil préservés', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await fixtureRadar(page, { weatherOk: true });
  await page.route('**/ArcGIS/rest/services/**/MapServer/tile/**', route => route.abort());
  await page.goto('/app/live');
  await expect(page.getByText('Carte indisponible. Le fil et le choix du pays restent accessibles.', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('combobox', { name: /Choisir un pays/ }).selectOption('SN');
  await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/country=SN/);
});

for (const width of [1366, 390]) test(`L4 observation réelle locale à ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 1366 ? 768 : 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/app/live?country=SN');
  await expect(page.getByRole('heading', { name: /Radar Afrique/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Disponibilité des sources' }).getByRole('status')).toContainText(/Sources|Couverture/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `docs/screenshots/l4-dashboard-real-${width}.png` });
});
