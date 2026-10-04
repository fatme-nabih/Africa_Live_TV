/**
 * Pays suivis (UX-503) : 1 à 5 pays épinglés sur l'appareil, le premier est le pays principal
 * (Radar ouvert dessus, rangée « en direct » de la TV). La synchronisation au compte est un ticket de migration séparé.
 */
export const MAX_FOLLOWED_COUNTRIES = 5;
export const FOLLOWED_COUNTRIES_EVENT = 'al_followed_countries_change';

/** Lit la valeur stockée : codes connus seulement, sans doublon, bornée. */
export function parseFollowedCountries(raw: string | null, valid: ReadonlySet<string>): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const code = item.trim().toUpperCase();
      if (valid.has(code) && !list.includes(code)) list.push(code);
      if (list.length === MAX_FOLLOWED_COUNTRIES) break;
    }
    return list;
  } catch {
    return [];
  }
}

/** Suit ou ne suit plus un pays. Au-delà de 5, la liste est inchangée (l'interface désactive alors le bouton). */
export function toggleFollowedCountry(list: readonly string[], code: string): string[] {
  if (list.includes(code)) return list.filter(item => item !== code);
  return list.length >= MAX_FOLLOWED_COUNTRIES ? [...list] : [...list, code];
}

/** Place un pays suivi en tête : il devient le pays principal. */
export function makePrimaryCountry(list: readonly string[], code: string): string[] {
  return list.includes(code) ? [code, ...list.filter(item => item !== code)] : [...list];
}

/**
 * Synchronisation au compte (UX-503b) : le compte fait foi, enrichi des pays suivis sur cet appareil (dans la limite de 5).
 * Un appareil neuf récupère donc les pays du compte ; un premier appareil envoie les siens.
 */
export function mergeFollowedCountries(account: readonly string[], device: readonly string[]): string[] {
  const merged: string[] = [];
  for (const code of [...account, ...device]) {
    if (!merged.includes(code)) merged.push(code);
    if (merged.length === MAX_FOLLOWED_COUNTRIES) break;
  }
  return merged;
}

export function sameFollowedCountries(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((code, index) => code === b[index]);
}
