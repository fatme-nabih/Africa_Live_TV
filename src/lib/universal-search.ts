import { filterCountries, normalizeSearch, type PickerCountry } from './country-picker';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { canonicalArticleUrl } from './radar-data';
import { QUICK_WEATHER_LOCATIONS } from './weather-locations';
import type { RadarRssArticle } from './rss-collector-types';

/**
 * Recherche universelle (Ctrl K, UX-502) : correspondances locales et instantanées pour les pays, les villes météo
 * et les dépêches déjà publiées ; les chaînes passent par /api/channels (recherche serveur existante).
 */
export const MIN_REMOTE_QUERY = 2;

const COUNTRIES: PickerCountry[] = AFRICAN_COUNTRIES.map(({ code, name }) => ({ code, name }));

export function searchCountries(query: string, limit = 5): PickerCountry[] {
  return normalizeSearch(query) ? filterCountries(COUNTRIES, query).slice(0, limit) : [];
}

export type CityHit = { city: string; code: string; countryName: string };

export function searchCities(query: string, limit = 3): CityHit[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  return QUICK_WEATHER_LOCATIONS
    .filter(location => normalizeSearch(location.city).includes(q))
    .slice(0, limit)
    .map(({ city, code, countryName }) => ({ city, code, countryName }));
}

export type ArticleHit = { title: string; url: string; sourceName: string; publishedAt: string | null };

/**
 * Dépêches dont le titre contient tous les mots de la requête (accents ignorés), les plus récentes d'abord,
 * sans doublon : même URL canonique (paramètres de suivi retirés) ou même titre.
 */
export function searchArticles(articles: readonly Pick<RadarRssArticle, 'title' | 'url' | 'sourceName' | 'publishedAt'>[], query: string, limit = 5): ArticleHit[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean);
  if (!words.length || normalizeSearch(query).length < MIN_REMOTE_QUERY) return [];
  const seen = new Set<string>();
  return [...articles]
    .sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0))
    .filter(article => {
      if (!/^https:\/\//.test(article.url)) return false;
      const title = normalizeSearch(article.title);
      if (!words.every(word => title.includes(word))) return false;
      const keys = [canonicalArticleUrl(article.url) || article.url, title];
      if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key));
      return true;
    })
    .slice(0, limit)
    .map(({ title, url, sourceName, publishedAt }) => ({ title, url, sourceName, publishedAt }));
}

/** Lien vers la TV avec la recherche du catalogue pré-remplie. */
export function catalogSearchHref(query: string) {
  return `/app?search=${encodeURIComponent(query.trim().slice(0, 200))}`;
}
