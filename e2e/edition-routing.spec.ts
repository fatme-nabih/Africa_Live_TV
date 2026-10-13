import { expect, test } from '@playwright/test';
import { fixtureRadar } from './helpers/radar-fixture';

// Contrat FR du socle et des éditions inactives ; EN (E3) et AR (E4) actifs sont reçus dans editions.spec.
const active = (process.env.EDITIONS ?? '').split(',').map(edition => edition.trim());
const inactive = (['en', 'ar'] as const).filter(edition => !active.includes(edition));

test('EDI-103/107: French public URLs and inactive editions retain their HTTP contract', async ({ request }) => {
  for (const route of ['/', '/cgu', '/privacy', '/contact']) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(200);
    expect(await response.text(), route).toContain('lang="fr"');
  }
  for (const route of [...inactive.flatMap(edition => [`/${edition}`, `/${edition}/${edition === 'en' ? 'cgu' : 'contact'}`]), '/es', '/page-inexistante']) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(404);
    expect(await response.text(), route).toContain('Page hors antenne');
  }
});

test('EDI-103: prefix redirects preserve the query and set the edition cookie correctly', async ({ request }) => {
  for (const [route, status, target] of [['/fr?country=SN', 308, '/?country=SN'], ['/fr/cgu', 308, '/cgu'],
    ['/fr/app/live?country=SN', 308, '/app/live?country=SN'], ['/en/app/live?country=SN', 307, '/app/live?country=SN']] as const) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(status);
    const url = new URL(response.headers().location, response.url());
    expect(url.pathname + url.search, route).toBe(target);
    if (route.startsWith('/fr')) {
      const cookie = response.headers()['set-cookie'];
      expect(cookie).toContain('al_edition=fr');
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Max-Age=31536000');
      expect(cookie).toMatch(/SameSite=Lax/i);
    }
  }
});

test('EDI-103: API and PWA resources keep their original URLs and content types', async ({ request }) => {
  const health = await request.get('/api/health', { maxRedirects: 0 });
  expect(health.status()).toBe(200);
  expect(health.headers()['content-type']).toContain('application/json');
  expect((await health.json()).status).toBe('ok');
  for (const [route, contentType] of [['/sw.js', 'javascript'], ['/manifest.webmanifest', 'manifest'],
    ['/icon.png', 'image/png'], ['/apple-icon.png', 'image/png'], ['/favicon.ico', 'image/']] as const) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain(contentType);
    expect(response.headers()['x-middleware-rewrite'], route).toBeUndefined();
  }
});

test('EDI-103/105: client navigation preserves visible URLs and the French document', async ({ page, context }) => {
  // Cookie d'une édition inactive, ou d'une valeur inconnue quand les trois éditions sont actives : le document reste français.
  await context.addCookies([{ name: 'al_edition', value: inactive[0] ?? 'es', url: 'http://localhost:3001' }]);
  const localMvp = process.env.LOCAL_DEV_MODE === 'true';
  if (localMvp) await fixtureRadar(page, { weatherOk: true });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  if (localMvp) {
    // Le MVP redirige déjà la landing vers le Radar : conserver et vérifier ce comportement historique.
    await expect(page).toHaveURL(/\/app\/live$/);
    await expect(page.getByRole('heading', { name: 'Radar Afrique', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'TV', exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Catalogue Africa Live', exact: true })).toBeAttached();
  } else {
    await expect(page.getByRole('heading', { name: /L’Afrique à portée de regard/ })).toBeVisible();
    await page.getByRole('link', { name: 'Confidentialité', exact: true }).click();
    await expect(page).toHaveURL(/\/privacy$/);
  }
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});
