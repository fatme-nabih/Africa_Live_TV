import { ServiceUnavailableError } from '@/lib/api-errors';
import { canonicalArticleUrl, radarSource, temporalWindow, type RadarSourceState } from './radar-data';
import type { Edition } from './editions';
import { WORLD_FEEDS_BY_EDITION } from './feeds';
import { WORLD_FR } from './feeds/world-fr';
import { settleFeeds } from './feed-concurrency';
import { worldFeedScope } from '@/i18n/feed-messages';
import { fetchSingleFeed, clearFeedHttpCacheForTesting } from './rss-collector';
import type { WorldFeed } from './feeds/types';
import { africanMentions, inferWorldRegion, type WorldArticle, type WorldSnapshot } from './world-desk-data';

/**
 * Collecteur de « Regards sur le monde », séparé du fil africain : ses dépêches ne prennent jamais la place
 * des rédactions africaines dans « À la une ». Titres et liens seulement, sans image (faible consommation de données).
 * Flux vérifiés un par un le 11/10/2026 (réponse 200, RSS valide, articles présents).
 */
export const WORLD_FEEDS = WORLD_FR;

const TTL_MS = 10 * 60_000;
const FEED_MAX_STALE_MS = 45 * 60_000;
const MAX_ARTICLES = 240;
const caches = new Map<Edition, { snapshot: WorldSnapshot; expiresAt: number }>();
const inFlight = new Map<Edition, Promise<WorldSnapshot>>();
const feedCache = new Map<string, { articles: WorldArticle[]; savedAt: number }>();

export function clearWorldCacheForTesting() { caches.clear(); inFlight.clear(); feedCache.clear(); clearFeedHttpCacheForTesting(Object.values(WORLD_FEEDS_BY_EDITION).flat().map(f => f.id)); }

async function readFeed(source: WorldFeed): Promise<WorldArticle[]> {
  const articles = await fetchSingleFeed(source);
  return articles.flatMap(article => {
    const region = source.region ?? inferWorldRegion(article.title, source.edition);
    const africa = africanMentions(article.title, source.edition);
    if (!region && !africa.touchesAfrica) return [];
    return [{ id: article.id, title: article.title, url: article.url, sourceName: source.name, origin: source.origin, publishedAt: article.publishedAt,
      region, regionBasis: source.region ? 'source' : 'inferred', africanCountries: africa.countries, touchesAfrica: africa.touchesAfrica } satisfies WorldArticle];
  });
}

async function collect(edition: Edition): Promise<WorldSnapshot> {
  const now = Date.now();
  const sources = WORLD_FEEDS_BY_EDITION[edition].filter(f => f.enabled);
  const settled = await settleFeeds(sources, readFeed);
  const all: WorldArticle[] = [], availability: RadarSourceState[] = [];
  sources.forEach((source, index) => {
    const outcome = settled[index], scope = worldFeedScope(edition, source.region);
    if (outcome.status === 'fulfilled') {
      all.push(...outcome.value);
      feedCache.set(source.id, { articles: outcome.value, savedAt: now });
      availability.push(radarSource(source.name, scope, now, TTL_MS, outcome.value.length, { dataAt: outcome.value.find(article => article.publishedAt)?.publishedAt }));
      return;
    }
    const cached = feedCache.get(source.id), reusable = cached && now - cached.savedAt <= FEED_MAX_STALE_MS;
    if (reusable) all.push(...cached.articles);
    availability.push(radarSource(source.name, scope, now, TTL_MS, reusable ? cached.articles.length : 0,
      { status: reusable ? 'stale' : 'unavailable', lastSuccessAt: cached ? new Date(cached.savedAt).toISOString() : null }));
  });
  if (availability.every(source => source.status === 'unavailable')) throw new Error('WORLD_FEEDS_UNAVAILABLE');
  // Un même article repris par deux rubriques : le premier flux (rubrique régionale) l'emporte.
  const seen = new Set<string>();
  const unique = all.filter(article => { const key = canonicalArticleUrl(article.url); if (!key || seen.has(key)) return false; seen.add(key); return true; });
  const snapshot = { articles: temporalWindow(unique, article => article.publishedAt, now).recent.slice(0, MAX_ARTICLES), updatedAt: new Date(now).toISOString(), availability };
  caches.set(edition, { snapshot, expiresAt: now + TTL_MS });
  return snapshot;
}

export async function getWorldDesk(options: { forceRefresh?: boolean; edition?: Edition } = {}): Promise<WorldSnapshot> {
  const edition = options.edition ?? 'fr', cache = caches.get(edition);
  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) return cache.snapshot;
  let promise = inFlight.get(edition);
  if (!promise) { promise = collect(edition).finally(() => { inFlight.delete(edition); }); inFlight.set(edition, promise); }
  try { return await promise; } catch {
    throw new ServiceUnavailableError('Les rédactions internationales sont momentanément injoignables.', 'LIVE_WORLD_UNAVAILABLE');
  }
}
