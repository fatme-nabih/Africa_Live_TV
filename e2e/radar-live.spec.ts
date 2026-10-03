import { expect, test, type Page } from '@playwright/test';
import { selectCountry } from './helpers/country';
import { fixtureRadar } from './helpers/radar-fixture';
import { FIXTURE_CHANNELS, mockResolutions, mockVlc, serveVideo } from './helpers/tv-fixture';
import { resolveWeatherTarget } from '../src/lib/weather-locations';
import { normalizeOpenMeteo } from '../src/lib/weather-adapters';
import { makeWeatherSnapshot } from '../src/lib/weather-contract';

// P3 — Radar « vivant » : À la une, tuiles, alerte météo, blocs repliables, arrivées en douceur, direct du pays, fond de carte.
test.use({ trace: 'off', screenshot: 'off' });

const IMAGE_HOST = 'https://img.editeur.test';
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

type Article = Record<string, unknown>;
const article = (id: string, extra: Article = {}): Article => ({
  id, title: `Titre ${id}`, url: `https://example.org/${id}`, domain: 'example.org', sourceName: `Rédaction ${id}`, sourceType: 'rss',
  publishedAt: minutesAgo(10), countryCode: 'SN', category: 'National', editorialScope: 'africa', countryBasis: 'media', ...extra,
});
function rss(articles: Article[]) {
  const now = new Date().toISOString();
  return { articles, undatedArticles: [], sources: [], updatedAt: now, availability: [{ provider: 'RSS · rédactions', scope: 'Afrique', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(), count: articles.length }] };
}
/** Fixture du Radar, puis dépêches choisies (la dernière route déclarée l'emporte). */
async function radar(page: Page, articles: Article[], options: { weatherOk?: boolean } = { weatherOk: true }) {
  await fixtureRadar(page, options);
  await page.route('**/api/live/rss', route => route.fulfill({ json: rss(articles) }));
}
const stories = (page: Page) => page.getByRole('region', { name: 'À la une', exact: true });

async function imageHost(page: Page) {
  const requests: string[] = [];
  await page.route(`${IMAGE_HOST}/**`, route => { requests.push(route.request().url()); return route.fulfill({ body: PIXEL, contentType: 'image/png' }); });
  return requests;
}

test.describe('À la une (UX-302)', () => {
  const withImage = [
    article('lead', { sourceName: 'RFI Afrique', publishedAt: minutesAgo(5), imageUrl: `${IMAGE_HOST}/une.png`, countryCode: 'SN' }),
    article('texte', { sourceName: 'APS (Sénégal)', publishedAt: minutesAgo(20) }),
    article('autre', { sourceName: 'Ecofin', publishedAt: minutesAgo(30), countryCode: 'CI' }),
  ];

  test('l’image de l’éditeur est chargée directement par le navigateur ; sans image, repli typographique', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const requests = await imageHost(page);
    const apiCalls: string[] = [];
    page.on('request', request => { if (/\/api\//.test(request.url()) && /image|media|proxy/i.test(request.url())) apiCalls.push(request.url()); });
    await radar(page, withImage);
    await page.goto('/app/live');
    const block = stories(page);
    await expect(block.getByText('Titre lead')).toBeVisible();
    const image = block.locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('src', `${IMAGE_HOST}/une.png`);
    await expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect.poll(() => requests.length).toBeGreaterThan(0);
    expect(apiCalls).toEqual([]);
    // Les dépêches sans image n’ont pas d’<img> : le titre reste lisible.
    await expect(block.getByText('Titre texte')).toBeVisible();
    await expect(block.getByText('Titre autre')).toBeVisible();
  });

  test('mode Éco data : aucune image n’est demandée', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('al_eco', 'true'));
    const requests = await imageHost(page);
    await radar(page, withImage);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre lead')).toBeVisible();
    await expect(stories(page).locator('img')).toHaveCount(0);
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
  });

  test('une image qui ne charge pas laisse le repli typographique, sans image cassée', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(`${IMAGE_HOST}/**`, route => route.abort());
    await radar(page, withImage);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre lead')).toBeVisible();
    await expect(stories(page).locator('img')).toHaveCount(0);
  });

  test('le fil ne répète pas ce qui est à la une et s’arrête à douze dépêches avant « Voir plus »', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const many = Array.from({ length: 20 }, (_, index) => article(`n${index}`, { sourceName: `Rédaction ${index}`, publishedAt: minutesAgo(index + 1) }));
    await radar(page, many);
    await page.goto('/app/live');
    const feed = page.getByRole('article', { name: 'Fil et chaînes du pays' });
    await expect(feed.getByRole('tab', { name: /Dépêches/ })).toContainText('20');
    for (const id of ['n0', 'n1', 'n2']) {
      await expect(page.getByText(`Titre ${id}`, { exact: true })).toHaveCount(1);
      await expect(stories(page).getByText(`Titre ${id}`)).toBeVisible();
      await expect(feed.getByText(`Titre ${id}`, { exact: true })).toHaveCount(0);
    }
    await expect(feed.getByText('Titre n3', { exact: true })).toBeVisible();
    await expect(feed.getByText('Titre n14', { exact: true })).toBeVisible();
    await expect(feed.getByText('Titre n15', { exact: true })).toHaveCount(0);
    await feed.getByRole('button', { name: /Voir plus de dépêches \(5 restantes\)/ }).click();
    await expect(feed.getByText('Titre n19', { exact: true })).toBeVisible();
    await expect(feed.getByRole('button', { name: /Voir plus de dépêches/ })).toHaveCount(0);
  });
});

