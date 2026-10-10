import { filterCountries, normalizeSearch } from './country-picker';
import type { CountryChannelCount } from './live-channels-types';

/** Noms trop longs pour une carte de la grille : le nom complet reste dans le libellé accessible. */
const SHORT_NAMES: Record<string, string> = {
  CD: 'RD Congo',
  CF: 'Centrafrique',
  CG: 'Congo',
  ST: 'São Tomé',
};

export function gridCountryName(country: { code: string; name: string }): string {
  return SHORT_NAMES[country.code] ?? country.name;
}

export function channelCountLabel(count: number): string {
  return `${count} chaîne${count > 1 ? 's' : ''}`;
}

/**
 * Ce que la carte d'un pays met en avant : d'abord ce qui se lit tout de suite dans le navigateur, puis le total.
 * Le reste n'est pas compté « avec VLC » : toutes ces sources ne sont pas vérifiées pour VLC.
 * Un pays sans lecture navigateur l'annonce, comme les lignes de chaînes, au lieu de rester muet.
 */
export function countryPlayback(info: Pick<CountryChannelCount, 'channelCount' | 'directWebCount'> | undefined) {
  const total = info?.channelCount ?? 0;
  const inBrowser = Math.min(info?.directWebCount ?? 0, total);
  return {
    total,
    inBrowser,
    primary: inBrowser > 0 ? `${inBrowser} dans le navigateur` : 'Avec VLC',
    totalLabel: channelCountLabel(total),
  };
}

/**
 * Pays de la grille : les pays suivis en tête (dans l'ordre choisi), puis les autres par nombre de chaînes.
 * Seuls les pays qui ont au moins une chaîne au catalogue apparaissent.
 */
export function orderCountryGrid<T extends { code: string; name: string }>(
  countries: readonly T[],
  counts: Record<string, Pick<CountryChannelCount, 'channelCount'>> | undefined,
  followed: readonly string[],
): { pinned: T[]; others: T[] } {
  const count = (code: string) => counts?.[code]?.channelCount ?? 0;
  const available = countries.filter(country => count(country.code) > 0);
  const byCode = new Map(available.map(country => [country.code, country]));
  const pinned = [...new Set(followed)].flatMap(code => byCode.get(code) ?? []);
  const pinnedCodes = new Set(pinned.map(country => country.code));
  const others = available
    .filter(country => !pinnedCodes.has(country.code))
    .sort((a, b) => count(b.code) - count(a.code) || a.name.localeCompare(b.name, 'fr'));
  return { pinned, others };
}

/** Régions de la grille, dans l'ordre d'affichage, avec un libellé court pour les pastilles. */
export const GRID_REGIONS = [
  { region: 'Afrique de l’Ouest', label: 'Ouest' },
  { region: 'Afrique centrale', label: 'Centre' },
  { region: 'Afrique de l’Est', label: 'Est' },
  { region: 'Afrique du Nord', label: 'Nord' },
  { region: 'Afrique australe', label: 'Australe' },
] as const;

/** Nombre de pays de la grille par région : une pastille sans pays n'est pas proposée. */
export function regionCounts(countries: readonly { region: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const country of countries) counts[country.region] = (counts[country.region] ?? 0) + 1;
  return counts;
}

/**
 * Recherche (sans accents, code pays, noms d'usage comme « rdc ») et région appliquées aux deux blocs de la grille.
 * L'ordre reste celui de la grille : pays suivis puis nombre de chaînes.
 */
export function filterCountryGrid<T extends { code: string; name: string; region: string }>(
  grid: { pinned: T[]; others: T[] },
  query: string,
  region: string | null,
): { pinned: T[]; others: T[] } {
  const all = [...grid.pinned, ...grid.others];
  const matches = normalizeSearch(query)
    ? new Set([
        ...filterCountries(all, query).map(country => country.code),
        ...all.filter(country => normalizeSearch(gridCountryName(country)).includes(normalizeSearch(query))).map(country => country.code),
      ])
    : null;
  const keep = (country: T) => (!region || country.region === region) && (!matches || matches.has(country.code));
  return { pinned: grid.pinned.filter(keep), others: grid.others.filter(keep) };
}
