import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';
import { fixtureCatalog, mockResolutions, mockVlc, serveVideo } from './helpers/tv-fixture';

// P5 / UX-501 — Lecteur unique de l'espace /app : il se réduit en mini-lecteur et continue du Radar à la TV.
const region = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const mini = (page: Page) => region(page, 'Mini-lecteur');
const currentTime = (page: Page) => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime);

async function setup(page: Page) {
  await mockVlc(page);
  await serveVideo(page);
  const resolutions = await mockResolutions(page);
  await fixtureCatalog(page);
  await fixtureRadar(page, { weatherOk: true });
  return resolutions;
}

async function play(page: Page, row: string, name: string) {
  await region(page, row).getByRole('button', { name: `Regarder ${name}`, exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect.poll(() => currentTime(page)).toBeGreaterThan(0);
}

test.describe('Lecteur unique (UX-501)', () => {
  for (const navigated of [false,true]) test(`BUG-203: popup refusée conserve la vidéo en lecture (après navigation=${navigated})`,async ({ page }) => {
    await page.setViewportSize({ width:1366,height:900 });
    await page.addInitScript(() => { window.open = () => null; });
    const resolutions = await setup(page); await page.goto('/app'); await play(page,'Info','Alpha Sénégal');
    await page.locator('video').evaluate(video => { video.dataset.dockMark = 'retained'; });
    if (navigated) {
      await page.getByRole('button',{ name:'Réduire le lecteur' }).click();
      await page.getByRole('navigation',{ name:'Navigation principale' }).getByRole('link',{ name:/Radar/ }).first().click();
      await expect(page).toHaveURL(/\/app\/live/);
      await expect(page.getByRole('navigation',{ name:'Navigation principale' }).getByRole('link',{ name:/Radar/ }).first()).toHaveAttribute('aria-current','page');
      await mini(page).getByRole('button',{ name:'Agrandir le lecteur' }).click();
    }
    const before = await currentTime(page);
    await page.getByRole('button',{ name:'Ouvrir dans une fenêtre séparée' }).click();
    await expect(page.getByRole('dialog')).toBeVisible(); await expect(page.locator('video')).toHaveAttribute('data-dock-mark','retained');
    await expect.poll(() => currentTime(page)).toBeGreaterThan(before); expect(resolutions).toEqual(['sn-1']);
    await expect(page.getByRole('alert').filter({ hasText:'Le navigateur a refusé la fenêtre' })).toBeVisible();
  });
  test('réduit, il continue sur le Radar sans relancer le flux ni capturer les touches de la page', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const resolutions = await setup(page);
    await page.goto('/app');
    await play(page, 'Info', 'Alpha Sénégal');
    expect(resolutions).toEqual(['sn-1']);

    await page.getByRole('button', { name: 'Réduire le lecteur' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(mini(page)).toBeVisible();
    await expect(mini(page).locator('#inline-player-title')).toHaveText('Alpha Sénégal');
    // Marque l'élément vidéo : il doit être le même après la navigation (aucun remontage, donc aucune relance).
    await page.locator('video').evaluate(video => { video.dataset.dockMark = 'same'; });
    const before = await currentTime(page);

    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: /Radar/ }).first().click();
    await expect(page).toHaveURL(/\/app\/live/);
    await expect(mini(page)).toBeVisible();
    await expect(page.locator('video')).toHaveCount(1);
    await expect(page.locator('video')).toHaveAttribute('data-dock-mark', 'same');
    await expect.poll(() => currentTime(page)).toBeGreaterThan(before);

    // Les flèches appartiennent à la page en mini-lecteur : aucun zapping.
    await page.locator('body').press('ArrowRight');
    await page.waitForTimeout(300);
    expect(resolutions).toEqual(['sn-1']);

    await mini(page).getByRole('button', { name: 'Agrandir le lecteur' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('video')).toHaveAttribute('data-dock-mark', 'same');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(mini(page)).toHaveCount(0);
    await expect(page.locator('video')).toHaveCount(0);
    expect(resolutions).toEqual(['sn-1']);
  });

  test('une seule source : une autre chaîne remplace celle du mini-lecteur', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const resolutions = await setup(page);
    await page.goto('/app');
    await play(page, 'Info', 'Alpha Sénégal');
    await page.getByRole('button', { name: 'Réduire le lecteur' }).click();
    await expect(mini(page)).toBeVisible();

    await play(page, 'Sport', 'Beta Sénégal');
    await expect(page.locator('#inline-player-title')).toHaveText('Beta Sénégal');
    await expect(page.locator('video')).toHaveCount(1);
    await expect(mini(page)).toHaveCount(0);
    expect(resolutions).toEqual(['sn-1', 'sn-2']);
  });

  test('mobile 360 px : le mini-lecteur tient au-dessus de la barre basse, sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await setup(page);
    await page.goto('/app');
    await play(page, 'Info', 'Alpha Sénégal');
    await page.getByRole('button', { name: 'Réduire le lecteur' }).click();
    await expect(mini(page)).toBeVisible();
    const box = (await mini(page).boundingBox())!;
    const bar = (await page.getByRole('navigation', { name: 'Navigation principale' }).last().boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(mini(page).getByRole('button', { name: 'Fermer le lecteur' })).toBeVisible();
  });
});
