import { expect, test, type Page } from '@playwright/test';
import { countryPicker, expectCountry, selectCountry } from './helpers/country';
import { fixtureRadar } from './helpers/radar-fixture';

// Attend que la TV soit hydratée et chargée (au moins une chaîne visible) avant d'interagir.
async function waitForCatalog(page: Page) {
  const visible = page.getByText(/\d+ chaînes visibles/).first();
  await expect.poll(async () => Number((await visible.textContent())?.match(/\d+/)?.[0] ?? 0)).toBeGreaterThan(0);
}

// P1 — coquille unique : barre haute, barre basse mobile, sélecteur de pays, heure locale, transitions.

test.describe('Coquille unique', () => {
  test('une seule barre haute sur le Radar et la TV, sans bouton Briefing désactivé', async ({ page }) => {
    await fixtureRadar(page, { weatherOk: true });
    for (const path of ['/app/live', '/app']) {
      await page.goto(path);
      await expect(page.getByRole('banner')).toHaveCount(1);
      const nav = page.getByRole('navigation', { name: 'Navigation principale' });
      await expect(nav.getByRole('link', { name: 'Radar', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'TV', exact: true })).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Compte', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /Briefing/ })).toHaveCount(0);
      await expect(countryPicker(page)).toBeVisible();
    }
  });

  test('le pays choisi suit l’utilisateur du Radar à la TV et retour, via l’URL', async ({ page }) => {
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live');
    await selectCountry(page, 'SN');
    await expect(page).toHaveURL(/\/app\/live\?country=SN/);
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await nav.getByRole('link', { name: 'TV', exact: true }).click();
    await expect(page).toHaveURL(/\/app\?country=SN/);
    await expectCountry(page, 'SN');
    await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('SN');
    await nav.getByRole('link', { name: 'Radar', exact: true }).click();
    await expect(page).toHaveURL(/\/app\/live\?country=SN/);
    await expectCountry(page, 'SN');
    await expect(page.getByText('Dépêche Sénégal récente', { exact: true })).toBeVisible();
    // Retour arrière : le sélecteur suit l'historique.
    await page.goBack();
    await expect(page).toHaveURL(/\/app\?country=SN/);
    await expectCountry(page, 'SN');
  });

  test('sur la TV, le sélecteur de la barre pilote le filtre pays du catalogue', async ({ page }) => {
    await page.goto('/app');
    await selectCountry(page, 'CI');
    await expect(page).toHaveURL(/country=CI/);
    await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('CI');
    await page.getByRole('button', { name: 'Réinitialiser le pays', exact: true }).click();
    expect(new URL(page.url()).searchParams.has('country')).toBe(false);
    await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('');
  });
});

test.describe('Sélecteur de pays', () => {
  test('recherche sans accents, pays récents, clavier complet et réinitialisation', async ({ page }) => {
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live');
    const picker = countryPicker(page);

    // Saisie sans accents ni apostrophe : « cote d ivoire » trouve « Côte d’Ivoire ».
    await picker.click();
    await expect(picker).toHaveAttribute('aria-expanded', 'true');
    await picker.fill('cote d ivoire');
    await expect(page.getByRole('listbox', { name: 'Choisir un pays' }).getByRole('option')).toHaveCount(1);
    await page.getByRole('option', { name: 'Côte d’Ivoire', exact: true }).click();
    await expect(page).toHaveURL(/country=CI/);
    await expect(picker).toHaveAttribute('aria-expanded', 'false');

    // Le pays choisi devient « récent » à la visite suivante.
    await page.reload();
    await picker.click();
    await expect(page.getByText('Récents', { exact: true })).toBeVisible();
    await expect(page.getByRole('listbox', { name: 'Choisir un pays' }).getByRole('option', { name: 'Côte d’Ivoire', exact: true })).toHaveCount(2);
    await page.keyboard.press('Escape');

    // Clavier : saisie + Entrée choisit la meilleure correspondance.
    await picker.fill('ghana');
    await picker.press('Enter');
    await expect(page).toHaveURL(/country=GH/);
    await expectCountry(page, 'GH');

    // Échap referme et annule la saisie en cours.
    await picker.click();
    await picker.fill('xyz');
    await expect(page.getByText('Aucun pays ne correspond', { exact: false })).toBeVisible();
    await picker.press('Escape');
    await expect(picker).toHaveAttribute('aria-expanded', 'false');
    await expectCountry(page, 'GH');

    // Flèches, activedescendant et Tab.
    await picker.press('ArrowDown');
    await expect(picker).toHaveAttribute('aria-expanded', 'true');
    const active = await picker.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    await expect(page.locator(`[id="${active}"]`)).toHaveAttribute('role', 'option');
    await picker.press('Tab');
    await expect(picker).toHaveAttribute('aria-expanded', 'false');

    // Réinitialisation.
    await page.getByRole('button', { name: 'Réinitialiser le pays', exact: true }).click();
    expect(new URL(page.url()).searchParams.has('country')).toBe(false);
    await expectCountry(page, null);
  });
});

