import { ServiceUnavailableError } from '@/lib/api-errors';
import { createHash } from 'node:crypto';
import { canonicalArticleUrl, radarSource, temporalWindow, type RadarSourceState } from './radar-data';
import type { Edition } from './editions';
import { countryCountsFromArticles, type EditionBridgeEntry } from './edition-bridge';
import { AFRICA_FEEDS } from './feeds';
import { AFRICA_FR } from './feeds/africa-fr';
import { settleFeeds } from './feed-concurrency';
import { parseFeedDate, clampFeedClockLead } from './feed-dates';
import { readBoundedText } from './feed-text';
import { feedMessages } from '@/i18n/feed-messages';
import { africanMentions } from './world-desk-data';
import { detectCountryCode } from './country-detector';
export { detectCountryCode } from './country-detector';
import { extractImageUrl } from './rss-image';
import type {
  FeedConfig,
  RadarRssArticle,
  RadarRssSnapshot,
  RssSourceMetric,
} from '@/lib/rss-collector-types';

export const RSS_FEEDS = AFRICA_FR;
export function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#(?:x[^;&]*|[^;&]*)|amp|quot|apos|lt|gt);/gi, (_, entity:string) => {
      const named: Record<string,string> = { amp:'&',quot:'"',apos:"'",lt:'<',gt:'>' };
      if (!entity.startsWith('#')) return named[entity.toLowerCase()];
      const hex = /^#x[0-9a-f]+$/i.test(entity), decimal = /^#\d+$/.test(entity);
      const code = hex ? parseInt(entity.slice(2),16) : decimal ? Number(entity.slice(1)) : NaN;
      // Invalid XML numeric values, zero and isolated surrogates become U+FFFD.
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '\uFFFD';
    })
    .replace(/\s+/g, ' ')
    .trim();
}


