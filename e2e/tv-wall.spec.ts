import { expect, test, type Page } from '@playwright/test';
import { fixtureCatalog, FIXTURE_CHANNELS, mockResolutions, mockVlc, serveVideo } from './helpers/tv-fixture';

// P5 / UX-506 — Mur TV 2×2 (drapeau, actif en développement) : une seule chaîne audible, quotas serveur inchangés.
const recents = FIXTURE_CHANNELS.filter(channel => ['sn-1', 'sn-2', 'sn-3', 'fr-1'].includes(channel.id));
const mutedStates = (page: Page) => page.locator('video').evaluateAll(videos => videos.map(video => (video as HTMLVideoElement).muted));

async function seedRecents(page: Page) {
  await page.addInitScript(list => localStorage.setItem('al_recent_channels', JSON.stringify(list)), recents);
}

test.describe('Mur TV (UX-506)', () => {
  test('trois chaînes du navigateur à la fois, une seule audible, VLC exclu', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await mockVlc(page);
    await serveVideo(page);
    const resolutions = await mockResolutions(page);
    await fixtureCatalog(page);
    await seedRecents(page);
    await page.goto('/app/mur');
    const wall = page.getByRole('list', { name: 'Chaînes du mur' });
    await expect(wall.getByRole('listitem')).toHaveCount(3);
    await expect(page.locator('video')).toHaveCount(3);
    await expect.poll(async () => (await page.locator('video').evaluateAll(videos => videos.map(video => (video as HTMLVideoElement).currentTime))).every(time => time > 0)).toBe(true);
    await expect.poll(() => mutedStates(page)).toEqual([false, true, true]);

    await wall.getByRole('button', { name: 'Écouter Beta Sénégal' }).click();
    await expect.poll(() => mutedStates(page)).toEqual([true, false, true]);
    await expect(wall.getByRole('button', { name: 'Beta Sénégal : son actif' })).toHaveAttribute('aria-pressed', 'true');
    expect([...resolutions].sort()).toEqual(['sn-1', 'sn-2', 'sn-3']);
  });

  test('en Éco data ou sur un écran étroit, le mur explique pourquoi il ne s’affiche pas', async ({ page }) => {
    await seedRecents(page);
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/app/mur');
    await expect(page.getByText('Mur TV sur grand écran')).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);

    await page.evaluate(() => localStorage.setItem('al_eco', 'true'));
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.reload();
    await expect(page.getByText('Mur TV en pause en mode Éco data')).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);
  });
});
