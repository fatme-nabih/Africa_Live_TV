import { countryName } from './country-names';
import { displayNames, intlLanguage } from '@/i18n/format';
import { DEFAULT_EDITION, type Edition } from './editions';

export function formatCountryName(code: string | null | undefined, fallback = 'International', edition: Edition = DEFAULT_EDITION) {
  if (!code) return fallback;
  if (edition !== 'fr' && /^[a-z]{2}$/i.test(code)) return countryName(code, edition);

  try {
    return displayNames(intlLanguage(edition), 'region').of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function formatLanguageName(
  code: string | null | undefined,
  fallback = 'Non renseignée',
  edition: Edition = DEFAULT_EDITION,
) {
  if (!code) return edition === 'en' && fallback === 'Non renseignée' ? 'Not specified' : fallback;

  try {
    return displayNames(intlLanguage(edition), 'language').of(code.toLowerCase()) || code;
  } catch {
    return code;
  }
}

/** « 1 dépêche », « 8 dépêches » : en français, 0 et 1 restent au singulier. */
export function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count > 1 ? plural : singular}`;
}
