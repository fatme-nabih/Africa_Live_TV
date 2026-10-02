import { ServiceUnavailableError } from '@/lib/api-errors';
import { canonicalArticleUrl, normalizeRadarDate, radarSource, temporalWindow } from './radar-data';
import type {
  RadarArticle,
  RadarCountry,
  RadarNewsSnapshot,
} from '@/lib/live-osint-types';

export type AfricanCountry = RadarCountry & { gdeltCode: string };
type CacheEntry<T> = { value: T; savedAt: number; expiresAt: number };

export { AFRICAN_COUNTRIES } from './radar-countries';
import { AFRICAN_COUNTRIES } from './radar-countries';

const COUNTRY_BY_GDELT_CODE = new Map(
  AFRICAN_COUNTRIES.map((country) => [country.gdeltCode, country] as const),
);
const COUNTRY_BY_GDELT_NAME = new Map<string, AfricanCountry>();
function normalizeCountryName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

for (const country of AFRICAN_COUNTRIES) {
  // GDELT uses FIPS country codes. Add ISO fallbacks only when the code is
  // unambiguous, since a few FIPS codes overlap another country's ISO code.
  if (!COUNTRY_BY_GDELT_CODE.has(country.code)) {
    COUNTRY_BY_GDELT_CODE.set(country.code, country);
  }
  COUNTRY_BY_GDELT_NAME.set(normalizeCountryName(country.name), country);
}
for (const [name, code] of [
  ['Algeria', 'DZ'], ['Angola', 'AO'], ['Benin', 'BJ'], ['Botswana', 'BW'],
  ['Burkina Faso', 'BF'], ['Burundi', 'BI'], ['Cape Verde', 'CV'], ['Cabo Verde', 'CV'],
  ['Cameroon', 'CM'], ['Central African Republic', 'CF'], ['Chad', 'TD'], ['Comoros', 'KM'],
  ['Republic of the Congo', 'CG'], ['Republic of Congo', 'CG'], ['Congo Brazzaville', 'CG'],
  ['Democratic Republic of the Congo', 'CD'], ['Democratic Republic of Congo', 'CD'],
  ['Congo Kinshasa', 'CD'], ['Congo the Democratic Republic of the', 'CD'],
  ['Ivory Coast', 'CI'], ["Cote d'Ivoire", 'CI'], ['Djibouti', 'DJ'], ['Egypt', 'EG'],
  ['Equatorial Guinea', 'GQ'], ['Eritrea', 'ER'], ['Eswatini', 'SZ'], ['Swaziland', 'SZ'],
  ['Ethiopia', 'ET'], ['Gabon', 'GA'], ['Gambia', 'GM'], ['Gambia the', 'GM'], ['Ghana', 'GH'],
  ['Guinea', 'GN'], ['Guinea Bissau', 'GW'], ['Kenya', 'KE'], ['Lesotho', 'LS'], ['Liberia', 'LR'],
  ['Libya', 'LY'], ['Madagascar', 'MG'], ['Malawi', 'MW'], ['Mali', 'ML'], ['Mauritania', 'MR'],
  ['Mauritius', 'MU'], ['Morocco', 'MA'], ['Mozambique', 'MZ'], ['Namibia', 'NA'], ['Niger', 'NE'],
  ['Nigeria', 'NG'], ['Rwanda', 'RW'], ['Sao Tome and Principe', 'ST'], ['São Tomé and Príncipe', 'ST'],
  ['Senegal', 'SN'], ['Seychelles', 'SC'], ['Sierra Leone', 'SL'], ['Somalia', 'SO'],
  ['South Africa', 'ZA'], ['South Sudan', 'SS'], ['Sudan', 'SD'], ['Tanzania', 'TZ'],
  ['United Republic of Tanzania', 'TZ'], ['Togo', 'TG'], ['Tunisia', 'TN'], ['Uganda', 'UG'],
  ['Zambia', 'ZM'], ['Zimbabwe', 'ZW'], ['Western Sahara', 'EH'],
] as const) {
  const country = AFRICAN_COUNTRIES.find((candidate) => candidate.code === code);
  if (country) COUNTRY_BY_GDELT_NAME.set(normalizeCountryName(name), country);
}
const PUBLIC_COUNTRIES: RadarCountry[] = AFRICAN_COUNTRIES.map((country) => ({
  code: country.code,
  name: country.name,
  region: country.region,
  latitude: country.latitude,
  longitude: country.longitude,
}));

const NEWS_TTL_MS = 5 * 60_000;
const NEWS_MAX_STALE_MS = 45 * 60_000;
const MAX_NEWS_BYTES = 2_000_000;

