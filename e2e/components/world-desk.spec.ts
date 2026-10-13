import { test, expect, type Page } from '@playwright/test';

// Dates distinctes : deux articles datés à la même milliseconde près pourraient changer d'ordre d'un passage à l'autre.
const hours = (n: number) => new Date(Date.now() - n * 3600_000).toISOString();
const article = (id: string, title: string, region: string | null, over: Record<string, unknown> = {}) => ({ id, title, url: `https://example.test/${id}`, sourceName: 'RFI', origin: 'France',
  publishedAt: hours(1), region, regionBasis: 'source', africanCountries: [], touchesAfrica: false, ...over });
const snapshot = () => {
  const at = Date.now();
  return { updatedAt: new Date(at).toISOString(), availability: [{ provider: 'Le Monde', scope: 'Monde · europe', status: 'unavailable', fetchedAt: new Date(at).toISOString(), lastSuccessAt: null, dataAt: null, cacheExpiresAt: null, count: 0 }],
  articles: [
    ...Array.from({ length: 15 }, (_, i) => article('eu' + i, `Europe dépêche ${i + 1}`, 'europe', { sourceName: i % 2 ? 'France 24' : 'RFI', publishedAt: new Date(at - 3600_000 - i * 1000).toISOString() })),
    article('am', 'Séisme au Panama', 'ameriques', { sourceName: 'Radio-Canada', origin: 'Canada', regionBasis: 'inferred' }),
    article('mo', 'Trêve discutée à Gaza', 'moyen-orient'),
    article('za', 'La Sud-Africaine Pillay récompensée', null, { sourceName: 'Radio-Canada', origin: 'Canada', regionBasis: 'inferred', africanCountries: ['ZA'], touchesAfrica: true, publishedAt: hours(1) }),
    article('sn', 'Le pacte migratoire européen inquiète Dakar', 'europe', { africanCountries: ['SN'], touchesAfrica: true, publishedAt: hours(2) }),
  ] };
};
const desk = (page: Page) => page.getByRole('region', { name: 'Regards sur le monde' });

test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1366, height: 900 }); });

test('nothing is requested until the rubric approaches the screen', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/live/world*', route => { reads++; return route.fulfill({ json: snapshot() }); });
  await page.goto('/?kind=world&far=1');
  await expect(desk(page)).toContainText('se chargent à l’approche'); await page.waitForTimeout(300); expect(reads).toBe(0);
  await desk(page).scrollIntoViewIfNeeded(); await expect(desk(page)).toContainText('Séisme au Panama'); expect(reads).toBe(1);
});

test('overview: four regions with local time, three headlines each, outlets and a door to the full region', async ({ page }) => {
  await page.route('**/api/live/world*', route => route.fulfill({ json: snapshot() }));
  await page.goto('/?kind=world');
  const europe = desk(page).getByRole('article', { name: 'Europe' });
  await expect(desk(page).getByRole('article')).toHaveCount(4);
  await expect(europe).toContainText(/Paris \d\d:\d\d GMT\+[12]/);
  await expect(europe.getByRole('link')).toHaveCount(3); await expect(europe).toContainText('RFI, France 24');
  await expect(desk(page).getByRole('article', { name: 'Asie-Pacifique' })).toContainText('Aucune dépêche sur les dernières 24 h');
  await expect(desk(page).getByRole('article', { name: 'Amériques' })).toContainText('Radio-Canada · Canada');
  await expect(desk(page)).toContainText('1 flux momentanément indisponible');
  await europe.getByRole('button', { name: 'Toute la région (16)' }).click();
  await expect(desk(page).getByRole('button', { name: /^Europe/ })).toHaveAttribute('aria-pressed', 'true');
  const list = desk(page).getByRole('list', { name: 'Europe' });
  await expect(list.getByRole('link')).toHaveCount(12);
  await desk(page).getByRole('button', { name: 'Afficher plus (4)' }).click(); await expect(list.getByRole('link')).toHaveCount(16);
  await expect(list.getByRole('listitem').filter({ hasText: 'pacte migratoire' })).toContainText('Touche l’Afrique');
});

test('Africa in the world gathers international stories that name the continent, with country shortcuts', async ({ page }) => {
  await page.route('**/api/live/world*', route => route.fulfill({ json: snapshot() }));
  await page.goto('/?kind=world');
  await desk(page).getByRole('button', { name: /^L’Afrique dans le monde/ }).click();
  const list = desk(page).getByRole('list', { name: 'L’Afrique dans le monde' });
  await expect(list.getByRole('link')).toHaveText([/Pillay/, /pacte migratoire/]);
  await expect(list).not.toContainText('Touche l’Afrique'); await expect(list).toContainText('Europe');
  await list.getByRole('button', { name: 'Voir le pays : Sénégal' }).click(); await expect(page.getByTestId('world-country')).toHaveText('SN');
});

test('an outage offers a retry; a later failure keeps the last dispatches and says so', async ({ page }) => {
  let fail = true;
  await page.route('**/api/live/world*', route => fail ? route.fulfill({ status: 503, json: { error: 'down' } }) : route.fulfill({ json: snapshot() }));
  await page.goto('/?kind=world');
  await expect(desk(page)).toContainText('momentanément injoignables');
  fail = false; await desk(page).getByRole('button', { name: 'Réessayer' }).click(); await expect(desk(page)).toContainText('Séisme au Panama');
  fail = true; await page.getByRole('button', { name: 'Refresh world' }).click();
  await expect(desk(page)).toContainText('dernières dépêches conservées'); await expect(desk(page)).toContainText('Séisme au Panama');
});

for (const width of [320, 390]) test(`mobile ${width}px: chips scroll inside the rubric, never the page`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.route('**/api/live/world*', route => route.fulfill({ json: snapshot() }));
  await page.goto('/?kind=world'); await expect(desk(page)).toContainText('Séisme au Panama');
  await desk(page).getByRole('button', { name: /^L’Afrique dans le monde/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
