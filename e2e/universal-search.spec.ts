import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureCatalog, mockResolutions, mockVlc, serveVideo } from './helpers/tv-fixture';

// P5 / UX-502 — Recherche universelle Ctrl K : pays, villes météo, chaînes, dépêches, au clavier.
const palette = (page: Page) => page.getByRole('dialog', { name: 'Recherche universelle' });
const input = (page: Page) => page.getByRole('combobox', { name: /Rechercher un pays/ });

/** Le raccourci n'existe qu'après hydratation : on le rejoue jusqu'à l'ouverture. */
async function openPalette(page: Page) {
  await expect(async () => {
    await page.keyboard.press('Control+k');
    await expect(palette(page)).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await expect(input(page)).toBeFocused();
}

test.describe('Recherche universelle (UX-502)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await fixtureRadar(page, { weatherOk: true });
  });

  test('un pays au clavier ouvre son Radar ; Échap ferme et rend le focus', async ({ page }) => {
    await fixtureCatalog(page);
    await page.goto('/app/live');
    await openPalette(page);
    await input(page).fill('sene');
    const option = palette(page).getByRole('option', { name: /Sénégal/ }).first();
    await expect(option).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Enter');
    await expect(palette(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/app\/live\?country=SN/);

    await openPalette(page);
    await page.keyboard.press('Escape');
    await expect(palette(page)).toHaveCount(0);
  });

  test('villes météo, dépêches et accès à la recherche du catalogue', async ({ page }) => {
    await fixtureCatalog(page);
    await page.goto('/app/live');
    await openPalette(page);
    await input(page).fill('dakar');
    await expect(palette(page).getByRole('option', { name: /Météo à Dakar/ })).toBeVisible();

    await input(page).fill('économie');
    const article = palette(page).getByRole('option', { name: /Économie Côte d’Ivoire/ });
    await expect(article).toBeVisible();
    await expect(palette(page).getByRole('option', { name: /Chercher « économie » dans la TV/ })).toBeVisible();
    await palette(page).getByRole('option', { name: /Chercher « économie » dans la TV/ }).click();
    await expect(page).toHaveURL(/\/app\?search=%C3%A9conomie/);
  });

  test('une chaîne se lance dans le lecteur unique, sans rafale de requêtes', async ({ page }) => {
    await mockVlc(page);
    await serveVideo(page);
    await mockResolutions(page);
    const { requests } = await fixtureCatalog(page);
    await page.goto('/app/live');
    await openPalette(page);
    await input(page).pressSequentially('Alpha', { delay: 40 });
    const option = palette(page).getByRole('option', { name: /Alpha Sénégal/ });
    await expect(option).toBeVisible();
    // Une pause de frappe avant d'interroger le serveur : une seule recherche « Alpha » (quotas de /api/channels).
    expect(requests.filter(body => typeof body.search === 'string' && body.search.length > 0 && body.limit === 6).length).toBeLessThanOrEqual(2);
    await option.click();
    await expect(palette(page)).toHaveCount(0);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#inline-player-title')).toHaveText('Alpha Sénégal');
  });
});
