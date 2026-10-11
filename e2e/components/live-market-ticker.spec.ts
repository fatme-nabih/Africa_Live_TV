import { test, expect, type Locator, type Page } from '@playwright/test';

const snapshot = (title = 'Économie africaine : investissements et croissance dans plusieurs régions du continent') => {
  const now = new Date().toISOString();
  return { updatedAt: now, disclaimer: 'Dernières séances disponibles.',
    alerts: [{ id: 'africa', title, type: 'news', severity: 'info', scope: 'Africa', countryCode: 'SN', source: 'Ecofin', url: 'https://example.test/africa', timestamp: now },
      { id: 'africa-2', title: 'Budget sénégalais adopté', type: 'news', severity: 'info', scope: 'Africa', source: 'APS', url: 'https://example.test/africa-2', timestamp: now },
      { id: 'world', title: 'Économie internationale', type: 'news', severity: 'warning', scope: 'World', source: 'Rédaction internationale', url: 'https://example.test/world', timestamp: now }],
    commodities: [{ symbol: 'CC=F', name: 'Cacao', label: 'Cacao · marché mondial', price: 5671, previousClose: 5665, previousCloseAt: new Date(Date.now() - 86400_000).toISOString(), changePercent24h: -3.34, currency: 'USD', unit: '$/tonne', source: 'Yahoo Finance / ICE US', updatedAt: now,
      history: [5700, 5582, 5665, 5671].map((price, i) => ({ at: new Date(Date.now() - (4 - i) * 86400_000).toISOString(), price })) }],
    forex: [{ pair: 'EUR / XOF', base: 'EUR', quote: 'XOF', rate: 655.957, label: 'Parité fixe UEMOA', isPegged: true, updatedAt: '', source: 'BCEAO' },
      { pair: 'USD / XOF', base: 'USD', quote: 'XOF', rate: 560, label: 'Taux indicatif dérivé', isPegged: false, updatedAt: now, source: 'ExchangeRate-API' }],
    availability: [{ provider: 'Yahoo Finance / ICE US', scope: 'Monde', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: now, count: 1 }] };
};
const band = (page: Page) => page.getByRole('region', { name: 'Bandeau des marchés et événements' });
const headline = (page: Page) => band(page).locator('.ticker-headline');
const basket = (page: Page) => band(page).getByRole('list', { name: /^Le panier/ });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/live/markets*', route => route.fulfill({ json: snapshot() }));
  await page.setViewportSize({ width: 1366, height: 844 });
});

const tracks = (page: Page) => band(page).locator('.animate-marquee');
const transform = (track: Locator) => track.evaluate(el => getComputedStyle(el).transform);
const playState = (track: Locator) => track.evaluate(el => getComputedStyle(el).animationPlayState);

test('desktop: the wire and the basket scroll on two lines; pause and hover freeze them; loop copies are inert', async ({ page }) => {
  await page.goto('/?kind=ticker');
  await expect(tracks(page)).toHaveCount(2); await expect(band(page).locator('.ticker-reader')).toBeHidden();
  for (const i of [0, 1]) { const first = await transform(tracks(page).nth(i)); await expect.poll(() => transform(tracks(page).nth(i))).not.toBe(first); }
  await expect(band(page).getByRole('list', { name: 'Le fil : dépêches économiques' }).getByRole('link', { name: /^Source : Économie africaine/ })).toHaveCount(1);
  await expect(band(page).locator('.marquee-clone').first()).toHaveAttribute('aria-hidden', 'true');
  await expect(band(page).locator('.marquee-clone').locator('a,button')).toHaveCount(0);
  await band(page).getByRole('button', { name: 'Mettre le bandeau en pause' }).click(); await page.mouse.move(0, 0);
  for (const i of [0, 1]) await expect.poll(() => playState(tracks(page).nth(i))).toBe('paused');
  const frozen = await transform(tracks(page).nth(1)); await page.waitForTimeout(150); expect(await transform(tracks(page).nth(1))).toBe(frozen);
  await band(page).getByRole('button', { name: 'Reprendre le bandeau' }).click(); await page.mouse.move(0, 0);
  await expect.poll(() => transform(tracks(page).nth(1))).not.toBe(frozen);
  await band(page).locator('.marquee').last().hover({ force: true }); await expect.poll(() => playState(tracks(page).nth(1))).toBe('paused');
  const loop = await tracks(page).nth(1).evaluate(el => {
    const [first, second] = [...el.children].map(node => node.getBoundingClientRect());
    return { width: first.width, offset: second.x - first.x, duration: parseFloat(getComputedStyle(el).animationDuration), viewport: el.parentElement!.getBoundingClientRect().width };
  });
  expect(loop.width).toBeGreaterThanOrEqual(loop.viewport - 20); expect(Math.abs(loop.width - loop.offset)).toBeLessThan(0.1);
  expect(Math.abs(loop.duration - loop.width / 40)).toBeLessThan(0.1);
});

