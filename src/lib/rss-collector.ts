import { ServiceUnavailableError } from '@/lib/api-errors';
import type {
  FeedConfig,
  RadarRssArticle,
  RadarRssSnapshot,
  RssSourceMetric,
} from '@/lib/rss-collector-types';

export const RSS_FEEDS: FeedConfig[] = [
  {
    id: 'aps',
    name: 'APS (Sénégal)',
    domain: 'aps.sn',
    url: 'https://aps.sn/feed/',
    defaultCountry: 'SN',
    category: 'Sénégal & National',
    enabled: true,
  },
  {
    id: 'ecofin',
    name: 'Agence Ecofin',
    domain: 'agenceecofin.com',
    url: 'https://www.agenceecofin.com/feed',
    defaultCountry: null,
    category: 'Économie & Finance',
    enabled: true,
  },
  {
    id: 'rfi',
    name: 'RFI Afrique',
    domain: 'rfi.fr',
    url: 'https://www.rfi.fr/fr/afrique/rss',
    defaultCountry: null,
    category: 'Actualité Panafricaine',
    enabled: true,
  },
  {
    id: 'ja',
    name: 'Jeune Afrique',
    domain: 'jeuneafrique.com',
    url: 'https://www.jeuneafrique.com/feed/',
    defaultCountry: null,
    category: 'Analyses & Géopolitique',
    enabled: true,
  },
  {
    id: 'bbc',
    name: 'BBC Afrique',
    domain: 'bbc.com',
    url: 'https://feeds.bbci.co.uk/afrique/rss.xml',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
];

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  SN: ['senegal', 'dakar', 'matam', 'saint-louis', 'thies', 'ziguinchor', 'touba', 'kaolack', 'diourbel', 'mbour', 'kedougou', 'fatick', 'kolda', 'senegalais', 'pastef', 'diomaye', 'sonko'],
  CI: ['cote d\'ivoire', 'cote d ivoire', 'abidjan', 'yamoussoukro', 'san pedro', 'bouake', 'ivoirien', 'ivoirienne', 'ouattara'],
  ML: ['mali', 'bamako', 'sikasso', 'mopti', 'tombouctou', 'gao', 'kidal', 'malien', 'malienne', 'assimi goita', 'goita'],
  GN: ['guinee', 'conakry', 'kankan', 'kindia', 'guineen', 'guineenne', 'doumbouya'],
  BF: ['burkina', 'ouagadougou', 'bobo-dioulasso', 'burkinabe', 'ibrahim traore', 'traore'],
  NE: ['niger', 'niamey', 'zinder', 'maradi', 'agadez', 'nigerien', 'nigerienne', 'tiani'],
  CM: ['cameroun', 'cameroon', 'yaounde', 'douala', 'garoua', 'camerounais', 'biya'],
  CD: ['rdc', 'rd congo', 'congo-kinshasa', 'kinshasa', 'lubumbashi', 'goma', 'kivu', 'congolais', 'tshisekedi'],
  CG: ['brazzaville', 'congo-brazzaville', 'sassou'],
  GA: ['gabon', 'libreville', 'port-gentil', 'gabonais', 'oligui nguema'],
  TD: ['tchad', 'chad', 'n\'djamena', 'ndjamena', 'tchadien', 'deby'],
  MA: ['maroc', 'morocco', 'rabat', 'casablanca', 'marrakech', 'tanger', 'fes', 'marocain', 'mohammed vi'],
  DZ: ['algerie', 'algeria', 'alger', 'oran', 'constantine', 'algerien', 'tebboune'],
  TN: ['tunisie', 'tunisia', 'tunis', 'sfax', 'sousse', 'tunisien', 'saied'],
  EG: ['egypte', 'egypt', 'le caire', 'cairo', 'alexandrie', 'egyptien', 'sissi'],
  NG: ['nigeria', 'lagos', 'abuja', 'kano', 'ibadan', 'nigerian', 'tinubu'],
  GH: ['ghana', 'accra', 'kumasi', 'ghaneen', 'akufo-addo'],
  KE: ['kenya', 'nairobi', 'mombasa', 'kisumu', 'kenyan', 'ruto'],
  ET: ['ethiopie', 'ethiopia', 'addis-abeba', 'addis ababa', 'ethiopien', 'abiy'],
  ZA: ['afrique du sud', 'south africa', 'pretoria', 'johannesburg', 'le cap', 'cape town', 'durban', 'sud-africain', 'ramaphosa'],
  RW: ['rwanda', 'kigali', 'rwandais', 'kagame'],
  BJ: ['benin', 'cotonou', 'porto-novo', 'beninois', 'talon'],
  TG: ['togo', 'lome', 'togolais', 'gnassingbe'],
  MR: ['mauritanie', 'mauritania', 'nouakchott', 'mauritanien', 'ghazouani'],
  MG: ['madagascar', 'antananarivo', 'malgache', 'rajoelina'],
  AO: ['angola', 'luanda', 'angolais', 'lourenco'],
  MZ: ['mozambique', 'maputo', 'mozambicain'],
  ZW: ['zimbabwe', 'harare', 'bulawayo'],
  ZM: ['zambie', 'zambia', 'lusaka'],
  UG: ['ouganda', 'uganda', 'kampala', 'museveni'],
  SD: ['soudan', 'sudan', 'khartoum', 'burhan'],
  SS: ['soudan du sud', 'south sudan', 'juba', 'kiir'],
  CF: ['centrafrique', 'bangui', 'centrafricain', 'touadera'],
  SL: ['sierra leone', 'freetown'],
  LR: ['liberia', 'monrovia'],
  GM: ['gambie', 'gambia', 'banjul', 'barrow'],
  GW: ['guinee-bissau', 'bissau', 'embalo'],
  CV: ['cap-vert', 'cabo verde', 'praia'],
  KM: ['comores', 'comoros', 'moroni', 'azali'],
  DJ: ['djibouti', 'guelleh'],
  SO: ['somalie', 'somalia', 'mogadiscio', 'mogadishu'],
  MU: ['maurice', 'mauritius', 'port-louis'],
  SC: ['seychelles', 'victoria'],
  BI: ['burundi', 'bujumbura', 'gitega'],
  BW: ['botswana', 'gaborone'],
  NA: ['namibie', 'namibia', 'windhoek'],
  LS: ['lesotho', 'maseru'],
  SZ: ['eswatini', 'swaziland', 'mbabane'],
  MW: ['malawi', 'lilongwe'],
  GQ: ['guinee equatoriale', 'malabo', 'obiang'],
  ST: ['sao tome'],
  ER: ['erythree', 'asmara'],
  EH: ['sahara occidental', 'western sahara', 'laayoune', 'polisario'],
};

