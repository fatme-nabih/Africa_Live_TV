const regionNameFormatter = new Intl.DisplayNames(['fr'], { type: 'region' });
const languageNameFormatter = new Intl.DisplayNames(['fr'], { type: 'language' });

export function formatCountryName(code: string | null | undefined, fallback = 'International') {
  if (!code) return fallback;

  try {
    return regionNameFormatter.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function formatLanguageName(
  code: string | null | undefined,
  fallback = 'Non renseignée',
) {
  if (!code) return fallback;

  try {
    return languageNameFormatter.of(code.toLowerCase()) || code;
  } catch {
    return code;
  }
}

/** « 1 dépêche », « 8 dépêches » : en français, 0 et 1 restent au singulier. */
export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count > 1 ? plural : singular}`;
}