test.describe('Tuiles du moment (UX-303)', () => {
  const threeArticles = () => [article('recent1', { publishedAt: minutesAgo(10) }), article('recent2', { publishedAt: minutesAgo(30), sourceName: 'Autre' }), article('ancienne', { publishedAt: minutesAgo(180), sourceName: 'Troisième' })];

  test('première visite : les dépêches des 24 h ; quitter la page enregistre la visite', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await radar(page, threeArticles());
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre recent1')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Dépêches des dernières 24 h : 3\./ })).toBeVisible();
    await expect(page.getByText('Nouveau', { exact: true })).toHaveCount(0);
    // Quitter la page enregistre la visite (seulement parce que des dépêches ont été affichées).
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    const stored = Number(await page.evaluate(() => localStorage.getItem('al_radar_visit')));
    expect(Date.now() - stored).toBeLessThan(10_000);
  });

  test('visite précédente il y a une heure : nouvelles depuis cette visite, repérées « Nouveau »', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.addInitScript(() => { if (localStorage.getItem('al_radar_visit') === null) localStorage.setItem('al_radar_visit', String(Date.now() - 60 * 60_000)); });
    await radar(page, threeArticles());
    await page.goto('/app/live');
    await expect(page.getByRole('button', { name: /^Nouvelles depuis votre visite : 2\./ })).toBeVisible();
    await expect(page.getByText('Nouveau', { exact: true })).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Nouvelles depuis votre visite/ })).toContainText(/depuis \d{2}:\d{2}/);
  });

  test('page fermée avant l’arrivée des dépêches : la dernière visite n’est pas écrasée', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { if (localStorage.getItem('al_radar_visit') === null) localStorage.setItem('al_radar_visit', '1700000000000'); });
    await fixtureRadar(page, { weatherOk: true });
    await page.route('**/api/live/rss', () => new Promise(() => {})); // jamais de réponse
    await page.goto('/app/live');
    await expect(page.getByRole('heading', { name: 'Radar Afrique' })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    expect(await page.evaluate(() => localStorage.getItem('al_radar_visit'))).toBe('1700000000000');
  });

  test('chaque tuile mène à son contenu : fil, chaînes, météo', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await radar(page, [article('a1'), article('a2', { sourceName: 'Autre' })]);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre a1')).toBeVisible();

    await page.getByRole('button', { name: /^Chaînes en direct d’Afrique : 3\./ }).click();
    await expect(page.getByRole('tab', { name: /Chaînes TV/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('article', { name: 'Fil et chaînes du pays' })).toBeFocused();

    await page.getByRole('button', { name: /^Dépêches des dernières 24 h/ }).click();
    await expect(page.getByRole('tab', { name: /^Dépêches/ })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('button', { name: 'Replier la météo' }).click();
    await expect(page.locator('#weather-country-select')).toBeHidden();
    await page.getByRole('button', { name: /^Alerte météo : rien à signaler/ }).click();
    await expect(page.locator('#weather-country-select')).toBeVisible();
    await expect(page.locator('#radar-meteo')).toBeFocused();
  });

  test('alerte météo : un orage est signalé en rouge, avec la réserve « pas une alerte officielle »', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await radar(page, [article('a1')]);
    const target = resolveWeatherTarget({ code: 'SN' });
    const at = Date.now();
    const storm = makeWeatherSnapshot(normalizeOpenMeteo({
      latitude: target.latitude, longitude: target.longitude, timezone: 'Africa/Dakar',
      current_units: { time: 'unixtime', temperature_2m: '°C', apparent_temperature: '°C', relative_humidity_2m: '%', wind_speed_10m: 'km/h', wind_direction_10m: '°', precipitation: 'mm' },
      current: { time: at / 1000, temperature_2m: 27, apparent_temperature: 31, relative_humidity_2m: 85, wind_speed_10m: 45, wind_direction_10m: 90, precipitation: 4, weather_code: 95, is_day: 1 },
    }, target, 'server', at), at);
    await page.route('**/api/live/weather?*', route => route.fulfill({ json: storm }));
    await page.goto('/app/live');
    const tile = page.getByRole('button', { name: /^Alerte météo : Orage, Dakar/ });
    await expect(tile).toBeVisible();
    await expect(tile).toHaveAccessibleName(/pas une alerte officielle/);
    await expect(tile.getByText('Orage', { exact: true })).toBeVisible();
  });

  test('météo indisponible : la tuile le dit sans inventer de relevé', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await radar(page, [article('a1')], { weatherOk: false });
    await page.goto('/app/live');
    await expect(page.getByRole('button', { name: /^Alerte météo : météo indisponible/ })).toBeVisible();
  });
});

