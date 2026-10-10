import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { withFilters } from './helpers/filters';

const hasAuthenticatedState = Boolean(process.env.E2E_STORAGE_STATE);
const isLocalMvp = process.env.LOCAL_DEV_MODE === 'true';

async function openAuthenticatedCatalogue(page: Page) {
  const catalogResponse = page.waitForResponse(
    (response) => response.url().endsWith('/api/channels') && response.request().method() === 'POST',
  );
  await page.goto('/app');
  await catalogResponse;
  await expect(page.getByRole('heading', { name: 'Catalogue Africa Live' })).toBeAttached();
}

test.describe('catalogue, filtres, favoris et lecteur', () => {
  test.skip(!hasAuthenticatedState && !isLocalMvp, 'Session Clerk dédiée ou serveur MVP local requis.');

  test('le parcours principal reste accessible et les favoris sortent de l’URL', async ({ page }) => {
    await openAuthenticatedCatalogue(page);

    const search = page.getByRole('searchbox', { name: 'Recherche' });
    const searchRequest = page.waitForRequest(
      (request) => request.url().endsWith('/api/channels') && request.method() === 'POST' && request.postDataJSON()?.search === '%_',
    );
    await search.fill('%_');
    const request = await searchRequest;
    expect(new URL(request.url()).search).toBe('');
    expect(request.postDataJSON()).toMatchObject({ search: '%_', favoritesOnly: false });
    await search.fill('');

    const favoritesFilterRequest = page.waitForRequest(
      (candidate) => candidate.url().endsWith('/api/channels') && candidate.method() === 'POST' && candidate.postDataJSON().favoritesOnly === true && candidate.postDataJSON().limit === 30,
    );
    await withFilters(page, async drawer => {
      await drawer.getByRole('button', { name: 'Mes favoris' }).click();
      expect((await favoritesFilterRequest).postDataJSON()).toMatchObject({ favoritesOnly: true });
      await drawer.getByRole('button', { name: 'Mes favoris' }).click();
    });

    const firstCard = page.locator('#catalogue button[aria-label^="Regarder "]').first();
    await expect(firstCard).toBeVisible();
    const channelName = (await firstCard.getAttribute('aria-label'))!.replace(/^Regarder /, '');
    // This scenario exercises a healthy source, including the separate window.
    // An unreachable manifest now correctly ends its attempt and triggers retries.
    await page.context().route('https://media.invalid/**', async route => {
      const name = path.basename(new URL(route.request().url()).pathname);
      await route.fulfill({
        body: await readFile(path.join(process.cwd(), 'e2e/fixtures/hls', name)),
        contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    });
    await page.context().route('**/api/playback/resolutions', async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toMatchObject({
        destination: 'web',
        playbackSessionId: null,
        previousAttemptId: null,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Cache-Control': 'private, no-store',
          'Referrer-Policy': 'no-referrer',
        },
        body: JSON.stringify({
          playbackSessionId: '11111111-1111-4111-8111-111111111111',
          attemptId: '22222222-2222-4222-8222-222222222222',
          channel: { id: body.channelId, name: channelName },
          sourceUrl: 'https://media.invalid/index.m3u8',
        }),
      });
    });
    await firstCard.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'Ouvrir dans une fenêtre séparée' }).click();
    const playerWindow = await popupPromise;
    await expect(playerWindow).toHaveURL(/\/player\//);
    await expect(playerWindow.getByRole('region', { name: 'Lecteur vidéo' })).toContainText(channelName);
    expect(await playerWindow.content()).not.toContain('media.invalid');
    const browserStorage = await playerWindow.evaluate(() => ({
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    expect(browserStorage.local).not.toContain('media.invalid');
    expect(browserStorage.session).not.toContain('media.invalid');
    const windowsAfterFirstLaunch = page.context().pages().length;

    await firstCard.click();
    await page.getByRole('button', { name: 'Ouvrir dans une fenêtre séparée' }).click();
    await expect.poll(() => page.context().pages().length).toBe(windowsAfterFirstLaunch);
    await expect(playerWindow).toHaveURL(/\/player\//);

    const favoriteButton = firstCard.locator('xpath=..').getByRole('button', { name: /favoris/ });
    const initialFavorite = await favoriteButton.getAttribute('aria-pressed');
    try {
      await favoriteButton.click();
      await expect(favoriteButton).toHaveAttribute('aria-pressed', initialFavorite === 'true' ? 'false' : 'true');
    } finally {
      if ((await favoriteButton.getAttribute('aria-pressed')) !== initialFavorite) {
        await favoriteButton.click();
      }
      await playerWindow.close();
    }
  });

  test('une réponse de recherche obsolète ne remplace jamais la plus récente', async ({ page }) => {
    await openAuthenticatedCatalogue(page);

    await page.route('**/api/channels', async (route) => {
      const body = route.request().postDataJSON();
      if (body.search !== 'ancienne' && body.search !== 'nouvelle') {
        await route.continue();
        return;
      }
      if (body.search === 'ancienne') await new Promise((resolve) => setTimeout(resolve, 900));
      const name = body.search === 'ancienne' ? 'Réponse ancienne' : 'Réponse nouvelle';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          channels: [{
            id: `mock-${body.search}`,
            name,
            logoUrl: null,
            groupTitle: 'Test',
            countryCode: 'SN',
            playbackMode: 'BROWSER',
            availabilityStatus: 'READY',
          }],
          hasMore: false,
          limit: 30,
          nextCursor: null,
        }),
      }).catch(() => undefined);
    });

    const search = page.getByRole('searchbox', { name: 'Recherche' });
    await search.fill('ancienne');
    await page.waitForTimeout(350);
    await search.fill('nouvelle');
    await expect(page.getByText('Réponse nouvelle')).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(page.getByText('Réponse ancienne')).toHaveCount(0);
  });

  test('une erreur du catalogue est annoncée et peut être relancée', async ({ page }) => {
    await openAuthenticatedCatalogue(page);
    let failNext = true;
    await page.route('**/api/channels', async (route) => {
      // Seule la recherche « déclencheur » échoue (les rangées de l'accueil chargent aussi /api/channels).
      if (failNext && route.request().postDataJSON()?.search === 'déclencheur') {
        failNext = false;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Catalogue de test indisponible.', code: 'TEST_FAILURE' }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole('searchbox', { name: 'Recherche' }).fill('déclencheur');
    const catalogRegion = page.locator('#catalogue');
    await expect(catalogRegion.getByRole('alert')).toContainText('Catalogue de test indisponible.');
    await catalogRegion.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page.getByText('Le catalogue n’a pas pu être chargé.')).toHaveCount(0);
  });
});
