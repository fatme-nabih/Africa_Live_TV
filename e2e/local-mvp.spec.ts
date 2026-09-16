import { expect, test } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

loadEnvConfig(process.cwd());
test.use({ trace: 'off', screenshot: 'off' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
test.afterAll(async () => { await pool.end(); });

test('catalogue is accessible without an account and pagination stays consistent', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL(/\/app$/);
  await expect(page).toHaveTitle('Africa Live — Catalogue unifié');
  await expect(page.getByText('Version locale', { exact: true })).toBeVisible();
  await expect(page.getByText('30 chaînes chargées', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Charger plus de chaînes' }).click();
  await expect(page.getByText('60 chaînes chargées', { exact: true })).toBeVisible();
  const labels = await page.locator('#catalogue button[aria-label]').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
  expect(new Set(labels).size).toBe(labels.length);
  expect(errors).toEqual([]);
});

test('a channel with no successful verification stays searchable', async ({ page }) => {
  const { rows } = await pool.query(`SELECT c.name, c.id FROM channels c WHERE c.active AND NOT EXISTS (
    SELECT 1 FROM streams s WHERE s.channel_id = c.id AND s.last_success_at IS NOT NULL
  ) ORDER BY c.id LIMIT 1`);
  expect(rows).toHaveLength(1);
  await page.goto('/app');
  const response = page.waitForResponse(response => response.url().endsWith('/api/channels') && response.request().postDataJSON().search === rows[0].name);
  await page.getByRole('searchbox', { name: 'Recherche' }).fill(rows[0].name);
  const body = await (await response).json();
  expect(body.channels.some((channel: { id: string }) => channel.id === rows[0].id)).toBe(true);
  expect(body.channels.every((channel: Record<string, unknown>) => !('streams' in channel) && !('sourceUrl' in channel))).toBe(true);
  await expect(page.locator('#catalogue').getByText(rows[0].name, { exact: true })).toBeVisible();
});

test('country filters and favorites work without Clerk', async ({ page }) => {
  await page.goto('/app');
  const response = page.waitForResponse(response => response.url().endsWith('/api/channels') && response.request().postDataJSON().country === 'SN');
  await page.getByLabel('Pays', { exact: true }).selectOption('SN');
  const body = await (await response).json();
  expect(body.channels).toHaveLength(19);
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