function xmlAttributes(tag: string) {
  const result: Record<string,string> = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) result[match[1].toLowerCase()] = decodeXmlEntities(match[3]);
  return result;
}
function xmlBase(tag: string, parent: string|null) {
  const declared = xmlAttributes(tag)['xml:base'];
  if (!declared) return parent;
  try { const value = new URL(declared,parent ?? undefined); return ['http:','https:'].includes(value.protocol) && !value.username && !value.password ? value.href : null; } catch { return null; }
}
function atomArticleLink(item: string, base: string|null) {
  const links = [...item.matchAll(/<link\b[^>]*\/?\s*>/gi)].map(match => ({ tag:match[0],attrs:xmlAttributes(match[0]) })).filter(({ attrs }) => (!attrs.rel || attrs.rel.toLowerCase() === 'alternate') && (!attrs.type || ['text/html','application/xhtml+xml'].includes(attrs.type.toLowerCase())) && attrs.href);
  links.sort((a,b) => Number(!a.attrs.type)-Number(!b.attrs.type));
  for (const { tag,attrs } of links) {
    try {
      const url = new URL(attrs.href,xmlBase(tag,base) ?? undefined);
      if (['http:','https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
    } catch { /* no usable document base: no invented URL */ }
  }
  return '';
}
function truncateTitle(value: string) {
  let result = '';
  for (const point of value) { if (result.length + point.length > 300) break; result += point; }
  return result;
}
export function parseFeedXml(xml: string, feed: FeedConfig, documentUrl = feed.url, collectedAt?: number): RadarRssArticle[] {
  const articles: RadarRssArticle[] = [];
  const isAtom = /<entry[\s\S]*?<\/entry>/i.test(xml);
  const feedBase = xmlBase(xml.match(/<feed\b[^>]*>/i)?.[0] ?? '',documentUrl);
  const itemMatches = isAtom
    ? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? []
    : xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const itemXml of itemMatches) {
    // 1. Title
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = truncateTitle(decodeXmlEntities(rawTitle));
    if (!title) continue;

    // 2. Link
    let rawLink = '';
    if (isAtom) {
      rawLink = atomArticleLink(itemXml,xmlBase(itemXml.match(/<entry\b[^>]*>/i)?.[0] ?? '',feedBase));
    } else {
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      rawLink = linkMatch ? linkMatch[1] : '';
    }
    const cleanLink = (isAtom ? rawLink : decodeXmlEntities(rawLink)).trim();
    let articleUrl: URL;
    try {
      articleUrl = new URL(cleanLink);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(articleUrl.protocol) || articleUrl.username || articleUrl.password) {
      continue;
    }

    const finalUrl = canonicalArticleUrl(articleUrl.toString());

    // 3. Date
    let dateStr: string | null = null;
    const pubDateMatch = itemXml.match(/<(pubDate|dc:date|published)[^>]*>([\s\S]*?)<\/\1>/i);
    if (pubDateMatch) {
      dateStr = decodeXmlEntities(pubDateMatch[2]);
    }
    const parsedDate = parseFeedDate(dateStr, feed);
    const publishedAt = collectedAt === undefined ? parsedDate : clampFeedClockLead(parsedDate, collectedAt);

    // 4. Category
    let category = feed.category;
    let topicCategory: string|null = null;
    const catMatch = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    if (catMatch) {
      const extractedCategory = decodeXmlEntities(catMatch[1]);
      if (extractedCategory && extractedCategory.length < 50) {
        category = extractedCategory;
        topicCategory = extractedCategory;
      }
    }

    // 5. Geolocation / Country code
    const inferredCountry = detectCountryCode(`${title} ${topicCategory ?? ''}`, null, feed.edition);
    const countryCode = inferredCountry ?? feed.defaultCountry;

    // 6. ID
    const id = `${feed.id}-${createHash('sha256').update(finalUrl).digest('hex')}`;
    const updatedMatch = itemXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
    const parsedUpdate = parseFeedDate(updatedMatch ? decodeXmlEntities(updatedMatch[1]) : null, feed);
    const imageUrl = extractImageUrl(itemXml, finalUrl);

    articles.push({
      id,
      title,
      url: finalUrl,
      domain: feed.domain,
      sourceName: feed.name,
      editorialScope: feed.editorialScope,
      sourceType: 'rss',
      publishedAt,
      updatedAt: collectedAt === undefined ? parsedUpdate : clampFeedClockLead(parsedUpdate, collectedAt),
      countryCode,
      countryBasis: inferredCountry ? 'inferred_topic' : 'media',
      category,
      ...(imageUrl ? { imageUrl } : {}),
    });
  }

  return articles;
}

const RSS_TTL_MS = 5 * 60_000;
const RSS_MAX_STALE_MS = 45 * 60_000;
const MAX_FEED_BYTES = 1_000_000;

type CacheEntry = {
  snapshot: RadarRssSnapshot;
  savedAt: number;
  expiresAt: number;
};

const rssCaches = new Map<Edition, CacheEntry>();
const feedCache = new Map<string, { articles: RadarRssArticle[]; savedAt: number }>();
const inFlight = new Map<Edition, Promise<RadarRssSnapshot>>();

export function clearRssCacheForTesting(): void {
  rssCaches.clear();
  feedCache.clear();
  inFlight.clear();
  httpCache.clear();
}

/** En-têtes des lectures de flux, repris par `npm run feeds:verify` pour mesurer ce que voit l'application. */
export const RSS_FEED_TIMEOUT_MS = 8_000;
export const RSS_FEED_HEADERS = {
  Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/plain;q=0.9',
  'User-Agent': 'AfricaLive-Radar/1.0 (Direct media intelligence; +https://africatv.sn)',
} as const;

/** Lecture bornée d'un flux (taille, délai, format) ; partagée avec « Regards sur le monde ». */
type HttpFeedCache = { articles: RadarRssArticle[]; etag: string | null; modified: string | null };
const httpCache = new Map<string, HttpFeedCache>();
export function clearFeedHttpCacheForTesting(ids: readonly string[]) { for (const id of ids) httpCache.delete(id); }

export async function fetchSingleFeed(feed: FeedConfig): Promise<RadarRssArticle[]> {
  const cached = httpCache.get(feed.id);
  const response = await fetch(feed.url, {
    cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(RSS_FEED_TIMEOUT_MS),
    headers: { ...RSS_FEED_HEADERS, ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}), ...(cached?.modified ? { 'If-Modified-Since': cached.modified } : {}) },
  });
  if (response.status === 304 && cached) return cached.articles;
  if (!response.ok) throw new Error('RSS_HTTP_ERROR');
  const xml = await readBoundedText(response, MAX_FEED_BYTES, feed.charset);
  if (!/<(?:rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('RSS_INVALID_PAYLOAD');
  const parsed = parseFeedXml(xml, feed, response.url || feed.url, Date.now());
  const articles = feed.africaOnly ? parsed.filter(article => africanMentions(article.title, feed.edition).touchesAfrica) : parsed;
  httpCache.set(feed.id, { articles, etag: response.headers.get('etag'), modified: response.headers.get('last-modified') });
  return articles;
}

async function fetchAllFeeds(edition: Edition): Promise<RadarRssSnapshot> {
  const activeFeeds = AFRICA_FEEDS[edition].filter((f) => f.enabled);
  const settled = await settleFeeds(activeFeeds, fetchSingleFeed);

  const allArticles: RadarRssArticle[] = [];
  const sourceCounts = new Map<string, number>();
  const availability: RadarSourceState[] = [];
  const now = Date.now();

  for (let index = 0; index < activeFeeds.length; index++) {
    const feed = activeFeeds[index];
    const outcome = settled[index];
    if (outcome.status === 'fulfilled') {
      allArticles.push(...outcome.value);
      sourceCounts.set(feed.id, outcome.value.length);
      feedCache.set(feed.id, { articles: outcome.value, savedAt: now });
      availability.push(radarSource(feed.name, feedMessages[edition].africa, now, RSS_TTL_MS, outcome.value.length, { limit: 150, dataAt: outcome.value.find(a => a.publishedAt)?.publishedAt }));
    } else {
      const cached = feedCache.get(feed.id);
      const reusable = cached && now - cached.savedAt <= RSS_MAX_STALE_MS;
      if (reusable) allArticles.push(...cached.articles);
      sourceCounts.set(feed.id, reusable ? cached.articles.length : 0);
      availability.push(radarSource(feed.name, feedMessages[edition].africa, now, RSS_TTL_MS, reusable ? cached.articles.length : 0, { status: reusable ? 'stale' : 'unavailable', lastSuccessAt: cached ? new Date(cached.savedAt).toISOString() : null, limit: 150 }));
    }
  }

  if (availability.every(source => source.status === 'unavailable')) {
    throw new Error('No articles could be retrieved from any African RSS feed.');
  }

  // Deduplicate by URL
  const byUrl = new Map<string, RadarRssArticle>();
  const deduplicatedArticles: RadarRssArticle[] = [];

  for (const article of allArticles) {
    const key = canonicalArticleUrl(article.url);
    const kept = byUrl.get(key);
    if (kept) {
      // Même article repris par deux flux : on garde le premier, mais on récupère l'illustration manquante.
      if (!kept.imageUrl && article.imageUrl) kept.imageUrl = article.imageUrl;
      continue;
    }
    const entry = { ...article };
    byUrl.set(key, entry);
    deduplicatedArticles.push(entry);
  }

  // Sort descending by date
  deduplicatedArticles.sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0));

  const sources: RssSourceMetric[] = activeFeeds.map((feed, index) => ({
    id: feed.id,
    name: feed.name,
    domain: feed.domain,
    count: sourceCounts.get(feed.id) ?? 0,
    availability: availability[index],
  }));

  const snapshot: RadarRssSnapshot = {
    articles: deduplicatedArticles.slice(0, 300),
    sources,
    updatedAt: new Date(now).toISOString(),
    stale: availability.some(source => source.status === 'stale'),
    partial: availability.some(source => source.status === 'unavailable' || source.status === 'stale'),
    availability,
  };

  rssCaches.set(edition, {
    snapshot,
    savedAt: now,
    expiresAt: now + RSS_TTL_MS,
  });

  return snapshot;
}

