import type { Edition } from './editions';
import { foreignCountryMentions } from './country-detector';
import { EXTRA_ALIASES } from './country-lexicon/fr';
import { textWords, phraseAt } from './text-normalize';
import { REGION_KEYWORDS as FOREIGN_REGION_KEYWORDS } from './world-region-lexicon';
import { fr } from '@/i18n/fr';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { canonicalArticleUrl, normalizeRadarDate, temporalWindow, type RadarSourceState, type RadarSourceStatus } from './radar-data';

/**
 * « Regards sur le monde » : l'actualité internationale par région, lue depuis l'Afrique.
 * Module partagé (serveur et navigateur) : régions, déduction de la région d'un titre, pays africains cités, validation du relevé.
 */
export type WorldRegion = 'europe' | 'ameriques' | 'moyen-orient' | 'asie-pacifique';
/** Ordre et fuseaux ; libellés et villes en français (le composant lit ceux de son édition dans le dictionnaire). */
export const WORLD_REGIONS: { id: WorldRegion; label: string; city: string; timeZone: string }[] = ([
  ['europe', 'Europe/Paris'],
  ['ameriques', 'America/New_York'],
  ['moyen-orient', 'Asia/Riyadh'],
  ['asie-pacifique', 'Asia/Shanghai'],
] as const).map(([id, timeZone]) => ({ id, label: fr.world.regions[id], city: fr.world.cities[id], timeZone }));
const REGION_IDS = new Set<string>(WORLD_REGIONS.map(region => region.id));

export type WorldArticle = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  /** D'où parle la rédaction (France, Canada, Europe…) : la pluralité des regards est affichée, pas supposée. */
  origin: string;
  publishedAt: string | null;
  region: WorldRegion | null;
  /** `source` : rubrique régionale de l'éditeur ; `inferred` : déduite du titre pour un flux généraliste. */
  regionBasis: 'source' | 'inferred';
  /** Pays africains nommés dans le titre (codes ISO). */
  africanCountries: string[];
  /** Le titre parle de l'Afrique (un pays, le continent, l'Union africaine, le Sahel). */
  touchesAfrica: boolean;
};

export type WorldSnapshot = {
  articles: WorldArticle[];
  updatedAt: string;
  availability: RadarSourceState[];
};

