import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureCatalog } from './helpers/tv-fixture';

// P5 / UX-503 — Pays suivis (1 à 5, sur l'appareil) : le Radar et la TV s'ouvrent sur le pays principal.
const followButton = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^(Suivre|Ne plus suivre) ${name}$`) });

test.describe('Pays suivis (UX-503)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureRadar(page, { weatherOk: true });
    await fixtureCatalog(page);
  });

  test('suivre un pays en fait le pays principal du Radar et de la TV', async ({ page }) => {
    await page.goto('/app/live?country=CI');
    const button = followButton(page, 'Côte d’Ivoire');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    // Attendre l'hydratation (le bouton est rendu par le client) avant de cliquer.
    await expect(async () => {
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true', { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    await expect(button).toHaveText('Pays principal');
    expect(await page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('["CI"]');

    await page.goto('/app/live');
    await expect(page).toHaveURL(/\/app\/live\?country=CI$/);

    await page.goto('/app');
    await expect(page.getByRole('region', { name: 'Côte d’Ivoire en direct', exact: true })).toBeVisible();

    await page.goto('/app/live?country=CI');
    await expect(async () => {
      await followButton(page, 'Côte d’Ivoire').click();
      await expect(followButton(page, 'Côte d’Ivoire')).toHaveAttribute('aria-pressed', 'false', { timeout: 500 });
    }).toPass({ timeout: 15_000 });
    expect(await page.evaluate(() => localStorage.getItem('al_followed_countries'))).toBe('[]');
  });

  test('au-delà de 5 pays, le bouton est désactivé et explique pourquoi', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('al_followed_countries', JSON.stringify(['SN', 'CI', 'ML', 'GN', 'NG'])));
    await page.goto('/app/live?country=KE');
    const button = followButton(page, 'Kenya');
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('title', /5 pays/);
    await expect(followButton(page, 'Kenya')).toHaveAttribute('aria-pressed', 'false');
  });
});
