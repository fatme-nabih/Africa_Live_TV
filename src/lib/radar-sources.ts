import { radarSource } from './radar-data';
import { sourcePlaceholder, type RadarSourceRow } from './radar-workspace';
import type { LiveChannelsSummarySnapshot } from './live-channels-types';
import type { LiveWeatherSnapshot } from './live-weather-types';
import type { RadarRssSnapshot } from './rss-collector-types';

/** Lignes du tableau des sources : dépêches, météo, catalogue TV et bandeau. */
export function buildRadarSourceRows(input: {
  rss: RadarRssSnapshot | null;
  newsError: string | null;
  weather: LiveWeatherSnapshot | null;
  weatherError: string | null;
  weatherCode: string;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  summaryError: boolean;
  tickerSources: RadarSourceRow[];
}): RadarSourceRow[] {
  const { rss, newsError, weather, weatherError, weatherCode, channelsSummary, summaryError, tickerSources } = input;
  return [
    ...(rss?.availability ?? (rss
      ? [radarSource('Dépêches', 'Afrique · rédactions', Date.parse(rss.updatedAt), 5 * 60_000, rss.articles.length, { status: rss.stale ? 'stale' : undefined })]
      : [sourcePlaceholder('Dépêches', 'Afrique · rédactions', newsError ? 'unavailable' : 'loading')])),
    ...(weather?.availability ?? [sourcePlaceholder('Open-Meteo', weatherCode, weatherError ? 'unavailable' : 'loading')]),
    channelsSummary
      ? radarSource('Catalogue TV', 'Afrique · références et candidates', Date.parse(channelsSummary.updatedAt), 10 * 60_000, channelsSummary.totalChannels, {
          status: summaryError || channelsSummary.stale ? 'stale' : undefined,
          dataAt: channelsSummary.updatedAt,
        })
      : sourcePlaceholder('Catalogue TV', 'Afrique', summaryError ? 'unavailable' : 'loading'),
    ...(tickerSources.length ? tickerSources : [sourcePlaceholder('Marchés et événements', 'Cotations et événements', 'loading')]),
  ];
}