export function normalizeTitle(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/['’‘ʼ`‐-―−-]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const REGION_KEYWORDS: Record<WorldRegion, string[]> = {
  europe: ['europe', 'europeen', 'europeenne', 'europeens', 'union europeenne', 'ue', 'bruxelles', 'commission europeenne', 'otan', 'france', 'paris', 'macron', 'allemagne', 'berlin', 'merz',
    'royaume uni', 'londres', 'starmer', 'italie', 'rome', 'meloni', 'espagne', 'madrid', 'portugal', 'lisbonne', 'belgique', 'suisse', 'pays bas', 'pologne', 'varsovie', 'ukraine', 'kiev', 'kyiv',
    'zelensky', 'russie', 'moscou', 'kremlin', 'poutine', 'hongrie', 'orban', 'grece', 'athenes', 'suede', 'norvege', 'finlande', 'danemark', 'roumanie', 'serbie', 'turquie', 'ankara', 'erdogan'],
  ameriques: ['etats unis', 'washington', 'maison blanche', 'trump', 'americain', 'americaine', 'americains', 'new york', 'californie', 'canada', 'ottawa', 'quebec', 'montreal', 'carney', 'mexique',
    'bresil', 'brasilia', 'lula', 'argentine', 'milei', 'venezuela', 'caracas', 'maduro', 'colombie', 'bogota', 'chili', 'perou', 'bolivie', 'equateur', 'cuba', 'haiti', 'panama', 'amerique latine', 'ameriques'],
  'moyen-orient': ['israel', 'israelien', 'israelienne', 'netanyahou', 'gaza', 'palestine', 'palestinien', 'palestiniens', 'cisjordanie', 'jerusalem', 'hamas', 'hezbollah', 'liban', 'beyrouth',
    'syrie', 'damas', 'iran', 'teheran', 'iranien', 'irak', 'bagdad', 'arabie saoudite', 'saoudien', 'riyad', 'yemen', 'houthis', 'qatar', 'doha', 'emirats', 'dubai', 'abou dhabi', 'jordanie',
    'koweit', 'oman', 'bahrein', 'moyen orient', 'proche orient'],
  'asie-pacifique': ['chine', 'chinois', 'pekin', 'xi jinping', 'hong kong', 'taiwan', 'japon', 'tokyo', 'coree', 'seoul', 'pyongyang', 'inde', 'indien', 'new delhi', 'modi', 'pakistan',
    'islamabad', 'afghanistan', 'kaboul', 'talibans', 'bangladesh', 'sri lanka', 'nepal', 'birmanie', 'thailande', 'bangkok', 'vietnam', 'cambodge', 'malaisie', 'singapour', 'indonesie',
    'jakarta', 'philippines', 'manille', 'australie', 'canberra', 'nouvelle zelande', 'asie', 'asiatique', 'pacifique'],
};

function matches(normalized: string, alias: string) {
  return (' ' + normalized + ' ').includes(' ' + alias + ' ');
}

/** Région majoritaire citée par le titre ; aucune (null) en cas d'égalité ou d'absence d'indice. */
export function inferWorldRegion(title: string, edition: Edition = 'fr'): WorldRegion | null {
  if (edition !== 'fr') {
    const words = textWords(title, edition);
    const scores = WORLD_REGIONS.map(({ id }) => ({ id, score: FOREIGN_REGION_KEYWORDS[edition][id].filter(alias => phraseAt(words, textWords(alias, edition), edition) >= 0).length })).sort((a, b) => b.score - a.score);
    return scores[0].score > 0 && scores[0].score > scores[1].score ? scores[0].id : null;
  }
  const normalized = normalizeTitle(title);
  const scores = WORLD_REGIONS.map(({ id }) => ({ id, score: REGION_KEYWORDS[id].filter(alias => matches(normalized, alias)).length }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 && scores[0].score > scores[1].score ? scores[0].id : null;
}

// Noms officiels de la liste Africa Live, plus quelques usages courants. Les noms ambigus hors contexte africain
// (« Maurice » prénom, « Victoria », « Congo » sans précision) ne désignent pas un pays à eux seuls.
const AMBIGUOUS_NAMES = new Set(['MU']);
const COUNTRY_ALIASES: [string, string][] = [
  ...AFRICAN_COUNTRIES.filter(country => !AMBIGUOUS_NAMES.has(country.code)).map(country => [normalizeTitle(country.name), country.code] as [string, string]),
  ...EXTRA_ALIASES,
].sort((a, b) => b[0].length - a[0].length);
const CONTINENT_WORDS = ['afrique', 'africain', 'africaine', 'africains', 'africaines', 'union africaine', 'sahel', 'congo'];

/** Pays africains nommés (le plus long nom l'emporte : « Guinée-Bissau » n'est pas aussi « Guinée »). */
export function africanMentions(title: string, edition: Edition = 'fr'): { countries: string[]; touchesAfrica: boolean } {
  if (edition !== 'fr') {
    const countries = foreignCountryMentions(title, edition), words = textWords(title, edition);
    const continent = edition === 'en' ? ['Africa', 'African', 'Africans', 'African Union', 'Sahel', 'Congo'] : ['أفريقيا', 'إفريقيا', 'الأفريقي', 'الأفريقية', 'الأفارقة', 'الأفريقيين', 'الاتحاد الأفريقي', 'الساحل', 'الكونغو'];
    return { countries, touchesAfrica: countries.length > 0 || continent.some(alias => phraseAt(words, textWords(alias, edition), edition) >= 0) };
  }
  let rest = ' ' + normalizeTitle(title) + ' ';
  const countries: string[] = [];
  for (const [alias, code] of COUNTRY_ALIASES) {
    const needle = ' ' + alias + ' ';
    if (!rest.includes(needle)) continue;
    if (!countries.includes(code)) countries.push(code);
    rest = rest.split(needle).join('  ');
  }
  return { countries, touchesAfrica: countries.length > 0 || CONTINENT_WORDS.some(word => rest.includes(' ' + word + ' ')) };
}

const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
const text = (value: unknown, max = 400): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const statuses = new Set<RadarSourceStatus>(['available', 'empty', 'partial', 'stale', 'unavailable', 'not_configured']);
const countryCodes = new Set(AFRICAN_COUNTRIES.map(country => country.code));
export const WORLD_MAX_STALE_MS = 2 * 60 * 60_000;

/** Valide le relevé reçu : lignes invalides écartées, liens non http(s) refusés, fenêtre de 24 h appliquée. */
export function parseWorldSnapshot(raw: unknown, now = Date.now()): WorldSnapshot | null {
  const body = record(raw);
  if (!body || !Array.isArray(body.articles)) return null;
  const updatedAt = normalizeRadarDate(body.updatedAt);
  if (!updatedAt || Date.parse(updatedAt) > now || now - Date.parse(updatedAt) > WORLD_MAX_STALE_MS) return null;
  const articles: WorldArticle[] = [];
  for (const rawArticle of body.articles.slice(0, 400)) {
    const article = record(rawArticle);
    if (!article || !text(article.id) || !text(article.title, 300) || !text(article.sourceName) || !text(article.origin)) continue;
    const url = canonicalArticleUrl(text(article.url, 2000) ? article.url : '');
    if (!url) continue;
    const region = typeof article.region === 'string' && REGION_IDS.has(article.region) ? article.region as WorldRegion : null;
    const africanCountries = Array.isArray(article.africanCountries) ? article.africanCountries.filter((code): code is string => typeof code === 'string' && countryCodes.has(code)) : [];
    const touchesAfrica = article.touchesAfrica === true || africanCountries.length > 0;
    if (!region && !touchesAfrica) continue;
    articles.push({ id: article.id, title: article.title, url, sourceName: article.sourceName, origin: article.origin, publishedAt: normalizeRadarDate(article.publishedAt),
      region, regionBasis: article.regionBasis === 'inferred' ? 'inferred' : 'source', africanCountries, touchesAfrica });
  }
  const availability: RadarSourceState[] = [];
  if (Array.isArray(body.availability)) for (const rawSource of body.availability.slice(0, 40)) {
    const source = record(rawSource);
    if (!source || !text(source.provider) || !text(source.scope) || !statuses.has(source.status as RadarSourceStatus)) continue;
    availability.push({ provider: source.provider, scope: source.scope, status: source.status as RadarSourceStatus, fetchedAt: normalizeRadarDate(source.fetchedAt) ?? updatedAt,
      lastSuccessAt: normalizeRadarDate(source.lastSuccessAt), dataAt: normalizeRadarDate(source.dataAt), cacheExpiresAt: normalizeRadarDate(source.cacheExpiresAt),
      count: typeof source.count === 'number' && Number.isFinite(source.count) && source.count >= 0 ? source.count : 0 });
  }
  return { articles: temporalWindow(articles, article => article.publishedAt, now).recent, updatedAt, availability };
}
