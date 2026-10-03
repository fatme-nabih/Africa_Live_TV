import { categoryCodes } from './catalog-metadata';
import { AFRICAN_COUNTRIES } from './radar-countries';

const AFRICAN_COUNTRY_CODES = AFRICAN_COUNTRIES.map(country => country.code);

/**
 * Chiffres publics de la landing, calculés depuis la base (jamais en dur).
 * Mêmes règles que le catalogue : chaîne active, visible publiquement, au moins une source affichable.
 * Aucune donnée personnelle : uniquement des comptes agrégés par pays et par catégorie.
 */
export type PublicStatsRow = { countryCode: string | null; groupTitle: string | null; count: number };

export type PublicCategoryId = 'news' | 'sports' | 'music' | 'movies';

export type PublicStats = {
  totalChannels: number;
  africanChannels: number;
  africanCountries: number;
  categories: Record<PublicCategoryId, number>;
  updatedAt: string;
};

const CATEGORY_CODES: Record<PublicCategoryId, readonly string[]> = {
  news: ['News'],
  sports: ['Sports'],
  music: ['Music'],
  movies: ['Movies', 'Series'],
};

export function summarizePublicStats(rows: readonly PublicStatsRow[], now = new Date()): PublicStats {
  const african = new Set<string>(AFRICAN_COUNTRY_CODES);
  const countries = new Set<string>();
  const categories: Record<PublicCategoryId, number> = { news: 0, sports: 0, music: 0, movies: 0 };
  let totalChannels = 0;
  let africanChannels = 0;

  for (const row of rows) {
    const count = Math.max(0, Math.trunc(Number(row.count) || 0));
    if (!count) continue;
    totalChannels += count;
    const code = row.countryCode?.trim().toUpperCase();
    if (code && african.has(code)) {
      africanChannels += count;
      countries.add(code);
    }
    const codes = categoryCodes(row.groupTitle);
    for (const id of Object.keys(CATEGORY_CODES) as PublicCategoryId[]) {
      if (CATEGORY_CODES[id].some(wanted => codes.includes(wanted))) categories[id] += count;
    }
  }

  return { totalChannels, africanChannels, africanCountries: countries.size, categories, updatedAt: now.toISOString() };
}

const formatter = new Intl.NumberFormat('fr-FR');

/** « 14 205 » : espace insécable (l'espace fine de fr-FR n'a pas de glyphe dans la police des titres). */
export function formatCount(value: number) {
  return formatter.format(value).replace(/\u202f/g, '\u00a0');
}