test('the basket keeps original quotation currencies next to the dollar and the euro in FCFA', async ({ page }) => {
  await page.goto('/?kind=ticker');
  await expect(basket(page)).toContainText(/Cacao\s*5\s671,00 USD \/ tonne/); await expect(basket(page)).not.toContainText('FCFA/kg');
  await expect(basket(page)).toContainText('1 USD = 560,000 FCFA'); await expect(basket(page)).toContainText('1 EUR = 655,957 FCFA');
  await expect(band(page).getByRole('button', { name: 'Cotation' })).toHaveCount(0);
  await band(page).locator('summary').press('Enter'); await expect(band(page)).toContainText('devise de cotation d’origine');
  await band(page).locator('details').getByRole('button', { name: 'Voir le pays : Sénégal' }).click();
  await expect(page.getByTestId('ticker-country')).toHaveText('SN');
});

test('without a dollar rate only the fixed euro parity is shown', async ({ page }) => {
  const raw = snapshot(); raw.forex = raw.forex.filter(rate => rate.isPegged);
  await page.route('**/api/live/markets*', route => route.fulfill({ json: raw }));
  await page.goto('/?kind=ticker');
  await expect(basket(page)).toContainText('1 EUR = 655,957 FCFA'); await expect(basket(page)).not.toContainText('1 USD');
});