test.describe('Météo et marchés repliables (UX-307)', () => {
  test('l’état replié ou déplié est mémorisé sur l’appareil', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await radar(page, [article('a1')]);
    await page.goto('/app/live');
    // Hydratation faite quand les dépêches s’affichent : avant, un clic serait perdu.
    await expect(stories(page).getByText('Titre a1')).toBeVisible();
    await expect(page.locator('#weather-country-select')).toBeVisible();

    await page.getByRole('button', { name: 'Replier la météo' }).click();
    await expect(page.locator('#weather-country-select')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Déplier la météo' })).toHaveAttribute('aria-expanded', 'false');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('al_radar_weather_open'))).toBe('false');

    await page.getByText('Marchés et événements', { exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Périmètre du bandeau' })).toBeVisible();
    // L'événement « toggle » d'un <details> arrive après le changement d'état : attente active.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('al_radar_markets_open'))).toBe('true');

    await page.reload();
    await expect(page.getByRole('button', { name: 'Déplier la météo' })).toBeVisible();
    await expect(page.locator('#weather-country-select')).toBeHidden();
    await expect(page.getByRole('combobox', { name: 'Périmètre du bandeau' })).toBeVisible();

    await page.getByRole('button', { name: 'Déplier la météo' }).click();
    await expect(page.locator('#weather-country-select')).toBeVisible();
  });

  test('replié, le bloc météo garde une ligne de résumé lisible', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('al_radar_weather_open', 'false'));
    await radar(page, [article('a1')]);
    await page.goto('/app/live');
    await expect(page.locator('#radar-meteo').getByText(/^24 °C, /)).toBeVisible();
  });
});