for (const width of [360, 320]) {
  test(`barre basse mobile à ${width}px : quatre entrées, cibles ≥ 44 px, aucun débordement`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toHaveCount(1);
    const entries = [
      nav.getByRole('link', { name: 'Radar', exact: true }),
      nav.getByRole('link', { name: 'TV', exact: true }),
      nav.getByRole('button', { name: 'Recherche', exact: true }),
      nav.getByRole('link', { name: 'Compte', exact: true }),
    ];
    for (const entry of entries) {
      await expect(entry).toBeVisible();
      const box = (await entry.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    await expect(nav.getByRole('link', { name: 'Radar', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // La barre haute reste d'une seule ligne et le sélecteur de pays y est utilisable.
    const header = (await page.getByRole('banner').boundingBox())!;
    expect(header.height).toBeLessThan(70);
    await expect(countryPicker(page)).toBeVisible();
  });
}

test('Recherche (mobile) conduit à la TV, ouvre la recherche et retire le paramètre de l’URL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixtureRadar(page, { weatherOk: true });
  await page.goto('/app/live?country=SN');
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Recherche', exact: true }).click();
  await expect(page).toHaveURL(/\/app\?country=SN$/);
  await expect(page.getByRole('searchbox', { name: 'Recherche' })).toBeFocused();
  expect(new URL(page.url()).searchParams.has('focus')).toBe(false);
});

test('Rechercher (bureau) active la recherche de la TV sans recharger la page', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/app');
  await waitForCatalog(page);
  await page.getByRole('button', { name: 'Rechercher une chaîne', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Recherche' })).toBeFocused();
});

test.describe('Heure locale', () => {
  test.describe('appareil à Paris', () => {
    test.use({ timezoneId: 'Europe/Paris' });
    test('affiche l’heure locale ; Dakar reste dans l’info-bulle', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.clock.install({ time: new Date('2026-10-02T20:37:00Z') });
      await fixtureRadar(page, { weatherOk: true });
      await page.goto('/app/live');
      const clock = page.locator('[title="Dakar : 20:37 (GMT)"]');
      await expect(clock).toHaveCount(1);
      await expect(clock.getByText('22:37', { exact: true })).toBeVisible();
    });
  });
  test.describe('appareil à Dakar', () => {
    test.use({ timezoneId: 'Africa/Dakar' });
    test('à Dakar, l’info-bulle l’indique', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.clock.install({ time: new Date('2026-10-02T20:37:00Z') });
      await fixtureRadar(page, { weatherOk: true });
      await page.goto('/app/live');
      const clock = page.locator('[title="Heure de Dakar"]');
      await expect(clock).toHaveCount(1);
      await expect(clock.getByText('20:37', { exact: true })).toBeVisible();
    });
  });
});

test.describe('Transitions de page', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('la navigation fonctionne et la feuille de style neutralise les transitions en mouvement réduit', async ({ page }) => {
    await fixtureRadar(page, { weatherOk: true });
    await page.goto('/app/live');
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'TV', exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Catalogue Africa Live' })).toBeAttached();
    const rules = await page.evaluate(() => {
      const texts: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try { for (const rule of Array.from(sheet.cssRules)) texts.push(rule.cssText); } catch { /* feuille externe */ }
      }
      return {
        reduced: texts.some(text => /prefers-reduced-motion/.test(text) && /view-transition/.test(text)),
        anchored: texts.some(text => /view-transition-group\(app-header\)/.test(text)),
        passThrough: texts.some(text => /::view-transition\s*\{[^}]*pointer-events:\s*none/.test(text)),
      };
    });
    expect(rules).toEqual({ reduced: true, anchored: true, passThrough: true });
  });
});
