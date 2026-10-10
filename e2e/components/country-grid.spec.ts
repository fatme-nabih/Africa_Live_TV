import { test, expect } from '@playwright/test';

const cardNames = (page: import('@playwright/test').Page, section: string) =>
  page.getByRole('region', { name: section }).getByRole('button').evaluateAll(buttons => buttons.map(button => button.getAttribute('aria-label')));

test('les pays suivis passent en tête de la grille, dans l’ordre choisi', async ({ page }) => {
  await page.goto('/?kind=country-grid&followed=SN,CI');
  expect(await cardNames(page, 'Vos pays')).toEqual([
    'Sénégal, pays suivi : 6 dans le navigateur, 19 chaînes',
    'Côte d’Ivoire, pays suivi : 14 dans le navigateur, 25 chaînes',
  ]);
  const others = await cardNames(page, 'Autres pays');
  expect(others[0]).toBe('Nigéria : 25 dans le navigateur, 50 chaînes');
  expect(others.join('|')).not.toContain('Sénégal');
  await page.getByRole('button', { name: /^Sénégal/ }).click();
  await expect(page.getByTestId('grid-choice')).toHaveText('SN');
});

test('sans pays suivi, pas de bloc « Vos pays » ; libellés honnêtes, pluriel et nom court', async ({ page }) => {
  await page.goto('/?kind=country-grid');
  await expect(page.getByRole('heading', { name: 'Vos pays' })).toHaveCount(0);
  const somalia = page.getByRole('button', { name: /^Somalie/ });
  await expect(somalia).toHaveAttribute('aria-label', 'Somalie : chaînes avec VLC, 7 chaînes');
  await expect(somalia).toContainText('Avec VLC');
  await expect(page.getByRole('button', { name: /^Mali/ })).toContainText('1 chaîne');
  await expect(page.getByRole('button', { name: /^Mali/ })).not.toContainText('1 chaînes');
  await expect(page.getByRole('button', { name: /^République démocratique du Congo/ })).toContainText('RD Congo');
});

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  test(`capture de la grille ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?kind=country-grid&followed=SN,CI');
    await expect(page.getByRole('heading', { name: 'Vos pays' })).toBeVisible();
    await expect(page.locator('svg[data-flag]')).toHaveCount(6);
    // La grille ne déborde jamais horizontalement, même sur téléphone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`country-grid-${viewport.width}.png`), fullPage: true });
  });
}

test('chaque carte affiche le drapeau SVG du pays, décoratif, sans changer le nom annoncé', async ({ page }) => {
  await page.goto('/?kind=country-grid&followed=SN');
  const senegal = page.getByRole('button', { name: /^Sénégal/ });
  const flag = senegal.locator('svg[data-flag="SN"]');
  await expect(flag).toBeVisible();
  const box = (await flag.boundingBox())!;
  expect(Math.round(box.width)).toBe(24);
  expect(Math.round(box.height)).toBe(16);
  // Plus aucun code pays de repli une fois les drapeaux chargés, et le nom accessible reste le même.
  await expect(senegal).not.toContainText(/\bSN\b/);
  await expect(senegal).toHaveAttribute('aria-label', 'Sénégal, pays suivi : 6 dans le navigateur, 19 chaînes');
  expect(await page.locator('main button svg[data-flag]').count()).toBe(6);
});
