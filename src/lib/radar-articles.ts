import { canonicalArticleUrl } from './radar-data';
import type { RadarArticle } from './live-osint-types';
import type { RadarRssSnapshot } from './rss-collector-types';

export type ScopeTab = 'all' | 'africa' | 'international';
export type ScopeCounts = { all: number; africa: number; international: number };

/** Dépêches du flux (datées puis sans date) au format commun du Radar. */
export function radarArticlesFromRss(rss: RadarRssSnapshot | null): RadarArticle[] {
  return [...(rss?.articles ?? []), ...(rss?.undatedArticles ?? [])].map((article) => ({
    title: article.title,
    url: article.url,
    domain: article.domain,
    indexedAt: article.publishedAt ?? '',
    publishedAt: article.publishedAt,
    countryBasis: article.countryBasis ?? 'inferred_topic',
    countryCode: article.countryCode,
    sourceType: 'rss',
    sourceName: article.sourceName,
    category: article.category,
    editorialScope: article.editorialScope,
    ...(article.imageUrl ? { imageUrl: article.imageUrl } : {}),
  }));
}

/** Retire les doublons (même URL canonique) et trie de la plus récente à la plus ancienne. */
export function mergeRadarArticles(articles: RadarArticle[]): RadarArticle[] {
  const seen = new Set<string>();
  const merged: RadarArticle[] = [];
  for (const article of articles) {
    const key = canonicalArticleUrl(article.url);
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(article);
    }
  }
  return merged.sort((a, b) => (Date.parse(b.indexedAt) || 0) - (Date.parse(a.indexedAt) || 0));
}

export function isInternational(article: RadarArticle): boolean {
  return article.editorialScope === 'international';
}

export function filterByCountry(articles: RadarArticle[], country: string | null): RadarArticle[] {
  return articles.filter((article) => !country || article.countryCode === country);
}

export function filterByScope(articles: RadarArticle[], scope: ScopeTab): RadarArticle[] {
  if (scope === 'africa') return articles.filter((article) => !isInternational(article));
  if (scope === 'international') return articles.filter(isInternational);
  return articles;
}

export function scopeCounts(articles: RadarArticle[]): ScopeCounts {
  return {
    all: articles.length,
    africa: articles.filter((article) => !isInternational(article)).length,
    international: articles.filter(isInternational).length,
  };
}

/** Nombre de dépêches par pays (pour la carte). */
export function countByCountry(articles: RadarArticle[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const article of articles) {
    if (article.countryCode) counts.set(article.countryCode, (counts.get(article.countryCode) ?? 0) + 1);
  }
  return counts;
}