/**
 * Pont entre éditions (EDI-601) : dépêches des dernières 24 h par pays dans les **seuls caches encore valides** des autres
 * éditions actives. Lecture pure de la mémoire : aucune collecte n'est lancée, une édition sans cache valide est absente.
 */
export function editionBridgeCounts(current: Edition, enabled: readonly Edition[], now = Date.now()): EditionBridgeEntry[] {
  const entries: EditionBridgeEntry[] = [];
  for (const edition of enabled) {
    if (edition === current) continue;
    const cache = rssCaches.get(edition);
    if (!cache || cache.expiresAt <= now) continue;
    const counts = countryCountsFromArticles(cache.snapshot.articles, now);
    if (Object.keys(counts).length) entries.push({ edition, counts, updatedAt: cache.snapshot.updatedAt });
  }
  return entries;
}

export async function getRadarRss(query?: {
  edition?: Edition;
  source?: string;
  country?: string;
  limit?: number;
}): Promise<RadarRssSnapshot> {
  const edition = query?.edition ?? 'fr';
  const now = Date.now(), cache = rssCaches.get(edition);
  if (cache && cache.expiresAt > now) return filterSnapshot(cache.snapshot, query);
  let promise = inFlight.get(edition);
  if (!promise) {
    promise = fetchAllFeeds(edition).finally(() => { inFlight.delete(edition); });
    inFlight.set(edition, promise);
  }
  try {
    return filterSnapshot(await promise, query);
  } catch {
    throw new ServiceUnavailableError(
      'Le service de dépêches des rédactions africaines est temporairement indisponible.',
      'LIVE_RSS_UNAVAILABLE',
    );
  }
}

function filterSnapshot(
  snapshot: RadarRssSnapshot,
  query?: { source?: string; country?: string; limit?: number },
): RadarRssSnapshot {
  let articles = snapshot.articles;

  if (query?.source) {
    const filterSource = query.source.toLowerCase().trim();
    articles = articles.filter(
      (a) => a.domain.toLowerCase().includes(filterSource) || a.sourceName.toLowerCase().includes(filterSource),
    );
  }

  if (query?.country) {
    const filterCountry = query.country.toUpperCase().trim();
    articles = articles.filter((a) => a.countryCode === filterCountry);
  }

  if (query?.limit && query.limit > 0) {
    articles = articles.slice(0, Math.min(query.limit, 150));
  }

  const windowed = temporalWindow(articles, article => article.publishedAt, Date.now());
  return {
    ...snapshot,
    articles: windowed.recent,
    undatedArticles: windowed.undated,
    window: windowed.window,
    sources: snapshot.sources,
    updatedAt: snapshot.updatedAt,
    stale: snapshot.stale,
  };
}
