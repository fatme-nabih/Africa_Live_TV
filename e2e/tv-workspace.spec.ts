import { expect, test, type Page } from '@playwright/test';
import { categoryCodes, catalogLanguageCodes } from '../src/lib/catalog-metadata';
import { fixtureRadar } from './helpers/radar-fixture';

async function fixtureTv(page: Page, options: { slowSN?: boolean; expired?: boolean } = {}) {
  const favorites = new Set<string>();
  const requests: Record<string, unknown>[] = [];
  const channels = Array.from({ length: 42 }, (_, index) => ({ id: `tv-${index}`, name: `Alpha ${String(index).padStart(2, '0')}`,
    countryCode: index < 34 ? 'SN' : index < 38 ? 'CI' : 'FR', groupTitle: index === 0 ? 'Business;News' : index === 1 ? 'Undefined' : 'News',
    language: index % 2 === 0 ? 'fra;eng' : 'fr', logoUrl: null, playbackMode: 'BROWSER', availabilityStatus: 'READY' }));
  await page.route('**/api/filters', route => route.fulfill({ json: { countries: ['SN', 'CI', 'FR', 'SN'], groups: ['News', 'Business;News', 'Undefined', 'News'], languages: ['fra', 'fr', 'eng', 'zzz', 'unknown'], statuses: [] } }));
  await page.route('**/api/favorites', async route => {
    if (options.expired) return route.fulfill({ status: 403, json: { error: 'Accès actif requis.', code: 'ACCESS_REQUIRED' } });
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      for (const id of body.add ?? []) favorites.add(id);
      for (const id of body.remove ?? []) favorites.delete(id);
    }
    await route.fulfill({ json: { favorites: [...favorites] } });
  });
  await page.route('**/api/channels', async route => {
    const body = route.request().postDataJSON(); requests.push(body);
    if (options.slowSN && body.country === 'SN') await new Promise(resolve => setTimeout(resolve, 700));
    const rows = channels.filter(channel => (!body.search || channel.name.toLowerCase().includes(body.search.toLowerCase())) &&
      (!body.country || channel.countryCode === body.country) && (!body.group || categoryCodes(channel.groupTitle).includes(body.group)) &&
      (!body.language || catalogLanguageCodes(channel.language).includes(body.language)) &&
      (body.region !== 'africa' || ['SN', 'CI'].includes(channel.countryCode)) && (!body.favoritesOnly || favorites.has(channel.id)));
    const start = Number(body.cursor ?? 0), slice = rows.slice(start, start + 30), hasMore = start + 30 < rows.length;
    const publicRows = slice.map(channel => ({ id: channel.id, name: channel.name, countryCode: channel.countryCode,
      groupTitle: channel.groupTitle, logoUrl: channel.logoUrl, playbackMode: channel.playbackMode, availabilityStatus: channel.availabilityStatus }));
    await route.fulfill({ json: { channels: publicRows, hasMore, limit: 30, canPlay: !options.expired, nextCursor: hasMore ? String(start + 30) : null } });
  });
  return { requests, favorites };
}