function normalizeText(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function detectCountryCode(text: string, defaultCountry: string | null = null): string | null {
  const normalized = normalizeText(text);

  for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Look for whole words or clear boundary matches
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (regex.test(normalized)) {
        return code;
      }
    }
  }

  return defaultCountry;
}

export function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCharCode(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCharCode(code) : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDate(rawDate: string | null | undefined): string {
  if (!rawDate) return new Date().toISOString();
  const parsed = new Date(rawDate.trim());
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export function parseFeedXml(xml: string, feed: FeedConfig): RadarRssArticle[] {
  const articles: RadarRssArticle[] = [];
  const isAtom = /<entry[\s\S]*?<\/entry>/i.test(xml);
  const itemMatches = isAtom
    ? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? []
    : xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const itemXml of itemMatches) {
    // 1. Title
    const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitle = titleMatch ? titleMatch[1] : '';
    const title = decodeXmlEntities(rawTitle).slice(0, 300);
    if (!title) continue;

    // 2. Link
    let rawLink = '';
    if (isAtom) {
      const hrefMatch = itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
      rawLink = hrefMatch ? hrefMatch[1] : '';
      if (!rawLink) {
        const textLinkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        rawLink = textLinkMatch ? textLinkMatch[1] : '';
      }
    } else {
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      rawLink = linkMatch ? linkMatch[1] : '';
    }
    const cleanLink = decodeXmlEntities(rawLink).trim();
    let articleUrl: URL;
    try {
      articleUrl = new URL(cleanLink);
    } catch {
      continue;
    }
    if (!['http:', 'https:'].includes(articleUrl.protocol) || articleUrl.username || articleUrl.password) {
      continue;
    }

    // Strip common tracking parameters (utm_*, fbclid, etc.)
    for (const key of Array.from(articleUrl.searchParams.keys())) {
      if (/^utm_|^fbclid|^ref/i.test(key)) {
        articleUrl.searchParams.delete(key);
      }
    }
    const finalUrl = articleUrl.toString();

    // 3. Date
    let dateStr: string | null = null;
    const pubDateMatch = itemXml.match(/<(?:pubDate|dc:date|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|dc:date|published|updated)>/i);
    if (pubDateMatch) {
      dateStr = decodeXmlEntities(pubDateMatch[1]);
    }
    const publishedAt = parseDate(dateStr);

    // 4. Category
    let category = feed.category;
    const catMatch = itemXml.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
    if (catMatch) {
      const extractedCategory = decodeXmlEntities(catMatch[1]);
      if (extractedCategory && extractedCategory.length < 50) {
        category = extractedCategory;
      }
    }

    // 5. Geolocation / Country code
    const countryCode = detectCountryCode(`${title} ${category}`, feed.defaultCountry);

    // 6. ID
    const id = `${feed.id}-${Buffer.from(finalUrl).toString('base64url').slice(0, 32)}`;

    articles.push({
      id,
      title,
      url: finalUrl,
      domain: feed.domain,
      sourceName: feed.name,
      sourceType: 'rss',
      publishedAt,
      countryCode,
      category,
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

let rssCache: CacheEntry | null = null;
let inFlightPromise: Promise<RadarRssSnapshot> | null = null;

export function clearRssCacheForTesting(): void {
  rssCache = null;
  inFlightPromise = null;
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Upstream response exceeded the allowed size.');
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let byteCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
        await reader.cancel();
        throw new Error('Upstream response exceeded the allowed size.');
      }
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return result;
}

async function fetchSingleFeed(feed: FeedConfig): Promise<RadarRssArticle[]> {
  try {
    const response = await fetch(feed.url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/plain;q=0.9',
        'User-Agent': 'AfricaLive-Radar/1.0 (Direct media intelligence; +https://africatv.sn)',
      },
    });

    if (!response.ok) {
      return [];
    }

    const xml = await readBoundedText(response, MAX_FEED_BYTES);
    return parseFeedXml(xml, feed);
  } catch {
    return [];
  }
}

async function fetchAllFeeds(): Promise<RadarRssSnapshot> {
  const activeFeeds = RSS_FEEDS.filter((f) => f.enabled);
  const settled = await Promise.allSettled(activeFeeds.map(fetchSingleFeed));

  const allArticles: RadarRssArticle[] = [];
  const sourceCounts = new Map<string, number>();

  for (let index = 0; index < activeFeeds.length; index++) {
    const feed = activeFeeds[index];
    const outcome = settled[index];
    if (outcome.status === 'fulfilled' && outcome.value.length > 0) {
      allArticles.push(...outcome.value);
      sourceCounts.set(feed.id, outcome.value.length);
    } else {
      sourceCounts.set(feed.id, 0);
    }
  }

  if (allArticles.length === 0) {
    throw new Error('No articles could be retrieved from any African RSS feed.');
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const deduplicatedArticles: RadarRssArticle[] = [];

  for (const article of allArticles) {
    const key = article.url.toLowerCase();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    deduplicatedArticles.push(article);
  }

  // Sort descending by date
  deduplicatedArticles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const sources: RssSourceMetric[] = activeFeeds.map((feed) => ({
    id: feed.id,
    name: feed.name,
    domain: feed.domain,
    count: sourceCounts.get(feed.id) ?? 0,
  }));

  const now = Date.now();
  const snapshot: RadarRssSnapshot = {
    articles: deduplicatedArticles.slice(0, 150),
    sources,
    updatedAt: new Date(now).toISOString(),
    stale: false,
  };

  rssCache = {
    snapshot,
    savedAt: now,
    expiresAt: now + RSS_TTL_MS,
  };

  return snapshot;
}

export async function getRadarRss(query?: {
  source?: string;
  country?: string;
  limit?: number;
}): Promise<RadarRssSnapshot> {
  const now = Date.now();

  if (rssCache && rssCache.expiresAt > now) {
    return filterSnapshot(rssCache.snapshot, query);
  }

  if (!inFlightPromise) {
    inFlightPromise = fetchAllFeeds()
      .finally(() => {
        inFlightPromise = null;
      });
  }

  try {
    const snapshot = await inFlightPromise;
    return filterSnapshot(snapshot, query);
  } catch {
    if (rssCache && now - rssCache.savedAt <= RSS_MAX_STALE_MS) {
      return filterSnapshot({ ...rssCache.snapshot, stale: true }, query);
    }
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

  return {
    articles,
    sources: snapshot.sources,
    updatedAt: snapshot.updatedAt,
    stale: snapshot.stale,
  };
}
