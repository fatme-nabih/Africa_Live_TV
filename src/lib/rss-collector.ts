import { ServiceUnavailableError } from '@/lib/api-errors';
import { createHash } from 'node:crypto';
import { canonicalArticleUrl, normalizeRadarDate, radarSource, temporalWindow, type RadarSourceState } from './radar-data';
import { extractImageUrl } from './rss-image';
import type {
  FeedConfig,
  RadarRssArticle,
  RadarRssSnapshot,
  RssSourceMetric,
} from '@/lib/rss-collector-types';

export const RSS_FEEDS: FeedConfig[] = [
  // --- Agences et rédactions nationales africaines ---
  {
    id: 'aps',
    editorialScope: 'africa',
    name: 'APS (Sénégal)',
    domain: 'aps.sn',
    url: 'https://aps.sn/feed/',
    defaultCountry: 'SN',
    category: 'Sénégal & National',
    enabled: true,
  },
  {
    id: 'aip',
    editorialScope: 'africa',
    name: 'AIP (Côte d’Ivoire)',
    domain: 'aip.ci',
    url: 'https://www.aip.ci/feed/',
    defaultCountry: 'CI',
    category: 'Côte d’Ivoire & National',
    enabled: true,
  },
  {
    id: 'malijet',
    editorialScope: 'africa',
    name: 'MaliJet (Mali)',
    domain: 'malijet.com',
    url: 'https://malijet.com/rss.xml',
    defaultCountry: 'ML',
    category: 'Mali & National',
    enabled: true,
  },
  {
    id: 'lefaso',
    editorialScope: 'africa',
    name: 'LeFaso.net (Burkina Faso)',
    domain: 'lefaso.net',
    url: 'https://lefaso.net/spip.php?page=backend',
    defaultCountry: 'BF',
    category: 'Burkina Faso & National',
    enabled: true,
  },
  {
    id: 'actu_cm',
    editorialScope: 'africa',
    name: 'Actu Cameroun',
    domain: 'actucameroun.com',
    url: 'https://actucameroun.com/feed/',
    defaultCountry: 'CM',
    category: 'Cameroun & National',
    enabled: true,
  },
  {
    id: 'guineenews',
    editorialScope: 'africa',
    name: 'Guinéenews (Guinée)',
    domain: 'guineenews.org',
    url: 'https://guineenews.org/feed/',
    defaultCountry: 'GN',
    category: 'Guinée & National',
    enabled: true,
  },
  {
    id: 'okapi',
    editorialScope: 'africa',
    name: 'Radio Okapi (RDC)',
    domain: 'radiookapi.net',
    url: 'https://www.radiookapi.net/rss.xml',
    defaultCountry: 'CD',
    category: 'RDC & National',
    enabled: true,
  },
  {
    id: 'hespress',
    editorialScope: 'africa',
    name: 'Hespress FR (Maroc)',
    domain: 'fr.hespress.com',
    url: 'https://fr.hespress.com/feed',
    defaultCountry: 'MA',
    category: 'Maroc & National',
    enabled: true,
  },
  {
    id: 'tsa',
    editorialScope: 'africa',
    name: 'TSA (Algérie)',
    domain: 'tsa-algerie.com',
    url: 'https://tsa-algerie.com/feed/',
    defaultCountry: 'DZ',
    category: 'Algérie & National',
    enabled: true,
  },
  {
    id: 'gabonreview',
    editorialScope: 'africa',
    name: 'Gabon Review',
    domain: 'gabonreview.com',
    url: 'https://gabonreview.com/feed/',
    defaultCountry: 'GA',
    category: 'Gabon & National',
    enabled: true,
  },
  {
    id: '24haubenin',
    editorialScope: 'africa',
    name: '24 Heures au Bénin',
    domain: '24haubenin.info',
    url: 'https://24haubenin.info/?page=backend',
    defaultCountry: 'BJ',
    category: 'Bénin & National',
    enabled: true,
  },

  // --- Économie, Analyses & Panafricain ---
  {
    id: 'ecofin',
    editorialScope: 'africa',
    name: 'Agence Ecofin',
    domain: 'agenceecofin.com',
    url: 'https://www.agenceecofin.com/feed',
    defaultCountry: null,
    category: 'Économie & Finance',
    enabled: true,
  },
  {
    id: 'financialafrik',
    editorialScope: 'africa',
    name: 'Financial Afrik',
    domain: 'financialafrik.com',
    url: 'https://www.financialafrik.com/feed/',
    defaultCountry: null,
    category: 'Économie & Finance',
    enabled: true,
  },
  {
    id: 'ja',
    editorialScope: 'africa',
    name: 'Jeune Afrique',
    domain: 'jeuneafrique.com',
    url: 'https://www.jeuneafrique.com/feed/',
    defaultCountry: null,
    category: 'Analyses & Géopolitique',
    enabled: true,
  },
  {
    id: 'africanews',
    editorialScope: 'africa',
    name: 'Africanews (FR)',
    domain: 'fr.africanews.com',
    url: 'https://fr.africanews.com/feed/',
    defaultCountry: null,
    category: 'Actualité Panafricaine',
    enabled: true,
  },

  // --- Rubrique Internationale ---
  {
    id: 'f24_monde',
    editorialScope: 'international',
    name: 'France 24 Monde',
    domain: 'france24.com',
    url: 'https://www.france24.com/fr/rss',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
  {
    id: 'f24_afrique',
    editorialScope: 'international',
    name: 'France 24 Afrique',
    domain: 'france24.com',
    url: 'https://www.france24.com/fr/afrique/rss',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
  {
    id: 'rfi_monde',
    editorialScope: 'international',
    name: 'RFI Monde',
    domain: 'rfi.fr',
    url: 'https://www.rfi.fr/fr/monde/rss',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
  {
    id: 'rfi',
    editorialScope: 'international',
    name: 'RFI Afrique',
    domain: 'rfi.fr',
    url: 'https://www.rfi.fr/fr/afrique/rss',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
  {
    id: 'bbc',
    editorialScope: 'international',
    name: 'BBC Afrique',
    domain: 'bbc.com',
    url: 'https://feeds.bbci.co.uk/afrique/rss.xml',
    defaultCountry: null,
    category: 'International',
    enabled: true,
  },
  {
    id: 'lemonde_afrique',
    editorialScope: 'international',
    name: 'Le Monde Afrique',
    domain: 'lemonde.fr',
    url: 'https://www.lemonde.fr/afrique/rss_full.xml',
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
    .toLowerCase()
    .replace(/['’‘ʼ`\u2010-\u2015\u2212-]/g,' ')
    .replace(/\s+/g,' ').trim();
}

export function detectCountryCode(text: string, defaultCountry: string | null = null): string | null {
  const normalized = normalizeText(text);

  const matches: { code:string; words:number; length:number; index:number }[] = [];
  for (const [code, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Look for whole words or clear boundary matches
      const alias = normalizeText(keyword);
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      const match = regex.exec(normalized);
      if (match) matches.push({ code,words:alias.split(' ').length,length:alias.length,index:match.index });
    }
  }

  // Specific phrases, then longer aliases, then earliest mention, then ISO code.
  matches.sort((a,b) => b.words-a.words || b.length-a.length || a.index-b.index || a.code.localeCompare(b.code));
  return matches[0]?.code ?? defaultCountry;
}

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

const parseDate = normalizeRadarDate;

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
export function parseFeedXml(xml: string, feed: FeedConfig, documentUrl = feed.url): RadarRssArticle[] {
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
    const publishedAt = parseDate(dateStr);

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
    const inferredCountry = detectCountryCode(`${title} ${topicCategory ?? ''}`);
    const countryCode = inferredCountry ?? feed.defaultCountry;

    // 6. ID
    const id = `${feed.id}-${createHash('sha256').update(finalUrl).digest('hex')}`;
    const updatedMatch = itemXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
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
      updatedAt: normalizeRadarDate(updatedMatch ? decodeXmlEntities(updatedMatch[1]) : null),
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

let rssCache: CacheEntry | null = null;
const feedCache = new Map<string, { articles: RadarRssArticle[]; savedAt: number }>();
let inFlightPromise: Promise<RadarRssSnapshot> | null = null;

export function clearRssCacheForTesting(): void {
  rssCache = null;
  feedCache.clear();
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
      throw new Error('RSS_HTTP_ERROR');
    }

    const xml = await readBoundedText(response, MAX_FEED_BYTES);
    if (!/<(?:rss|feed|rdf:RDF)[\s>]/i.test(xml)) throw new Error('RSS_INVALID_PAYLOAD');
    return parseFeedXml(xml, feed, response.url || feed.url);
}

async function fetchAllFeeds(): Promise<RadarRssSnapshot> {
  const activeFeeds = RSS_FEEDS.filter((f) => f.enabled);
  const settled = await Promise.allSettled(activeFeeds.map(fetchSingleFeed));

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
      availability.push(radarSource(feed.name, 'Afrique · dépêches', now, RSS_TTL_MS, outcome.value.length, { limit: 150, dataAt: outcome.value.find(a => a.publishedAt)?.publishedAt }));
    } else {
      const cached = feedCache.get(feed.id);
      const reusable = cached && now - cached.savedAt <= RSS_MAX_STALE_MS;
      if (reusable) allArticles.push(...cached.articles);
      sourceCounts.set(feed.id, reusable ? cached.articles.length : 0);
      availability.push(radarSource(feed.name, 'Afrique · dépêches', now, RSS_TTL_MS, reusable ? cached.articles.length : 0, { status: reusable ? 'stale' : 'unavailable', lastSuccessAt: cached ? new Date(cached.savedAt).toISOString() : null, limit: 150 }));
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

  const sources: RssSourceMetric[] = activeFeeds.map((feed) => ({
    id: feed.id,
    name: feed.name,
    domain: feed.domain,
    count: sourceCounts.get(feed.id) ?? 0,
    availability: availability.find(source => source.provider === feed.name),
  }));

  const snapshot: RadarRssSnapshot = {
    articles: deduplicatedArticles.slice(0, 300),
    sources,
    updatedAt: new Date(now).toISOString(),
    stale: availability.some(source => source.status === 'stale'),
    partial: availability.some(source => source.status === 'unavailable' || source.status === 'stale'),
    availability,
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
