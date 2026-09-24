import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
import { assertLocalE2ETarget } from '../src/lib/integration-test-safety';

loadEnvConfig(process.cwd());
test.use({ trace: 'off', screenshot: 'off' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
test.beforeAll(async ({ baseURL }) => { assertLocalE2ETarget(process.env, baseURL); });
test.afterAll(async () => { await pool.end(); });

test('catalogue is accessible without an account and pagination stays consistent', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page).toHaveTitle('Africa Live — Catalogue unifié');
  await expect(page.getByText('Version locale', { exact: true })).toBeVisible();
  const visibleCount = page.getByText(/\d+ chaînes visibles/, { exact: true }).first();
  await expect(visibleCount).toBeVisible();
  await expect.poll(async () => Number((await visibleCount.textContent())?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(0);
  const initialCount = Number((await visibleCount.textContent())?.match(/\d+/)?.[0] ?? 0);
  await expect(page.locator('#catalogue').getByText('Indisponible', { exact: true })).toHaveCount(0);
  await expect(page.locator('#catalogue').getByText('À vérifier', { exact: true })).toHaveCount(0);
  await expect(page.locator('#catalogue').getByText('VLC conseillé', { exact: true })).toHaveCount(0);
  await expect(page.locator('#catalogue').getByText('Lecture web', { exact: true })).toHaveCount(0);
  await expect(page.locator('#catalog-status')).toHaveCount(0);
  const firstWatchButton = page.locator('#catalogue').getByRole('button', { name: /^Regarder / }).first();
  await firstWatchButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le lecteur' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Charger plus de chaînes' }).click();
  await expect.poll(async () => Number((await visibleCount.textContent())?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(initialCount);
  const labels = await page.locator('#catalogue button[aria-label]').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  expect(new Set(labels).size).toBe(labels.length);
  expect(errors).toEqual([]);
});

test('channels marked unavailable stay hidden from the catalogue', async ({ page }) => {
  await page.goto('/app');
  const seedResponse = await page.request.post('/api/channels', {
    headers: { Origin: new URL(page.url()).origin },
    data: { search: '', country: '', group: '', language: '', status: '', favoritesOnly: false, cursor: null, limit: 30 },
  });
  expect(seedResponse.status()).toBe(200);
  const seedBody = await seedResponse.json();
  expect(seedBody.channels).toHaveLength(30);
  expect(seedBody.channels.every((channel: { availabilityStatus: string }) => channel.availabilityStatus !== 'OFFLINE')).toBe(true);
  expect(seedBody.channels.every((channel: Record<string, unknown>) => !('streams' in channel) && !('sourceUrl' in channel))).toBe(true);
  await expect(page.locator('#catalogue').getByText('Indisponible', { exact: true })).toHaveCount(0);
});

test('country filters and favorites work without Clerk', async ({ page }) => {
  await page.goto('/app');
  const response = page.waitForResponse(response => response.url().endsWith('/api/channels') && response.request().postDataJSON().country === 'SN');
  await page.getByLabel('Pays', { exact: true }).selectOption('SN');
  const body = await (await response).json();
  expect(body.channels.length).toBeGreaterThan(0);
  expect(body.channels.every((channel: { countryCode: string }) => channel.countryCode === 'SN')).toBe(true);
  const existingFavorites = await page.request.get('/api/favorites').then(response => response.json());
  const candidate = body.channels.find((channel: { id: string }) => !existingFavorites.favorites.includes(channel.id));
  expect(candidate).toBeDefined();
  const name = candidate.name;
  const add = page.getByRole('button', { name: `Ajouter ${name} aux favoris`, exact: true });
  await expect(add).toBeVisible();
  const saved = page.waitForResponse(response => response.url().endsWith('/api/favorites') && response.request().method() === 'PATCH');
  await add.click();
  expect((await saved).status()).toBe(200);
  const remove = page.getByRole('button', { name: `Retirer ${name} des favoris`, exact: true });
  try {
    await expect(remove).toBeVisible();
    await page.reload();
    await page.getByLabel('Pays', { exact: true }).selectOption('SN');
    await expect(remove).toBeVisible();
  } finally {
    const cleaned = await page.request.patch('/api/favorites', {
      headers: { Origin: new URL(page.url()).origin },
      data: { remove: [candidate.id] },
    });
    expect(cleaned.status()).toBe(200);
  }
});
