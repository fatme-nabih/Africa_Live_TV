import { editionPriorityCountries } from './edition-affinity';
import { fr } from '@/i18n/fr';
import { collator, intlLanguage } from '@/i18n/format';
import { format, formatPlural } from '@/i18n/message';
import type { Dictionary } from '@/i18n/dictionary';
import { DEFAULT_EDITION, type Edition } from './editions';
import { filterCountries, normalizeSearch } from './country-picker';
import type { CountryChannelCount } from './live-channels-types';

type GridLabels = Dictionary['radar']['grid'];

/** Noms trop longs pour une carte de la grille : le nom complet reste dans le libellé accessible. */
export function gridCountryName(country: { code: string; name: string }, labels: GridLabels = fr.radar.grid): string {
  return (labels.shortNames as Record<string, string>)[country.code] ?? country.name;
}

export function channelCountLabel(count: number, labels: GridLabels = fr.radar.grid, edition: Edition = DEFAULT_EDITION): string {
  return formatPlural(labels.channels, count, {}, edition);
}

/**
 * Ce que la carte d'un pays met en avant : d'abord ce qui se lit tout de suite dans le navigateur, puis le total.
 * Le reste n'est pas compté « avec VLC » : toutes ces sources ne sont pas vérifiées pour VLC.
 * Un pays sans lecture navigateur l'annonce, comme les lignes de chaînes, au lieu de rester muet.
 */
export function countryPlayback(info: Pick<CountryChannelCount, 'channelCount' | 'directWebCount'> | undefined, labels: GridLabels = fr.radar.grid, edition: Edition = DEFAULT_EDITION) {
  const total = info?.channelCount ?? 0;
  const inBrowser = Math.min(info?.directWebCount ?? 0, total);
  return {
    total,
    inBrowser,
    primary: inBrowser > 0 ? format(labels.inBrowser, { count: inBrowser }) : labels.withVlc,
    totalLabel: channelCountLabel(total, labels, edition),
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
  edition: Edition = DEFAULT_EDITION,
): { pinned: T[]; others: T[] } {
  const count = (code: string) => counts?.[code]?.channelCount ?? 0;
  const available = countries.filter(country => count(country.code) > 0);
  const byCode = new Map(available.map(country => [country.code, country]));
  const pinned = [...new Set(followed)].flatMap(code => byCode.get(code) ?? []);
  const pinnedCodes = new Set(pinned.map(country => country.code));
  const priorities = edition === 'fr' ? [] : editionPriorityCountries(edition);
  const priority = (code: string) => { const index = priorities.indexOf(code); return index < 0 ? priorities.length : index; };
  const others = available
    .filter(country => !pinnedCodes.has(country.code))
    .sort((a, b) => priority(a.code) - priority(b.code) || count(b.code) - count(a.code) || collator(intlLanguage(edition)).compare(a.name, b.name));
  return { pinned, others };
}

/**
 * Régions de la grille, dans l'ordre d'affichage. `region` est la clé des données (radar-countries.ts, en français) ;
 * les libellés visibles (court pour les pastilles, long pour le nom accessible) viennent du dictionnaire.
 */
export const GRID_REGIONS = [
  { id: 'west', region: 'Afrique de l’Ouest', label: fr.radar.grid.regionShort.west },
  { id: 'central', region: 'Afrique centrale', label: fr.radar.grid.regionShort.central },
  { id: 'east', region: 'Afrique de l’Est', label: fr.radar.grid.regionShort.east },
  { id: 'north', region: 'Afrique du Nord', label: fr.radar.grid.regionShort.north },
  { id: 'south', region: 'Afrique australe', label: fr.radar.grid.regionShort.south },
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
  labels: GridLabels = fr.radar.grid,
): { pinned: T[]; others: T[] } {
  const all = [...grid.pinned, ...grid.others];
  const matches = normalizeSearch(query)
    ? new Set([
        ...filterCountries(all, query).map(country => country.code),
        ...all.filter(country => normalizeSearch(gridCountryName(country, labels)).includes(normalizeSearch(query))).map(country => country.code),
      ])
    : null;
  const keep = (country: T) => (!region || country.region === region) && (!matches || matches.has(country.code));
  return { pinned: grid.pinned.filter(keep), others: grid.others.filter(keep) };
}