test('Filtres combinés : raccourci/sidebar synchronisés, composites, pagination, reset et historique', async ({ page }) => {
  const { requests } = await fixtureTv(page);
  await page.goto('/app');
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(30);
  await page.getByRole('button', { name: 'Charger plus de chaînes' }).click();
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(42);
  await page.getByRole('button', { name: 'Actualités', exact: true }).click();
  await expect(page.getByLabel('Catégorie', { exact: true })).toHaveValue('News');
  await expect(page.getByText('Alpha 00', { exact: true })).toBeVisible();
  await expect(page.getByText('Économie · Actualités', { exact: true }).first()).toBeVisible();
  await page.getByLabel('Pays', { exact: true }).selectOption('SN');
  await page.getByLabel('Langue', { exact: true }).selectOption('fr');
  await page.getByLabel('Recherche', { exact: true }).fill('Alpha');
  await expect.poll(() => requests.at(-1)).toMatchObject({ search: 'Alpha', country: 'SN', language: 'fr', group: 'News', cursor: null });
  await expect(page.getByRole('button', { name: 'Actualités', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await expect(page.getByLabel('Catégorie', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Langue', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Recherche', { exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Tout le catalogue', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack(); await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('SN');
  await page.goForward(); await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('');
});

test('Pays rapides : réponse SN tardive ignorée, curseur annulé et compte cohérent', async ({ page }) => {
  const { requests } = await fixtureTv(page, { slowSN: true });
  await page.goto('/app');
  await page.getByLabel('Pays', { exact: true }).selectOption('SN');
  await expect.poll(() => requests.some(request => request.country === 'SN')).toBe(true);
  await page.getByLabel('Pays', { exact: true }).selectOption('CI');
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(4);
  await page.waitForTimeout(800);
  await expect(page.getByText('Alpha 00', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Chaînes en direct' }).getByText('4 chaînes visibles', { exact: true })).toBeVisible();
  expect(requests.at(-1)?.cursor).toBeNull();
});

test('Afrique → Tout et favoris persistants/vides, sans supprimer le catalogue', async ({ page }) => {
  await fixtureTv(page); await page.goto('/app');
  await page.getByRole('button', { name: 'Afrique', exact: true }).click();
  await expect(page).toHaveURL(/region=africa/);
  await page.getByRole('button', { name: 'Charger plus de chaînes' }).click();
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(38);
  await page.getByRole('button', { name: 'Tout le catalogue', exact: true }).click();
  await page.getByRole('button', { name: 'Ajouter Alpha 00 aux favoris', exact: true }).click();
  await page.getByRole('button', { name: /^Favoris/ }).click();
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Retirer Alpha 00 des favoris', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retirer Alpha 00 des favoris', exact: true }).click();
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tout le catalogue', exact: true }).click();
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / })).toHaveCount(30);
});

for (const width of [1366, 390, 320]) test(`Navigation et filtres clavier à ${width}px, lien dashboard→TV conservé`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await fixtureRadar(page, { weatherOk: true }); await fixtureTv(page);
  await page.goto('/app/live?country=SN');
  const nav = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(nav.getByRole('link', { name: 'TV', exact: true })).toHaveAttribute('href', '/app?country=SN');
  await expect(nav.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Administration' })).toHaveCount(0);
  await nav.getByRole('link', { name: 'TV', exact: true }).click();
  await expect(page).toHaveURL(/\/app\?country=SN$/);
  await expect(nav.getByRole('link', { name: 'TV', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Dashboard Africa Live', exact: true })).toHaveAttribute('href', '/app/live');
  if (width < 1024) await page.getByRole('button', { name: 'Ouvrir les filtres' }).click();
  await expect(page.getByLabel('Pays', { exact: true })).toHaveValue('SN');
  await page.getByLabel('Recherche', { exact: true }).focus();
  await page.getByLabel('Recherche', { exact: true }).fill('Alpha');
  await expect(page.getByLabel('Recherche', { exact: true })).toBeFocused();
  if (width < 1024) {
    await page.getByLabel('Recherche', { exact: true }).press('Escape');
    await expect(page.getByRole('button', { name: 'Ouvrir les filtres' })).toBeFocused();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Filtres', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Recherche', { exact: true })).toBeFocused();
    await dialog.getByRole('button', { name: 'Voir les résultats' }).focus();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button').first()).toBeFocused();
    await page.keyboard.press('Escape');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#catalogue').getByRole('button', { name: /^Regarder / }).first()).toBeVisible();
  await page.screenshot({ path: `docs/screenshots/l3-tv-${width}.png`, fullPage: false });
});

test('Catalogue expiré simulé : consultation conservée et lecture interdite', async ({ page }) => {
  await fixtureTv(page, { expired: true }); await page.goto('/app?country=SN');
  await page.getByRole('button', { name: 'Regarder Alpha 00', exact: true }).click();
  await expect(page.getByRole('link', { name: /abonn/i }).first()).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Lecture directe', exact: true })).toHaveCount(0);
});