test('mobile: one headline at a time, rotates, stops on pause and steps manually; the basket does not animate', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.install(); await page.goto('/?kind=ticker');
  await expect(band(page).locator('.ticker-wire')).toBeHidden();
  await expect(headline(page).getByRole('link', { name: /^Source : Économie africaine/ })).toBeVisible();
  await expect(headline(page)).toHaveAttribute('aria-live', 'off');
  await page.clock.fastForward(7_100); await expect(headline(page)).toContainText('Budget sénégalais adopté');
  await band(page).getByRole('button', { name: 'Mettre le bandeau en pause' }).click(); await page.mouse.move(0, 0);
  await page.clock.fastForward(15_000); await expect(headline(page)).toContainText('Budget sénégalais adopté');
  await band(page).getByRole('button', { name: 'Dépêche suivante' }).click();
  await expect(headline(page)).toContainText('Économie africaine'); await expect(headline(page)).toHaveAttribute('aria-live', 'polite');
  await expect(band(page)).toContainText('1/2');
  await expect.poll(() => tracks(page).nth(1).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

for (const width of [320, 390]) test(`mobile ${width}px: full title, navigation, basket and sources remain usable`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await page.goto('/?kind=ticker');
  await expect(headline(page).getByRole('link', { name: /^Source : Économie africaine/ })).toBeVisible();
  await band(page).getByRole('button', { name: 'Dépêche suivante' }).click(); await expect(headline(page)).toContainText('Budget sénégalais adopté');
  await expect(basket(page)).toContainText('Cacao'); await expect(basket(page)).toContainText('+0,11 %');
  await band(page).locator('summary').click(); await expect(band(page)).toContainText('séance de référence');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const mode of ['reduced', 'eco']) test(`${mode}: nothing moves by itself and every line stays readable`, async ({ page }) => {
  if (mode === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install(); await page.goto('/?kind=ticker'); if (mode === 'eco') await page.getByRole('button', { name: 'Toggle test eco' }).click();
  await expect(headline(page)).toContainText('Économie africaine'); await expect(band(page).locator('.ticker-wire')).toBeHidden();
  await expect(band(page).getByRole('button', { name: 'Mettre le bandeau en pause' })).toHaveCount(0);
  await expect.poll(() => headline(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect.poll(() => tracks(page).nth(1).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await expect(band(page).locator('.marquee-clone').last()).toBeHidden();
  await page.clock.fastForward(30_000); await expect(headline(page)).toContainText('Économie africaine');
  await band(page).getByRole('button', { name: 'Dépêche suivante' }).click(); await expect(headline(page)).toContainText('Budget sénégalais adopté');
  await band(page).getByRole('button', { name: 'Monde', exact: true }).click();
  await expect(headline(page).getByRole('link', { name: 'Source : Économie internationale' })).toBeVisible(); await expect(band(page)).not.toContainText('Budget sénégalais');
});

test('manual refresh forces the endpoint; a late old response cannot erase the current success', async ({ page }) => {
  let reads = 0, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const urls: string[] = [];
  await page.route('**/api/live/markets*', async route => {
    urls.push(route.request().url()); const read = ++reads; if (read === 1) await held;
    await route.fulfill({ json: snapshot(read === 1 ? 'Old result' : 'New result') }).catch(() => {});
  });
  await page.goto('/?kind=ticker'); await expect.poll(() => reads).toBe(1);
  await page.getByRole('button', { name: 'Refresh ticker' }).click();
  await expect(band(page)).toContainText('New result'); expect(urls[1]).toContain('refresh=true'); release();
  await page.waitForTimeout(100); await expect(band(page)).not.toContainText('Old result');
});

test('failures announce retained data, expired data disappears and invalid rates cannot crash rendering', async ({ page }) => {
  await page.clock.install(); await page.goto('/?kind=ticker'); await expect(band(page)).toContainText('Cacao');
  await page.route('**/api/live/markets*', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Refresh ticker' }).click(); await expect(band(page).locator('summary')).toContainText('Données conservées');
  await page.clock.fastForward(6 * 3600_000 + 1000); await page.getByRole('button', { name: 'Refresh ticker' }).click();
  await expect(band(page)).toContainText('momentanément indisponibles'); await expect(band(page)).not.toContainText('Cacao');
  await expect(band(page).locator('summary')).not.toContainText('Données conservées');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  // Use the controlled browser time for a valid envelope, then pass one malformed row.
  const browserNow = await page.evaluate(() => Date.now());
  await page.route('**/api/live/markets*', route => route.fulfill({ json: { ...snapshot(), updatedAt: new Date(browserNow).toISOString(), forex: [{ rate: null }] } }));
  await page.getByRole('button', { name: 'Refresh ticker' }).click(); await expect(band(page)).toContainText('Cacao'); expect(errors).toEqual([]);
});

test('a basket product lights up its producing countries on the map card, and a second click clears it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/?kind=ticker&map=1');
  await expect(basket(page).getByTestId('sparkline')).toHaveCount(1);
  const cocoa = basket(page).getByRole('button', { name: /Cacao.*voir les principaux producteurs sur la carte/ });
  await cocoa.click(); await expect(cocoa).toHaveAttribute('aria-pressed', 'true');
  const panel = page.locator('#radar-commodity');
  await expect(panel).toContainText('Principaux producteurs : cacao');
  await expect(panel.getByRole('list', { name: 'Principaux producteurs : cacao' }).getByRole('button')).toHaveText(['Côte d’Ivoire', 'Ghana', 'Cameroun', 'Nigéria']);
  await expect(panel).toBeInViewport();
  await panel.getByRole('button', { name: 'Ghana' }).click(); await expect(page.getByTestId('ticker-country')).toHaveText('GH');
  await cocoa.click(); await expect(cocoa).toHaveAttribute('aria-pressed', 'false'); await expect(panel).toBeEmpty();
  await cocoa.click(); await panel.getByRole('button', { name: 'Effacer' }).click(); await expect(cocoa).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('without the map the basket chips stay plain text', async ({ page }) => {
  await page.goto('/?kind=ticker'); await expect(basket(page)).toContainText('Cacao');
  await expect(basket(page).getByRole('button')).toHaveCount(0);
});

test('an international dispatch that names an African country carries the « Touche l’Afrique » badge', async ({ page }) => {
  const raw = snapshot(); raw.alerts.push({ ...raw.alerts[2], id: 'world-africa', title: 'Le FMI relève ses prévisions pour le Sénégal', url: 'https://example.test/world-africa' });
  await page.route('**/api/live/markets*', route => route.fulfill({ json: raw }));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/?kind=ticker');
  await band(page).getByRole('button', { name: 'Monde', exact: true }).click();
  await expect(headline(page)).toContainText('Économie internationale'); await expect(headline(page)).not.toContainText('Touche l’Afrique');
  await band(page).getByRole('button', { name: 'Dépêche suivante' }).click();
  await expect(headline(page)).toContainText('Sénégal'); await expect(headline(page)).toContainText('Touche l’Afrique');
});

test('a stalled request reaches its deadline rather than leaving the loading indicator indefinitely', async ({ page }) => {
  await page.clock.install(); await page.route('**/api/live/markets*', () => {}); await page.goto('/?kind=ticker');
  await expect(band(page)).toContainText('Chargement'); await page.clock.fastForward(15_100);
  await expect(band(page)).toContainText('momentanément indisponibles');
});