test.describe('Arrivées en douceur (UX-308)', () => {
  test('une dépêche qui arrive seule attend derrière la pastille, sans bouger la liste', async ({ page }) => {
    await page.clock.install({ time: new Date() });
    await page.setViewportSize({ width: 390, height: 844 });
    const initial = [article('a1', { publishedAt: minutesAgo(5) }), article('a2', { sourceName: 'Autre', publishedAt: minutesAgo(15) })];
    await radar(page, initial);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre a1')).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle/ })).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 120));
    const before = await page.evaluate(() => window.scrollY);
    await page.route('**/api/live/rss', route => route.fulfill({ json: rss([article('neuve', { sourceName: 'Dernière heure', publishedAt: minutesAgo(1) }), ...initial]) }));
    await page.clock.fastForward(5 * 60_000 + 1000);
    const pill = page.getByRole('button', { name: /^1 nouvelle$/ });
    await expect(pill).toBeVisible();
    await expect(page.getByText('Titre neuve')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);

    await pill.click();
    await expect(stories(page).getByText('Titre neuve')).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle/ })).toHaveCount(0);
  });

  test('« Actualiser » est un geste volontaire : sa réponse s’affiche aussitôt, sans pastille', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await radar(page, [article('a1')]);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre a1')).toBeVisible();
    await page.route('**/api/live/rss', route => route.fulfill({ json: rss([article('b1', { publishedAt: minutesAgo(1), sourceName: 'Dernière heure' }), article('a1')]) }));
    await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
    await expect(stories(page).getByText('Titre b1')).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle/ })).toHaveCount(0);
  });

  test('changer de pays réaffiche tout, même ce qui attendait', async ({ page }) => {
    await page.clock.install({ time: new Date() });
    await page.setViewportSize({ width: 390, height: 844 });
    const initial = [article('a1', { publishedAt: minutesAgo(5) })];
    await radar(page, initial);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Titre a1')).toBeVisible();
    await page.route('**/api/live/rss', route => route.fulfill({ json: rss([article('neuve', { sourceName: 'Dernière heure', publishedAt: minutesAgo(1) }), ...initial]) }));
    await page.clock.fastForward(5 * 60_000 + 1000);
    await expect(page.getByRole('button', { name: /^1 nouvelle$/ })).toBeVisible();
    await selectCountry(page, 'SN');
    await expect(page.getByText('Titre neuve')).toBeVisible();
    await expect(page.getByRole('button', { name: /nouvelle/ })).toHaveCount(0);
  });
});

