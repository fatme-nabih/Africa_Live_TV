import { ServiceUnavailableError } from '@/lib/api-errors';
import { canonicalArticleUrl, radarSource, temporalWindow, type RadarSourceState } from './radar-data';
import { fetchSingleFeed } from './rss-collector';
import type { FeedConfig } from './rss-collector-types';
import { africanMentions, inferWorldRegion, type WorldArticle, type WorldRegion, type WorldSnapshot } from './world-desk-data';

/**
 * Collecteur de « Regards sur le monde », séparé du fil africain : ses dépêches ne prennent jamais la place
 * des rédactions africaines dans « À la une ». Titres et liens seulement, sans image (faible consommation de données).
 * Flux vérifiés un par un le 11/10/2026 (réponse 200, RSS valide, articles présents).
 */
type WorldFeed = FeedConfig & { region: WorldRegion | null; origin: string };
const feed = (id: string, name: string, domain: string, url: string, region: WorldRegion | null, origin: string): WorldFeed =>
  ({ id, name, domain, url, region, origin, defaultCountry: null, editorialScope: 'international', category: 'International', enabled: true });

export const WORLD_FEEDS: WorldFeed[] = [
  feed('f24-europe', 'France 24', 'france24.com', 'https://www.france24.com/fr/europe/rss', 'europe', 'France'),
  feed('f24-ameriques', 'France 24', 'france24.com', 'https://www.france24.com/fr/am%C3%A9riques/rss', 'ameriques', 'France'),
  feed('f24-moyen-orient', 'France 24', 'france24.com', 'https://www.france24.com/fr/moyen-orient/rss', 'moyen-orient', 'France'),
  feed('f24-asie', 'France 24', 'france24.com', 'https://www.france24.com/fr/asie-pacifique/rss', 'asie-pacifique', 'France'),
  feed('rfi-europe', 'RFI', 'rfi.fr', 'https://www.rfi.fr/fr/europe/rss', 'europe', 'France'),
  feed('rfi-ameriques', 'RFI', 'rfi.fr', 'https://www.rfi.fr/fr/am%C3%A9riques/rss', 'ameriques', 'France'),
  feed('rfi-moyen-orient', 'RFI', 'rfi.fr', 'https://www.rfi.fr/fr/moyen-orient/rss', 'moyen-orient', 'France'),
  feed('rfi-asie', 'RFI', 'rfi.fr', 'https://www.rfi.fr/fr/asie-pacifique/rss', 'asie-pacifique', 'France'),
  feed('lemonde-europe', 'Le Monde', 'lemonde.fr', 'https://www.lemonde.fr/europe/rss_full.xml', 'europe', 'France'),
  feed('lemonde-ameriques', 'Le Monde', 'lemonde.fr', 'https://www.lemonde.fr/ameriques/rss_full.xml', 'ameriques', 'France'),
  feed('lemonde-proche-orient', 'Le Monde', 'lemonde.fr', 'https://www.lemonde.fr/proche-orient/rss_full.xml', 'moyen-orient', 'France'),
  feed('lemonde-asie', 'Le Monde', 'lemonde.fr', 'https://www.lemonde.fr/asie-pacifique/rss_full.xml', 'asie-pacifique', 'France'),
  // Flux généralistes d'autres regards : région déduite du titre, sinon gardés seulement s'ils parlent de l'Afrique.
  feed('radio-canada', 'Radio-Canada', 'ici.radio-canada.ca', 'https://ici.radio-canada.ca/rss/96', null, 'Canada'),
  feed('euronews', 'Euronews', 'fr.euronews.com', 'https://fr.euronews.com/rss?level=theme&name=news', null, 'Europe'),
  feed('courrier-international', 'Courrier international', 'courrierinternational.com', 'https://www.courrierinternational.com/feed/all/rss.xml', null, 'Presse mondiale traduite'),
];

const TTL_MS = 10 * 60_000;
const FEED_MAX_STALE_MS = 45 * 60_000;
const MAX_ARTICLES = 240;
let cache: { snapshot: WorldSnapshot; expiresAt: number } | null = null;
let inFlight: Promise<WorldSnapshot> | null = null;
const feedCache = new Map<string, { articles: WorldArticle[]; savedAt: number }>();

export function clearWorldCacheForTesting() { cache = null; inFlight = null; feedCache.clear(); }

async function readFeed(source: WorldFeed): Promise<WorldArticle[]> {
  const articles = await fetchSingleFeed(source);
  return articles.flatMap(article => {
    const region = source.region ?? inferWorldRegion(article.title);
    const africa = africanMentions(article.title);
    if (!region && !africa.touchesAfrica) return [];
    return [{ id: article.id, title: article.title, url: article.url, sourceName: source.name, origin: source.origin, publishedAt: article.publishedAt,
      region, regionBasis: source.region ? 'source' : 'inferred', africanCountries: africa.countries, touchesAfrica: africa.touchesAfrica } satisfies WorldArticle];
  });
}

async function collect(): Promise<WorldSnapshot> {
  const now = Date.now();
  const settled = await Promise.allSettled(WORLD_FEEDS.map(readFeed));
  const all: WorldArticle[] = [], availability: RadarSourceState[] = [];
  WORLD_FEEDS.forEach((source, index) => {
    const outcome = settled[index], scope = 'Monde · ' + (source.region ?? 'généraliste');
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
  cache = { snapshot, expiresAt: now + TTL_MS };
  return snapshot;
}

export async function getWorldDesk(options: { forceRefresh?: boolean } = {}): Promise<WorldSnapshot> {
  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) return cache.snapshot;
  inFlight ??= collect().finally(() => { inFlight = null; });
  try { return await inFlight; } catch {
    throw new ServiceUnavailableError('Les rédactions internationales sont momentanément injoignables.', 'LIVE_WORLD_UNAVAILABLE');
  }
}
