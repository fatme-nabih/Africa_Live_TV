import { test, expect, type Page } from '@playwright/test';

const snapshot = (title = 'Économie africaine : investissements et croissance dans plusieurs régions du continent') => {
  const now = new Date().toISOString();
  return { updatedAt: now, disclaimer: 'Dernières séances disponibles.',
    alerts: [{ id: 'africa', title, type: 'news', severity: 'info', scope: 'Africa', countryCode: 'SN', source: 'Ecofin', url: 'https://example.test/africa', timestamp: now },
      { id: 'world', title: 'Économie internationale', type: 'news', severity: 'warning', scope: 'World', source: 'Rédaction internationale', url: 'https://example.test/world', timestamp: now }],
    commodities: [{ symbol: 'CC=F', name: 'Cacao', label: 'Cacao · marché mondial', price: 5671, previousClose: 5665, previousCloseAt: new Date(Date.now() - 86400_000).toISOString(), changePercent24h: -3.34, currency: 'USD', unit: '$/tonne', source: 'Yahoo Finance / ICE US', updatedAt: now }],
    forex: [{ pair: 'EUR / XOF', base: 'EUR', quote: 'XOF', rate: 655.957, label: 'Parité fixe UEMOA', isPegged: true, updatedAt: '', source: 'BCEAO' }],
    availability: [{ provider: 'Yahoo Finance / ICE US', scope: 'Monde', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: now, count: 1 }] };
};
const band = (page: Page) => page.getByRole('region', { name: 'Bandeau des marchés et événements' });
const track = (page: Page) => page.locator('.animate-ticker-scroll');
const transform = (page: Page) => track(page).evaluate(el => getComputedStyle(el).transform);

test.beforeEach(async ({ page }) => {
  await page.route('**/api/live/markets*', route => route.fulfill({ json: snapshot() }));
  await page.setViewportSize({ width: 1366, height: 844 });
});

test('real CSS: pause freezes movement and resume progresses while focus remains on the button', async ({ page }) => {
  await page.goto('/?kind=ticker');
  await expect(band(page).getByRole('button', { name: 'Mettre en pause' })).toBeVisible();
  const first = await transform(page);
  await expect.poll(() => transform(page)).not.toBe(first);
  await band(page).getByRole('button', { name: 'Mettre en pause' }).click();
  await expect.poll(() => track(page).evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
  const frozen = await transform(page); await page.waitForTimeout(150); expect(await transform(page)).toBe(frozen);
  await band(page).getByRole('button', { name: 'Reprendre le défilement' }).click();
  await expect.poll(() => transform(page)).not.toBe(frozen);
});

test('loop groups match exactly, include the gap, cover the viewport and contain no fake interactive links', async ({ page }) => {
  await page.goto('/?kind=ticker'); await expect(page.locator('.ticker-group').first()).toContainText('Cacao');
  await expect.poll(() => track(page).evaluate(el => parseFloat((el as HTMLElement).style.getPropertyValue('--ticker-distance')))).toBeGreaterThan(0);
  const dimensions = await track(page).evaluate(el => {
    const [first, second] = [...el.children].map(node => node.getBoundingClientRect());
    return { width: first.width, offset: second.x - first.x, distance: parseFloat((el as HTMLElement).style.getPropertyValue('--ticker-distance')), duration: parseFloat(getComputedStyle(el).animationDuration), viewport: el.parentElement!.getBoundingClientRect().width };
  });
  expect(dimensions.width).toBeGreaterThanOrEqual(dimensions.viewport);
  expect(Math.abs(dimensions.width - dimensions.offset)).toBeLessThan(0.1);
  expect(Math.abs(dimensions.width - dimensions.distance)).toBeLessThan(0.1);
  expect(Math.abs(dimensions.duration - dimensions.width / 40)).toBeLessThan(0.1);
  await expect(track(page).locator('a,button')).toHaveCount(0);
  await band(page).locator('summary').press('Enter');
  await expect(band(page).getByRole('link', { name: /^Source : Économie africaine/ })).toBeVisible();
  await band(page).getByRole('button', { name: 'Voir le pays : Sénégal' }).click();
  await expect(page.getByTestId('ticker-country')).toHaveText('SN');
});

for (const width of [320, 390]) test(`mobile ${width}px: full title, navigation, source and dates remain usable`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await page.goto('/?kind=ticker');
  const reader = band(page).locator('.ticker-reader');
  await expect(reader.getByRole('link', { name: /^Source : Économie africaine/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await reader.getByRole('button', { name: 'Information suivante' }).click(); await expect(reader).toContainText('Cacao'); await expect(reader).toContainText('+0,11 %');
  await reader.getByRole('button', { name: 'Information suivante' }).click(); await expect(reader).toContainText('1 EUR = 655,957 XOF');
  await reader.getByRole('button', { name: 'Information suivante' }).click(); await expect(reader).toContainText('Économie africaine');
  await band(page).locator('summary').click(); await expect(band(page)).toContainText('séance de référence');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

for (const mode of ['reduced', 'eco']) test(`${mode}: every information is readable without any animation`, async ({ page }) => {
  if (mode === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?kind=ticker'); if (mode === 'eco') await page.getByRole('button', { name: 'Toggle test eco' }).click();
  const reader = band(page).locator('.ticker-reader'); await expect(reader).toBeVisible(); await expect(page.locator('.ticker-marquee')).toBeHidden();
  await expect.poll(() => track(page).evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await reader.getByRole('button', { name: 'Information suivante' }).click(); await expect(reader).toContainText('Cacao');
  await reader.getByRole('button', { name: 'Information suivante' }).click(); await expect(reader).toContainText('XOF');
  await band(page).getByRole('button', { name: 'Monde', exact: true }).click();
  await expect(reader.getByRole('link', { name: 'Source : Économie internationale' })).toBeVisible(); await expect(reader).not.toContainText('Économie africaine');
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

test('a stalled request reaches its deadline rather than leaving the loading indicator indefinitely', async ({ page }) => {
  await page.clock.install(); await page.route('**/api/live/markets*', () => {}); await page.goto('/?kind=ticker');
  await expect(band(page)).toContainText('Chargement'); await page.clock.fastForward(15_100);
  await expect(band(page)).toContainText('momentanément indisponibles');
});
