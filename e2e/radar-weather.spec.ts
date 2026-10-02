import { expect, test, type Page } from '@playwright/test';
import { fixtureRadar, weatherFixture } from './helpers/radar-fixture';
import { resolveWeatherTarget } from '../src/lib/weather-locations';
import { normalizeWttr } from '../src/lib/weather-adapters';
import { makeWeatherSnapshot } from '../src/lib/weather-contract';

const AT = Date.parse('2026-10-01T17:30:00Z');
async function setup(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: new Date(AT) });
  await fixtureRadar(page, { weatherOk: true, asOf: new Date(AT).toISOString() });
}
function widget(page: Page) { return page.locator('article').filter({ has: page.locator('#weather-country-select') }); }
function upstream(code = 'SN') {
  const target = resolveWeatherTarget({ code });
  return { latitude: target.latitude, longitude: target.longitude, timezone: 'Africa/Dakar',
    current_units: { time: 'unixtime', temperature_2m: '°C', apparent_temperature: '°C', relative_humidity_2m: '%', wind_speed_10m: 'km/h', wind_direction_10m: '°', precipitation: 'mm' },
    current: { time: AT / 1000, temperature_2m: 29, apparent_temperature: 30, relative_humidity_2m: 50,
      wind_speed_10m: 0, wind_direction_10m: 0, precipitation: 0, weather_code: 0, is_day: 1 } };
}

test('RW-004/RW-005 : wttr.in partiel garde sa provenance et ses inconnues dans le widget et la table', async ({ page }) => {
  await setup(page);
  const snapshot = makeWeatherSnapshot(normalizeWttr({ current_condition: [{ temp_C: '-2', FeelsLikeC: '-3',
    humidity: '50', windspeedKmph: '0', winddirDegree: '0', precipMM: '0', weatherCode: '999', observation_time: '05:30 PM' }] },
    resolveWeatherTarget({ code: 'SN' }), AT), AT);
  await page.route('**/api/live/weather?*', route => route.fulfill({ json: snapshot }));
  await page.goto('/app/live?country=SN');
  await expect(widget(page).getByText('-2°C', { exact: true })).toBeVisible();
  await expect(widget(page).getByText('Observation · wttr.in · serveur')).toBeVisible();
  await expect(widget(page).getByText('Condition inconnue', { exact: true })).toBeVisible();
  await expect(widget(page).getByText(/Date d’observation inconnue/)).toBeVisible();
  const panel = page.getByRole('region', { name: 'Disponibilité des sources' });
  await panel.getByText('Disponibilité et fraîcheur par source', { exact: true }).click();
  await expect(panel.getByRole('row').filter({ hasText: 'wttr.in' }).getByText('données partielles', { exact: true })).toBeVisible();
  await expect(panel.getByRole('row').filter({ hasText: 'Open-Meteo' })).toHaveCount(0);
});

