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
