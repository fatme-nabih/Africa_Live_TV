import { makeWeatherSnapshot } from '../../src/lib/weather-contract';
import { normalizeOpenMeteo } from '../../src/lib/weather-adapters';
import { resolveWeatherTarget } from '../../src/lib/weather-locations';
import type { Page } from '@playwright/test';

export async function fixtureRadar(page: Page, options: { rssFails?: boolean; weatherOk?: boolean; allFail?: boolean; asOf?: string } = {}) {
  const now = options.asOf ?? new Date().toISOString();
  const source = { provider: 'RSS · rédactions', scope: 'Afrique', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(), count: 1 };
  await page.route('**/api/live/**', async route => {
    const url = new URL(route.request().url());
    const api = url.pathname.split('/').pop();
    const article = { id: 'sn-current', title: 'Dépêche Sénégal récente', url: 'https://example.org/current', domain: 'example.org',
      sourceName: 'APS (Sénégal)', sourceType: 'rss', publishedAt: now, countryCode: 'SN', category: 'National', editorialScope: 'africa', countryBasis: 'media' };
    const rssArticle = { ...article, id: 'ci-eco', title: 'Économie Côte d’Ivoire', url: 'https://example.org/eco', sourceName: 'Agence Ecofin', category: 'Économie', countryCode: 'CI', countryBasis: 'inferred_topic' };
    const alert = { id: 'same', title: 'Économie africaine du bandeau', url: 'https://example.org/alert', timestamp: now, type: 'news', severity: 'info', scope: 'Africa', source: 'Ecofin', dateKind: 'publication', countryCode: 'SN' };
    const body = api === 'rss' ? { articles: [rssArticle, article, { ...article, url: article.url + '?utm_source=duplicate' }, rssArticle,
      { ...article, id: 'old', title: 'Ancienne dépêche exclue', url: 'https://example.org/old', publishedAt: new Date(Date.parse(now) - 25 * 3600_000).toISOString() },
      { ...article, id: 'future', title: 'Future dépêche exclue', url: 'https://example.org/future', publishedAt: new Date(Date.parse(now) + 3600_000).toISOString() }],
      undatedArticles: [{ ...article, id: 'unknown', title: 'Dépêche sans date', url: 'https://example.org/unknown', publishedAt: null }], sources: [], updatedAt: now, availability: [source] }
      : api === 'channels' ? url.searchParams.has('country') ? { channels: [], total: 0, canPlay: true } : { countries: { SN: { countryCode: 'SN', channelCount: 3, directWebCount: 1, directVlcCount: 2 } }, totalChannels: 3, totalDirectWeb: 1, totalDirectVlc: 2, updatedAt: now }
      : api === 'markets' ? { commodities: [], forex: [], alerts: [alert, alert, { ...alert, id: 'world', title: 'Événement mondial', url: 'https://example.org/world', scope: 'World' }], updatedAt: now, disclaimer: '', availability: [{ ...source, provider: 'Marchés / bandeau' }] }
      : api === 'events' || api === 'firms' ? { type: 'FeatureCollection', features: [], metadata: { updatedAt: now, stale: false } }
      : api === 'weather' && options.weatherOk ? weatherFixture(url.searchParams.get('code') ?? 'SN', Date.parse(now))
      : { error: 'Source indisponible' };
    await route.fulfill({ status: options.allFail || (api === 'weather' && !options.weatherOk) || (api === 'rss' && options.rssFails) ? 503 : 200, json: body });
  });
  await page.route('**/ArcGIS/rest/services/**/MapServer/tile/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQUJL6DwAB/gFUnxzu9QAAAABJRU5ErkJggg==', 'base64') }));
}

export function weatherFixture(code: string, at = Date.now()) {
  const target = resolveWeatherTarget({ code });
  return makeWeatherSnapshot(normalizeOpenMeteo({ latitude: target.latitude, longitude: target.longitude, timezone: 'Africa/Dakar',
    current_units: { time: 'unixtime', temperature_2m: '°C', apparent_temperature: '°C', relative_humidity_2m: '%', wind_speed_10m: 'km/h', wind_direction_10m: '°', precipitation: 'mm' },
    current: { time: at / 1000, temperature_2m: 24, apparent_temperature: 25, relative_humidity_2m: 50,
      wind_speed_10m: 10, wind_direction_10m: 0, weather_code: 0, is_day: 1, precipitation: 0 } }, target, 'server', at), at);
}