test('RW-003 navigateur : secours autorisé mais payload vide ne crée aucune mesure', async ({ page }) => {
  await setup(page); let direct = 0;
  await page.route('**/api/live/weather?*', route => route.fulfill({ status: 503, json: { error: 'Panne', code: 'LIVE_WEATHER_UNAVAILABLE' } }));
  await page.route('https://api.open-meteo.com/**', route => { direct++; return route.fulfill({ json: { ...upstream(), current: {} } }); });
  await page.goto('/app/live?country=SN');
  await expect(widget(page).getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible();
  await expect(widget(page).getByText('0°C', { exact: true })).toHaveCount(0);
  await expect(widget(page).getByText('Ciel dégagé', { exact: true })).toHaveCount(0);
  await expect(widget(page).getByText('Réponse météo invalide. Réessayez plus tard.', { exact: true })).toBeVisible();
  expect(direct).toBe(1);
});

for (const item of [
  { label: '401 session', status: 401, code: 'AUTHENTICATION_REQUIRED' },
  { label: '403 abonnement', status: 403, code: 'SUBSCRIPTION_REQUIRED' },
  { label: '403 suspension', status: 403, code: 'USER_SUSPENDED' },
  { label: '429 quota', status: 429, code: 'RATE_LIMIT_EXCEEDED' },
  { label: '500 interne', status: 500, code: 'INTERNAL_ERROR' },
  { label: '503 générique', status: 503, code: 'OTHER' },
  { label: 'HTML', status: 503, code: 'html' },
  { label: 'JSON cassé', status: 503, code: 'broken' },
  { label: 'redirection', status: 302, code: 'redirect' },
  { label: 'réseau', status: 0, code: 'network' },
]) test(`RW-001 navigateur : zéro secours après ${item.label}`, async ({ page }) => {
  await setup(page);
  let direct = 0, calls = 0;
  await page.route('https://api.open-meteo.com/**', route => { direct++; return route.fulfill({ json: upstream() }); });
  await page.route('**/api/live/weather?*', route => {
    calls++;
    if (item.status === 0) return route.abort();
    if (item.code === 'redirect') return route.fulfill({ status: 302, headers: { location: '/sign-in' } });
    if (item.code === 'html' || item.code === 'broken') return route.fulfill({ status: item.status, contentType: item.code === 'html' ? 'text/html' : 'application/json', body: item.code === 'html' ? '<html/>' : '{' });
    return route.fulfill({ status: item.status, headers: { 'Retry-After': '120' }, json: { error: 'Refus', code: item.code } });
  });
  await page.goto('/app/live?country=SN');
  await expect(widget(page).getByText(/session a expiré|compte ne permet|Trop de demandes|indisponibles|non reconnue|JSON|Failed to fetch/i).first()).toBeVisible();
  await expect(widget(page).getByLabel('Chargement de la météo')).toHaveCount(0);
  await expect(widget(page).getByRole('button', { name: 'Dakar SN', exact: true })).toBeVisible();
  expect(direct).toBe(0);
  if (item.status === 429) {
    const initialCalls = calls;
    await widget(page).getByRole('button', { name: /Réessayer après/ }).click();
    await page.clock.fastForward(119_000);
    expect(calls).toBe(initialCalls); expect(direct).toBe(0);
    await page.clock.fastForward(2_000);
    await widget(page).getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect.poll(() => calls).toBe(initialCalls + 1);
  }
});

test('RW-001/RW-005 : seul 503 autorisé → Open-Meteo navigateur et disponibilité cohérente', async ({ page }) => {
  await setup(page); let direct = 0;
  await page.route('**/api/live/weather?*', route => route.fulfill({ status: 503, json: { error: 'Panne fournisseurs', code: 'LIVE_WEATHER_UNAVAILABLE' } }));
  await page.route('https://api.open-meteo.com/**', route => { direct++; return route.fulfill({ json: upstream() }); });
  await page.goto('/app/live?country=SN');
  await expect(widget(page).getByText('29°C', { exact: true })).toBeVisible();
  await expect(widget(page).getByText('Observation · Open-Meteo · navigateur')).toBeVisible();
  const panel = page.getByRole('region', { name: 'Disponibilité des sources' });
  await panel.getByText('Disponibilité et fraîcheur par source', { exact: true }).click();
  await expect(panel.getByRole('row').filter({ hasText: 'Open-Meteo' }).getByText('disponible', { exact: true })).toBeVisible();
  expect(direct).toBe(1);
});

for (const stage of ['internal', 'direct']) test(`RW-001/RW-006 : échéance ${stage === 'internal' ? '20 s interne' : '8 s secours'} couvre le chargement`, async ({ page }) => {
  await setup(page); let started = false, direct = 0;
  await page.route('**/api/live/weather?*', route => {
    if (stage === 'direct') return route.fulfill({ status: 503, json: { error: 'Panne', code: 'LIVE_WEATHER_UNAVAILABLE' } });
    started = true;
    return Promise.resolve(); // Deliberately leave request unanswered.
  });
  await page.route('https://api.open-meteo.com/**', () => { direct++; started = true; });
  await page.goto('/app/live?country=SN');
  await expect.poll(() => started).toBe(true);
  await page.clock.fastForward(stage === 'internal' ? 20_001 : 8_001);
  await expect(widget(page).getByLabel('Chargement de la météo')).toHaveCount(0);
  await expect(widget(page).getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible();
  expect(direct).toBe(stage === 'internal' ? 0 : 1);
});

test('RW-006 : un refus après succès vide toute mesure conservée', async ({ page }) => {
  await setup(page); let refused = false, direct = 0;
  await page.route('https://api.open-meteo.com/**', route => { direct++; return route.abort(); });
  await page.route('**/api/live/weather?*', route => refused
    ? route.fulfill({ status: 403, json: { error: 'Abonnement requis', code: 'SUBSCRIPTION_REQUIRED' } })
    : route.fulfill({ json: weatherFixture('SN', AT) }));
  await page.goto('/app/live?country=SN'); await expect(widget(page).getByText('24°C')).toBeVisible();
  refused = true; await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(widget(page).getByText('24°C')).toHaveCount(0);
  await expect(widget(page).getByText(/Votre compte ne permet/)).toBeVisible(); expect(direct).toBe(0);
});

test('RW-006 : erreur/finally SN tardifs, actualisation, panne et reprise ne remplacent jamais CI', async ({ page }) => {
  await setup(page); let snStarted = false, failCI = false, calls = 0;
  await page.route('**/api/live/weather?*', async route => {
    calls++;
    const code = new URL(route.request().url()).searchParams.get('code')!;
    if (code === 'SN') { snStarted = true; await new Promise(resolve => setTimeout(resolve, 800)); await route.abort(); return; }
    await route.fulfill(failCI ? { status: 500, json: { error: 'Panne' } } : { json: weatherFixture(code, AT) });
  });
  await page.goto('/app/live?country=SN'); await expect.poll(() => snStarted).toBe(true);
  await widget(page).getByRole('combobox').selectOption('CI');
  await expect(widget(page).getByText('24°C')).toBeVisible();
  await page.waitForTimeout(900);
  await expect(widget(page).getByText('Abidjan', { exact: true }).last()).toBeVisible();
  await expect(widget(page).getByRole('button', { name: 'Réessayer', exact: true })).toHaveCount(0);
  failCI = true; await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(widget(page).getByText(/Relevé conservé jusqu’à expiration/)).toBeVisible();
  await expect(widget(page).getByText('24°C')).toBeVisible();
  failCI = false; await page.getByRole('button', { name: 'Actualiser', exact: true }).click();
  await expect(widget(page).getByText(/Relevé conservé jusqu’à expiration/)).toHaveCount(0);
  await page.goto('/app'); await expect(page.locator('#weather-country-select')).toHaveCount(0); const before = calls; await page.clock.fastForward(16 * 60_000); expect(calls).toBe(before);
});

test('RW-006 : périodique sans chevauchement et arrêt du relevé à 60 min sans réponse réseau', async ({ page }) => {
  await setup(page); let calls = 0, pending = false;
  await page.route('**/api/live/weather?*', route => {
    calls++;
    if (!pending) return route.fulfill({ json: weatherFixture('SN', AT) });
  });
  await page.goto('/app/live?country=SN'); await expect(widget(page).getByText('24°C')).toBeVisible();
  pending = true; const initialCalls = calls;
  await page.clock.fastForward(15 * 60_000); await expect.poll(() => calls).toBe(initialCalls + 1);
  await page.clock.fastForward(20_001);
  await expect(widget(page).getByText(/Relevé conservé/).first()).toBeVisible();
  await page.clock.fastForward(45 * 60_000);
  await expect(widget(page).getByText('24°C')).toHaveCount(0);
  await expect(widget(page).getByRole('button', { name: 'Dakar SN', exact: true })).toBeVisible();
});
