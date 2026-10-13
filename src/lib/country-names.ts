import { AFRICAN_COUNTRIES } from './radar-countries';
import { COUNTRY_NAMES as EN } from './country-lexicon/names-en';
import { COUNTRY_NAMES as AR } from './country-lexicon/names-ar';
import { displayNames, intlLanguage } from '@/i18n/format';
import type { Edition } from './editions';

const NAMES: Record<Edition, Record<string, string>> = {
  fr: Object.fromEntries(AFRICAN_COUNTRIES.map(c => [c.code, c.name])),
  en: { ...Object.fromEntries(Object.entries(EN).map(([code, names]) => [code, names[0]])), CD: 'DR Congo', CG: 'Republic of the Congo', EH: 'Western Sahara' },
  ar: { ...Object.fromEntries(Object.entries(AR).map(([code, names]) => [code, names[0]])), CD: 'الكونغو الديمقراطية', CG: 'جمهورية الكونغو', EH: 'الصحراء الغربية' },
};
export function countryName(code: string, edition: Edition = 'fr'): string {
  return NAMES[edition][code.toUpperCase()] ?? displayNames(intlLanguage(edition), 'region').of(code.toUpperCase()) ?? code;
}
export function editionCountries(edition: Edition) {
  return AFRICAN_COUNTRIES.map(country => ({ ...country, name: countryName(country.code, edition) }));
}