test.describe('Regarder le direct du pays (UX-306)', () => {
  const sn = FIXTURE_CHANNELS.filter(channel => channel.countryCode === 'SN');
  async function liveSetup(page: Page, channels = sn) {
    await mockVlc(page);
    await serveVideo(page);
    await mockResolutions(page);
    await radar(page, [
      article('lead', { publishedAt: minutesAgo(3) }), article('suite', { sourceName: 'Autre', publishedAt: minutesAgo(30) }), article('trois', { sourceName: 'Troisième', publishedAt: minutesAgo(40) }),
      article('r1', { sourceName: 'Quatrième', publishedAt: minutesAgo(50) }), article('r2', { sourceName: 'Cinquième', publishedAt: minutesAgo(60) }),
    ]);
    await page.route('**/api/live/channels?country=*', route => route.fulfill({ json: { channels, total: channels.length, canPlay: true } }));
  }

  test('depuis la une : le pays est choisi, la modale s’ouvre sur une chaîne du navigateur, le zapping marche, la page reste', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await liveSetup(page);
    await page.goto('/app/live');
    await stories(page).getByRole('button', { name: /^Regarder le direct du pays/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/country=SN/);
    await expect(page.locator('#inline-player-title').filter({ hasText: 'Alpha Sénégal' })).toBeVisible();
    await expect.poll(() => dialog.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await dialog.getByRole('button', { name: 'Chaîne suivante' }).click();
    await expect(page.locator('#inline-player-title').filter({ hasText: 'Beta Sénégal' })).toBeVisible();
    await expect.poll(() => dialog.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    // Le Radar est toujours là, la chaîne regardée rejoint « Reprendre » de la TV.
    await expect(page.getByRole('heading', { name: 'Radar Afrique' })).toBeVisible();
    const recent = await page.evaluate(() => JSON.parse(localStorage.getItem('al_recent_channels') ?? '[]').map((item: { name: string }) => item.name));
    expect(recent[0]).toBe('Beta Sénégal');
  });

  test('depuis une ligne du fil : bouton « Direct » du pays de la dépêche', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await liveSetup(page);
    await page.goto('/app/live');
    const feed = page.getByRole('article', { name: 'Fil et chaînes du pays' });
    await feed.getByRole('button', { name: 'Regarder le direct : Sénégal' }).first().click();
    await expect(page.locator('#inline-player-title').filter({ hasText: 'Alpha Sénégal' })).toBeVisible();
  });

  test('depuis la liste des chaînes du pays', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await liveSetup(page);
    await page.goto('/app/live?country=SN');
    await page.getByRole('tab', { name: /Chaînes TV/ }).click();
    await page.getByRole('button', { name: 'Regarder Gamma Sénégal', exact: true }).click();
    await expect(page.locator('#inline-player-title').filter({ hasText: 'Gamma Sénégal' })).toBeVisible();
  });

  test('un pays sans chaîne à lancer : message clair, pas de lecteur vide', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await liveSetup(page, []);
    await page.goto('/app/live');
    await stories(page).getByRole('button', { name: /^Regarder le direct du pays/ }).click();
    await expect(page.getByText('Aucune chaîne à lancer pour Sénégal pour le moment.')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Voir les chaînes', exact: true }).click();
    await expect(page.getByRole('tab', { name: /Chaînes TV/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Aucune chaîne à lancer')).toHaveCount(0);
  });
});

test.describe('Carte (UX-305)', () => {
  test('fond sombre par défaut : aucun serveur de tuiles tiers ; le satellite est un choix', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    const hosts: string[] = [];
    page.on('request', request => { const url = new URL(request.url()); if (/arcgisonline|openfreemap|openstreetmap/.test(url.hostname)) hosts.push(url.hostname); });
    const own: string[] = [];
    page.on('response', response => { if (response.url().endsWith('/maps/africa-countries.json')) own.push(`${response.status()} ${response.headers()['content-type']}`); });
    await radar(page, [article('a1')]);
    await page.goto('/app/live');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sombre', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => own.length).toBeGreaterThan(0);
    expect(own[0]).toMatch(/^200 application\/json/);
    expect(hosts).toEqual([]);

    await page.getByRole('button', { name: 'Satellite', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Satellite', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => hosts.some(host => host.includes('arcgisonline'))).toBe(true);
    await page.getByRole('button', { name: 'Sombre', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sombre', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  });

  test('la pulsation suit l’activité des 24 h et s’éteint en mode Éco data', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    const busy = Array.from({ length: 9 }, (_, index) => article(`s${index}`, { sourceName: `Rédaction ${index}`, publishedAt: minutesAgo(index + 1) }));
    await radar(page, [...busy, article('ci1', { countryCode: 'CI', sourceName: 'Ecofin' })]);
    await page.goto('/app/live');
    const senegal = page.locator('.tactical-radar-marker').filter({ hasText: 'Sénégal' });
    await expect(senegal.locator('.radar-pulse-3')).toHaveCount(1);
    await expect(senegal.locator('.radar-pulse-3')).toBeVisible();
    // Côte d’Ivoire : une seule dépêche, aucun anneau qui pulse.
    await expect(page.locator('.tactical-radar-marker').filter({ hasText: 'Côte d’Ivoire' }).locator('.radar-pulse')).toHaveCount(0);

    await page.getByRole('button', { name: 'Mode Éco data', exact: true }).click();
    await expect(senegal.locator('.radar-pulse-3')).toBeHidden();
  });
});

for (const width of [320, 360, 768, 1366]) {
  test(`aucun débordement horizontal ni texte sous 12 px à ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await imageHost(page);
    await radar(page, [
      article('long', { title: 'Un titre exceptionnellement long pour vérifier que rien ne déborde sur un petit écran même avec des mots interminablesinterminablesinterminables', sourceName: 'Rédaction au nom très très long pour un mobile', publishedAt: minutesAgo(2), imageUrl: `${IMAGE_HOST}/x.png` }),
      article('b', { sourceName: 'APS (Sénégal)', publishedAt: minutesAgo(8) }),
      article('c', { sourceName: 'RFI Afrique', editorialScope: 'international', countryCode: null, publishedAt: minutesAgo(14) }),
      article('d', { sourceName: 'Ecofin', countryCode: 'CI', publishedAt: minutesAgo(20) }),
    ]);
    await page.goto('/app/live');
    await expect(stories(page).getByText('Un titre exceptionnellement long', { exact: false })).toBeVisible();
    if (width < 1280) await page.getByRole('button', { name: 'Afficher la carte', exact: true }).click();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await page.getByText('Marchés et événements', { exact: true }).click();
    const report = await page.evaluate(() => {
      const tiny = Array.from(document.querySelectorAll('body *')).filter(el => Array.from(el.childNodes).some(node => node.nodeType === 3 && node.textContent!.trim()) && parseFloat(getComputedStyle(el).fontSize) < 12 && !el.closest('.maplibregl-map, script, style')).map(el => (el.textContent ?? '').trim().slice(0, 30));
      return { overflow: document.documentElement.scrollWidth > window.innerWidth, tiny };
    });
    expect(report.overflow).toBe(false);
    expect(report.tiny).toEqual([]);
  });
}
