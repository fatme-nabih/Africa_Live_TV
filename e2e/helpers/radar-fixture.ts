import type { Page } from '@playwright/test';

export async function fixtureRadar(page: Page, options: { rssFails?: boolean; weatherOk?: boolean; allFail?: boolean; asOf?: string } = {}) {
  const now = options.asOf ?? new Date().toISOString();
  const source = { provider: 'GDELT', scope: 'Afrique', status: 'available', fetchedAt: now, lastSuccessAt: now, dataAt: now, cacheExpiresAt: new Date(Date.parse(now) + 5 * 60_000).toISOString(), count: 1 };
  await page.route('**/api/live/**', async route => {
    const url = new URL(route.request().url());
    const api = url.pathname.split('/').pop();
    const article = { title: 'Dépêche Sénégal récente', url: 'https://example.org/current', domain: 'example.org', indexedAt: now, countryCode: 'SN' };
    const rssArticle = { id: 'fixture', title: 'Économie Côte d’Ivoire', url: 'https://example.org/eco', domain: 'example.org', sourceName: 'Agence Ecofin', category: 'Économie', publishedAt: now, countryCode: 'CI' };
    const alert = { id: 'same', title: 'Économie africaine du bandeau', url: 'https://example.org/alert', timestamp: now, type: 'news', severity: 'info', scope: 'Africa', source: 'Ecofin', dateKind: 'publication', countryCode: 'SN' };
    const body = api === 'news' ? { articles: [article, { ...article, url: article.url + '?utm_source=duplicate' }, { ...article, title: 'Ancienne dépêche exclue', url: 'https://example.org/old', indexedAt: new Date(Date.now() - 25 * 3600_000).toISOString() }, { ...article, title: 'Future dépêche exclue', url: 'https://example.org/future', indexedAt: new Date(Date.now() + 3600_000).toISOString() }], undatedArticles: [{ ...article, title: 'Dépêche sans date', url: 'https://example.org/unknown', indexedAt: '' }], countries: [], updatedAt: now, availability: [source] }
      : api === 'rss' ? { articles: [rssArticle, rssArticle], sources: [], updatedAt: now, availability: [{ ...source, provider: 'Ecofin' }] }
      : api === 'channels' ? url.searchParams.has('country') ? { channels: [], total: 0, canPlay: true } : { countries: { SN: { countryCode: 'SN', channelCount: 3, directWebCount: 1, directVlcCount: 2 } }, totalChannels: 3, totalDirectWeb: 1, totalDirectVlc: 2, updatedAt: now }
      : api === 'markets' ? { commodities: [], forex: [], alerts: [alert, alert, { ...alert, id: 'world', title: 'Événement mondial', url: 'https://example.org/world', scope: 'World' }], updatedAt: now, disclaimer: '', availability: [source] }
      : api === 'events' || api === 'firms' ? { type: 'FeatureCollection', features: [], metadata: { updatedAt: now, stale: false } }
      : api === 'weather' && options.weatherOk ? { current: { countryCode: url.searchParams.get('code') ?? 'SN', countryName: url.searchParams.get('code') === 'CI' ? 'Côte d’Ivoire' : 'Sénégal', locationName: url.searchParams.get('code') === 'CI' ? 'Abidjan' : 'Dakar', region: 'Afrique de l’Ouest', latitude: 14, longitude: -17, timezone: 'Africa/Dakar', temperatureC: 24, apparentTemperatureC: 25, relativeHumidityPercent: 50, windSpeedKmh: 10, windDirectionCompass: 'N', weatherCode: 0, weatherIcon: 'clear', weatherDescription: 'Ciel dégagé', isDay: true, precipitationMm: 0, observedAt: now, fetchedAt: now, source: 'Open-Meteo', attribution: 'Open-Meteo', stale: false }, quickLocations: [], availability: [{ ...source, provider: 'Open-Meteo' }], fetchedAt: now, stale: false }
      : { error: 'Source indisponible' };
    await route.fulfill({ status: options.allFail || (api === 'weather' && !options.weatherOk) || (api === 'rss' && options.rssFails) ? 503 : 200, json: body });
  });
  await page.route('**/ArcGIS/rest/services/**/MapServer/tile/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQUJL6DwAB/gFUnxzu9QAAAABJRU5ErkJggg==', 'base64') }));
}
