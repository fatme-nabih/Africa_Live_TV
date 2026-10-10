import { test, expect, type Page } from '@playwright/test';

const state = async (page: Page) => JSON.parse((await page.getByTestId('share-state').textContent())!);
const openMenu = async (page: Page) => {
  await page.getByRole('button', { name: 'Partager « Dépêche test »' }).click();
  return page.getByRole('menu', { name: 'Partager « Dépêche test »' });
};

test('le menu propose WhatsApp et Facebook, reste entier dans l’écran malgré une carte rognée', async ({ page }) => {
  await page.addInitScript(() => { delete (Navigator.prototype as { share?: unknown }).share; });
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/?kind=share');
  const menu = await openMenu(page);
  await expect(menu.getByRole('menuitem', { name: 'WhatsApp' })).toBeFocused();
  expect(decodeURIComponent((await menu.getByRole('menuitem', { name: 'WhatsApp' }).getAttribute('href'))!.split('?text=')[1]))
    .toBe(`Dépêche test (APS)\nhttps://aps.sn/article?id=7\nVia Africa Live : ${new URL(page.url()).origin}`);
  await expect(menu.getByRole('menuitem', { name: 'Facebook' }))
    .toHaveAttribute('href', 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Faps.sn%2Farticle%3Fid%3D7');
  // Sans partage natif (navigateur qui ne le propose pas), pas d'option « Plus d'options ».
  await expect(menu.getByRole('menuitem', { name: /Plus d’options/ })).toHaveCount(0);
  const box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(375);
  expect(box.y + box.height).toBeLessThanOrEqual(700);
  await page.screenshot({ path: test.info().outputPath('share-menu-375.png') });
  // Le menu est vraiment au premier plan : le point central du dernier choix n'est pas recouvert.
  const copy = menu.getByRole('menuitem', { name: 'Copier le lien' });
  await copy.hover();
  await copy.click({ trial: true });
  expect((await state(page)).cardClicks).toBe(0);
});

test('clavier : flèches circulaires, Échap ferme seulement le menu et rend le focus', async ({ page }) => {
  await page.goto('/?kind=share');
  const menu = await openMenu(page);
  await page.keyboard.press('ArrowUp');
  await expect(menu.getByRole('menuitem', { name: 'Copier le lien' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'WhatsApp' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Facebook' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Partager « Dépêche test »' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Partager « Dépêche test »' })).toBeFocused();
  expect(await state(page)).toEqual({ cardClicks: 0, escapes: 0 });
});

test('clic ailleurs ferme le menu ; copier le lien met l’adresse de l’article dans le presse-papiers', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?kind=share');
  let menu = await openMenu(page);
  await page.mouse.click(20, 20);
  await expect(menu).toHaveCount(0);
  menu = await openMenu(page);
  await menu.getByRole('menuitem', { name: 'Copier le lien' }).click();
  await expect(menu.getByRole('menuitem', { name: 'Lien copié' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Lien copié' })).toHaveCount(1);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://aps.sn/article?id=7');
  await expect(menu).toHaveCount(0);
  expect((await state(page)).cardClicks).toBe(0);
});

test('avec le partage du téléphone : « Plus d’options » ouvre le menu natif avec titre et message', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { (window as unknown as { shared: ShareData }).shared = data; } });
  });
  await page.goto('/?kind=share');
  const menu = await openMenu(page);
  await expect(menu.getByRole('menuitem')).toHaveText(['WhatsApp', /Facebook$/, /Plus d’options…\s*Instagram, TikTok, Telegram…/, 'Copier le lien']);
  await menu.getByRole('menuitem', { name: /Plus d’options/ }).click();
  await expect(menu).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { shared: ShareData }).shared)).toEqual({
    title: 'Dépêche test',
    text: `Dépêche test (APS)\nhttps://aps.sn/article?id=7\nVia Africa Live : ${new URL(page.url()).origin}`,
  });
});

test('depuis une rangée qui défile, le menu reste ouvert et la rangée ne bouge pas', async ({ page }) => {
  await page.goto('/?kind=share');
  const row = page.getByTestId('share-row');
  // Le menu ouvert, le focus sur ses choix ne doit plus faire défiler la rangée (ce qui le refermait).
  await page.getByRole('button', { name: 'Partager « Dépêche rangée »' }).click();
  const menu = page.getByRole('menu', { name: 'Partager « Dépêche rangée »' });
  await expect(menu.getByRole('menuitem', { name: 'WhatsApp' })).toBeFocused();
  const opened = await row.evaluate(element => element.scrollLeft);
  await page.waitForTimeout(400);
  await expect(menu).toBeVisible();
  expect(await row.evaluate(element => element.scrollLeft)).toBe(opened);
  await page.keyboard.press('ArrowDown');
  await expect(menu.getByRole('menuitem', { name: 'Facebook' })).toBeFocused();
  await expect(menu).toBeVisible();
  // Un vrai défilement de la rangée déplace le bouton : le menu se ferme.
  await row.evaluate((element, left) => { element.scrollLeft = left > 60 ? 0 : 120; }, opened);
  await expect(menu).toHaveCount(0);
});
