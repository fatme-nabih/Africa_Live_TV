import { ServiceUnavailableError } from '@/lib/api-errors';
import type {
  RadarArticle,
  RadarCountry,
  RadarNewsSnapshot,
} from '@/lib/live-osint-types';

export type AfricanCountry = RadarCountry & { gdeltCode: string };
type CacheEntry<T> = { value: T; savedAt: number; expiresAt: number };

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  { code: 'DZ', gdeltCode: 'AG', name: 'Algérie', region: 'Afrique du Nord', latitude: 28.0, longitude: 2.6 },
  { code: 'AO', gdeltCode: 'AO', name: 'Angola', region: 'Afrique centrale', latitude: -8.8, longitude: 13.2 },
  { code: 'BJ', gdeltCode: 'BN', name: 'Bénin', region: 'Afrique de l’Ouest', latitude: 6.5, longitude: 2.6 },
  { code: 'BW', gdeltCode: 'BC', name: 'Botswana', region: 'Afrique australe', latitude: -24.6, longitude: 25.9 },
  { code: 'BF', gdeltCode: 'UV', name: 'Burkina Faso', region: 'Afrique de l’Ouest', latitude: 12.4, longitude: -1.5 },
  { code: 'BI', gdeltCode: 'BY', name: 'Burundi', region: 'Afrique de l’Est', latitude: -3.4, longitude: 29.4 },
  { code: 'CV', gdeltCode: 'CV', name: 'Cap-Vert', region: 'Afrique de l’Ouest', latitude: 15.1, longitude: -23.6 },
  { code: 'CM', gdeltCode: 'CM', name: 'Cameroun', region: 'Afrique centrale', latitude: 3.9, longitude: 11.5 },
  { code: 'CF', gdeltCode: 'CT', name: 'République centrafricaine', region: 'Afrique centrale', latitude: 6.6, longitude: 20.9 },
  { code: 'TD', gdeltCode: 'CD', name: 'Tchad', region: 'Afrique centrale', latitude: 12.1, longitude: 15.0 },
  { code: 'KM', gdeltCode: 'CN', name: 'Comores', region: 'Afrique de l’Est', latitude: -11.7, longitude: 43.3 },
  { code: 'CG', gdeltCode: 'CF', name: 'République du Congo', region: 'Afrique centrale', latitude: -4.3, longitude: 15.3 },
  { code: 'CD', gdeltCode: 'CG', name: 'République démocratique du Congo', region: 'Afrique centrale', latitude: -2.8, longitude: 23.7 },
  { code: 'CI', gdeltCode: 'IV', name: 'Côte d’Ivoire', region: 'Afrique de l’Ouest', latitude: 5.3, longitude: -4.0 },
  { code: 'DJ', gdeltCode: 'DJ', name: 'Djibouti', region: 'Afrique de l’Est', latitude: 11.6, longitude: 43.1 },
  { code: 'EG', gdeltCode: 'EG', name: 'Égypte', region: 'Afrique du Nord', latitude: 26.8, longitude: 30.8 },
  { code: 'GQ', gdeltCode: 'EK', name: 'Guinée équatoriale', region: 'Afrique centrale', latitude: 1.7, longitude: 10.3 },
  { code: 'ER', gdeltCode: 'ER', name: 'Érythrée', region: 'Afrique de l’Est', latitude: 15.3, longitude: 38.9 },
  { code: 'SZ', gdeltCode: 'WZ', name: 'Eswatini', region: 'Afrique australe', latitude: -26.5, longitude: 31.5 },
  { code: 'ET', gdeltCode: 'ET', name: 'Éthiopie', region: 'Afrique de l’Est', latitude: 9.0, longitude: 38.8 },
  { code: 'GA', gdeltCode: 'GB', name: 'Gabon', region: 'Afrique centrale', latitude: -0.7, longitude: 11.6 },
  { code: 'GM', gdeltCode: 'GA', name: 'Gambie', region: 'Afrique de l’Ouest', latitude: 13.5, longitude: -16.6 },
  { code: 'GH', gdeltCode: 'GH', name: 'Ghana', region: 'Afrique de l’Ouest', latitude: 7.9, longitude: -1.0 },
  { code: 'GN', gdeltCode: 'GV', name: 'Guinée', region: 'Afrique de l’Ouest', latitude: 10.4, longitude: -10.8 },
  { code: 'GW', gdeltCode: 'PU', name: 'Guinée-Bissau', region: 'Afrique de l’Ouest', latitude: 11.8, longitude: -15.6 },
  { code: 'KE', gdeltCode: 'KE', name: 'Kenya', region: 'Afrique de l’Est', latitude: 0.2, longitude: 37.9 },
  { code: 'LS', gdeltCode: 'LT', name: 'Lesotho', region: 'Afrique australe', latitude: -29.6, longitude: 28.2 },
  { code: 'LR', gdeltCode: 'LI', name: 'Libéria', region: 'Afrique de l’Ouest', latitude: 6.4, longitude: -9.4 },
  { code: 'LY', gdeltCode: 'LY', name: 'Libye', region: 'Afrique du Nord', latitude: 27.0, longitude: 18.0 },
  { code: 'MG', gdeltCode: 'MA', name: 'Madagascar', region: 'Afrique de l’Est', latitude: -19.0, longitude: 46.7 },
  { code: 'MW', gdeltCode: 'MI', name: 'Malawi', region: 'Afrique australe', latitude: -13.9, longitude: 33.8 },
  { code: 'ML', gdeltCode: 'ML', name: 'Mali', region: 'Afrique de l’Ouest', latitude: 17.0, longitude: -3.5 },
  { code: 'MR', gdeltCode: 'MR', name: 'Mauritanie', region: 'Afrique de l’Ouest', latitude: 20.3, longitude: -10.3 },
  { code: 'MU', gdeltCode: 'MP', name: 'Maurice', region: 'Afrique de l’Est', latitude: -20.2, longitude: 57.5 },
  { code: 'MA', gdeltCode: 'MO', name: 'Maroc', region: 'Afrique du Nord', latitude: 31.8, longitude: -7.1 },
  { code: 'MZ', gdeltCode: 'MZ', name: 'Mozambique', region: 'Afrique australe', latitude: -18.7, longitude: 35.5 },
  { code: 'NA', gdeltCode: 'WA', name: 'Namibie', region: 'Afrique australe', latitude: -22.6, longitude: 17.1 },
  { code: 'NE', gdeltCode: 'NG', name: 'Niger', region: 'Afrique de l’Ouest', latitude: 17.6, longitude: 8.1 },
  { code: 'NG', gdeltCode: 'NI', name: 'Nigéria', region: 'Afrique de l’Ouest', latitude: 9.1, longitude: 8.7 },
  { code: 'RW', gdeltCode: 'RW', name: 'Rwanda', region: 'Afrique de l’Est', latitude: -1.9, longitude: 29.9 },
  { code: 'ST', gdeltCode: 'TP', name: 'São Tomé-et-Principe', region: 'Afrique centrale', latitude: 0.3, longitude: 6.7 },
  { code: 'SN', gdeltCode: 'SG', name: 'Sénégal', region: 'Afrique de l’Ouest', latitude: 14.7, longitude: -17.4 },
  { code: 'SC', gdeltCode: 'SE', name: 'Seychelles', region: 'Afrique de l’Est', latitude: -4.6, longitude: 55.5 },
  { code: 'SL', gdeltCode: 'SL', name: 'Sierra Leone', region: 'Afrique de l’Ouest', latitude: 8.5, longitude: -11.8 },
  { code: 'SO', gdeltCode: 'SO', name: 'Somalie', region: 'Afrique de l’Est', latitude: 5.2, longitude: 46.2 },
  { code: 'ZA', gdeltCode: 'SF', name: 'Afrique du Sud', region: 'Afrique australe', latitude: -29.0, longitude: 24.0 },
  { code: 'SS', gdeltCode: 'OD', name: 'Soudan du Sud', region: 'Afrique de l’Est', latitude: 7.0, longitude: 30.0 },
  { code: 'SD', gdeltCode: 'SU', name: 'Soudan', region: 'Afrique de l’Est', latitude: 15.0, longitude: 30.0 },
  { code: 'TZ', gdeltCode: 'TZ', name: 'Tanzanie', region: 'Afrique de l’Est', latitude: -6.2, longitude: 35.7 },
  { code: 'TG', gdeltCode: 'TO', name: 'Togo', region: 'Afrique de l’Ouest', latitude: 8.6, longitude: 0.8 },
  { code: 'TN', gdeltCode: 'TS', name: 'Tunisie', region: 'Afrique du Nord', latitude: 34.0, longitude: 9.5 },
  { code: 'UG', gdeltCode: 'UG', name: 'Ouganda', region: 'Afrique de l’Est', latitude: 1.4, longitude: 32.3 },
  { code: 'ZM', gdeltCode: 'ZA', name: 'Zambie', region: 'Afrique australe', latitude: -13.1, longitude: 27.8 },
  { code: 'ZW', gdeltCode: 'ZI', name: 'Zimbabwe', region: 'Afrique australe', latitude: -19.0, longitude: 29.9 },
  { code: 'EH', gdeltCode: 'WI', name: 'Sahara occidental', region: 'Afrique du Nord', latitude: 24.2, longitude: -12.2 },
];

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

function normalizeGdeltDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  const date = compact
    ? new Date(Date.UTC(
        Number(compact[1]), Number(compact[2]) - 1, Number(compact[3]),
        Number(compact[4]), Number(compact[5]), Number(compact[6]),
      ))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeArticle(value: unknown): RadarArticle | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === 'string'
    ? value.title.replace(/<[^>]*>/g, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&#x27;/gi, "'").replace(/\s+/g, ' ').trim().slice(0, 280)
    : '';
  const indexedAt = normalizeGdeltDate(value.seendate);
  if (!title || !indexedAt) return null;

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
    url: articleUrl.toString(),
    domain: domain.slice(0, 120),
    indexedAt,
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
      const key = article.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => Date.parse(right.indexedAt) - Date.parse(left.indexedAt))
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
  if (newsCache && newsCache.expiresAt > now) {
    return { articles: newsCache.value, countries: PUBLIC_COUNTRIES, updatedAt: new Date(newsCache.savedAt).toISOString(), stale: false };
  }

  try {
    const articles = await getFreshNews();
    const savedAt = newsCache?.savedAt ?? Date.now();
    return { articles, countries: PUBLIC_COUNTRIES, updatedAt: new Date(savedAt).toISOString(), stale: false };
  } catch {
    if (newsCache && now - newsCache.savedAt <= NEWS_MAX_STALE_MS) {
      return { articles: newsCache.value, countries: PUBLIC_COUNTRIES, updatedAt: new Date(newsCache.savedAt).toISOString(), stale: true };
    }
    throw new ServiceUnavailableError('Le fil de veille est temporairement indisponible.', 'LIVE_NEWS_UNAVAILABLE');
  }
}

export function getAfricanCountryByCode(code: string): AfricanCountry | undefined {
  const normalized = code.trim().toUpperCase();
  return AFRICAN_COUNTRIES.find((country) => country.code === normalized);
}
