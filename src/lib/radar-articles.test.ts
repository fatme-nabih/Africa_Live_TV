import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countByCountry,
  filterByCountry,
  filterByScope,
  mergeRadarArticles,
  radarArticlesFromRss,
  scopeCounts,
} from './radar-articles';
import { buildRadarSourceRows } from './radar-sources';
import type { RadarArticle } from './live-osint-types';
import type { RadarRssArticle, RadarRssSnapshot } from './rss-collector-types';

const rssArticle = (id: string, extra: Partial<RadarRssArticle> = {}): RadarRssArticle => ({
  id, title: `Dépêche ${id}`, url: `https://example.org/${id}`, domain: 'example.org', sourceName: 'APS (Sénégal)',
  sourceType: 'rss', publishedAt: '2026-10-03T08:00:00.000Z', countryCode: 'SN', editorialScope: 'africa', category: 'National', ...extra,
});
const snapshot = (articles: RadarRssArticle[], undatedArticles: RadarRssArticle[] = []): RadarRssSnapshot => ({
  articles, undatedArticles, sources: [], updatedAt: '2026-10-03T08:00:00.000Z', stale: false,
});
const article = (id: string, extra: Partial<RadarArticle> = {}): RadarArticle => ({
  title: id, url: `https://example.org/${id}`, domain: 'example.org', indexedAt: '2026-10-03T08:00:00.000Z', countryCode: 'SN', ...extra,
});

test('les dépêches datées puis sans date sont converties au format commun du Radar', () => {
  const converted = radarArticlesFromRss(snapshot([rssArticle('a')], [rssArticle('b', { publishedAt: null })]));
  assert.deepEqual(converted.map(item => item.title), ['Dépêche a', 'Dépêche b']);
  assert.equal(converted[1].indexedAt, '');
  assert.equal(converted[0].countryBasis, 'inferred_topic');
  assert.deepEqual(radarArticlesFromRss(null), []);
});

test('la fusion retire les doublons d’URL (suivi publicitaire ignoré) et trie du plus récent au plus ancien', () => {
  const merged = mergeRadarArticles([
    article('old', { indexedAt: '2026-10-03T06:00:00.000Z' }),
    article('new', { indexedAt: '2026-10-03T09:00:00.000Z' }),
    article('new', { url: 'https://example.org/new?utm_source=x', indexedAt: '2026-10-03T09:00:00.000Z' }),
    article('invalid', { url: 'javascript:alert(1)' }),
  ]);
  assert.deepEqual(merged.map(item => item.title), ['new', 'old']);
});

test('les filtres pays et rubrique restent indépendants et les compteurs additionnent Afrique et International', () => {
  const list = [
    article('sn-africa', { countryCode: 'SN', editorialScope: 'africa' }),
    article('sn-intl', { countryCode: 'SN', editorialScope: 'international' }),
    article('ci-intl', { countryCode: 'CI', editorialScope: 'international' }),
    article('ci-legacy', { countryCode: 'CI' }),
  ];
  assert.equal(filterByCountry(list, null).length, 4);
  assert.deepEqual(filterByCountry(list, 'SN').map(item => item.title), ['sn-africa', 'sn-intl']);
  assert.deepEqual(filterByScope(list, 'international').map(item => item.title), ['sn-intl', 'ci-intl']);
  assert.deepEqual(filterByScope(list, 'africa').map(item => item.title), ['sn-africa', 'ci-legacy']);
  const counts = scopeCounts(list);
  assert.deepEqual(counts, { all: 4, africa: 2, international: 2 });
  assert.equal(counts.africa + counts.international, counts.all);
  assert.deepEqual([...countByCountry(list)], [['SN', 2], ['CI', 2]]);
});

test('le tableau des sources garde un état de chargement par fournisseur tant que rien n’est arrivé', () => {
  const rows = buildRadarSourceRows({
    rss: null, newsError: null, weather: null, weatherError: null, weatherCode: 'SN',
    channelsSummary: null, summaryError: false, tickerSources: [],
  });
  assert.deepEqual(rows.map(row => [row.provider, row.status]), [
    ['Dépêches', 'loading'], ['Open-Meteo', 'loading'], ['Catalogue TV', 'loading'], ['Marchés et événements', 'loading'],
  ]);
  const failed = buildRadarSourceRows({
    rss: null, newsError: 'Flux RSS des rédactions indisponible', weather: null, weatherError: 'Panne', weatherCode: 'CI',
    channelsSummary: null, summaryError: true, tickerSources: [],
  });
  assert.deepEqual(failed.map(row => row.status), ['unavailable', 'unavailable', 'unavailable', 'loading']);
  assert.equal(failed[1].scope, 'CI');
});