let newsCache: CacheEntry<RadarArticle[]> | null = null;
let newsRequest: Promise<RadarArticle[]> | null = null;
export function clearNewsCacheForTests() { newsCache = null; newsRequest = null; }

async function readBoundedText(response: Response, maxBytes: number) {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const normalizeGdeltDate = normalizeRadarDate;

function normalizeArticle(value: unknown): RadarArticle | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === 'string'
    ? value.title.replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&#x27;/gi, "'").replace(/\s+/g, ' ').trim().slice(0, 280)
    : '';
  const indexedAt = normalizeGdeltDate(value.seendate);
  if (!title) return null;

  let articleUrl: URL;
  try {
    articleUrl = new URL(typeof value.url === 'string' ? value.url : '');
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(articleUrl.protocol) || articleUrl.username || articleUrl.password) {
    return null;
  }

  const sourceCode = typeof value.sourcecountry === 'string' ? value.sourcecountry.trim().toUpperCase() : '';
  const country = COUNTRY_BY_GDELT_CODE.get(sourceCode)
    ?? COUNTRY_BY_GDELT_NAME.get(normalizeCountryName(sourceCode));
  const domainValue = typeof value.domain === 'string' ? value.domain.trim().toLowerCase() : '';
  const domain = domainValue && /^[a-z0-9.-]+$/.test(domainValue) ? domainValue : articleUrl.hostname.toLowerCase();

  return {
    title,
    url: canonicalArticleUrl(articleUrl.toString()),
    domain: domain.slice(0, 120),
    indexedAt: indexedAt ?? '',
    countryBasis: 'media',
    countryCode: country?.code ?? null,
  };
}

async function fetchNews() {
  const query = AFRICAN_COUNTRIES.map((country) => 'sourcecountry:' + country.gdeltCode).join(' OR ');
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.searchParams.set('query', '(' + query + ')');
  url.searchParams.set('mode', 'ArtList');
  url.searchParams.set('format', 'json');
  url.searchParams.set('maxrecords', '75');
  url.searchParams.set('timespan', '24h');
  url.searchParams.set('sort', 'DateDesc');

  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('GDELT request failed.');
  const payload: unknown = JSON.parse(await readBoundedText(response, MAX_NEWS_BYTES));
  if (!isRecord(payload) || !Array.isArray(payload.articles)) {
    throw new Error('GDELT returned an unexpected response.');
  }

  const seen = new Set<string>();
  return payload.articles
    .map(normalizeArticle)
    .filter((article): article is RadarArticle => Boolean(article))
    .filter((article) => {
      const key = canonicalArticleUrl(article.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (Date.parse(right.indexedAt) || 0) - (Date.parse(left.indexedAt) || 0))
    .slice(0, 75);
}

async function getFreshNews() {
  if (!newsRequest) {
    newsRequest = fetchNews().then((articles) => {
      const now = Date.now();
      newsCache = { value: articles, savedAt: now, expiresAt: now + NEWS_TTL_MS };
      return articles;
    }).finally(() => {
      newsRequest = null;
    });
  }
  return newsRequest;
}

export async function getRadarNews(): Promise<RadarNewsSnapshot> {
  const now = Date.now();
  const snapshot = (articles: RadarArticle[], savedAt: number, stale: boolean): RadarNewsSnapshot => {
    const windowed = temporalWindow(articles, article => article.indexedAt, Date.now());
    return { articles: windowed.recent, undatedArticles: windowed.undated, window: windowed.window,
      countries: PUBLIC_COUNTRIES, updatedAt: new Date(savedAt).toISOString(), stale,
      availability: [radarSource('GDELT', 'Afrique · pays du média', stale ? now : savedAt, NEWS_TTL_MS, articles.length,
        { status: stale ? 'stale' : undefined, lastSuccessAt: new Date(savedAt).toISOString(), dataAt: articles[0]?.indexedAt || null, limit: 75 })] };
  };
  if (newsCache && newsCache.expiresAt > now) {
    return snapshot(newsCache.value, newsCache.savedAt, false);
  }

  try {
    const articles = await getFreshNews();
    const savedAt = newsCache?.savedAt ?? Date.now();
    return snapshot(articles, savedAt, false);
  } catch {
    if (newsCache && now - newsCache.savedAt <= NEWS_MAX_STALE_MS) {
      return snapshot(newsCache.value, newsCache.savedAt, true);
    }
    throw new ServiceUnavailableError('Le fil de veille est temporairement indisponible.', 'LIVE_NEWS_UNAVAILABLE');
  }
}

export function getAfricanCountryByCode(code: string): AfricanCountry | undefined {
  const normalized = code.trim().toUpperCase();
  return AFRICAN_COUNTRIES.find((country) => country.code === normalized);
}
