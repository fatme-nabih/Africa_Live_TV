import type { Edition } from './editions';
import { EDITIONS } from './editions';

/** Sphères de presse de l'étude §2.3 ; aucune restriction du catalogue ou des droits. */
export const EDITION_AFFINITY: Record<string, readonly Edition[]> = {
  DZ: ['ar', 'fr'], AO: ['en'], BJ: ['fr'], BW: ['en'], BF: ['fr'], BI: ['fr', 'en'], CV: ['en'], CM: ['fr', 'en'], CF: ['fr'], TD: ['fr', 'ar'],
  KM: ['fr', 'ar'], CG: ['fr'], CD: ['fr'], CI: ['fr'], DJ: ['fr', 'ar'], EG: ['ar', 'en'], GQ: ['fr'], ER: ['en', 'ar'], SZ: ['en'], ET: ['en'],
  GA: ['fr'], GM: ['en'], GH: ['en'], GN: ['fr'], GW: ['fr'], KE: ['en'], LS: ['en'], LR: ['en'], LY: ['ar', 'en'], MG: ['fr'], MW: ['en'],
  ML: ['fr'], MR: ['ar', 'fr'], MU: ['en', 'fr'], MA: ['ar', 'fr'], MZ: ['en'], NA: ['en'], NE: ['fr'], NG: ['en'], RW: ['en', 'fr'],
  ST: ['fr'], SN: ['fr'], SC: ['en', 'fr'], SL: ['en'], SO: ['en', 'ar'], ZA: ['en'], SS: ['en', 'ar'], SD: ['ar', 'en'], TZ: ['en'], TG: ['fr'],
  TN: ['ar', 'fr'], UG: ['en'], EH: ['ar', 'fr'], ZM: ['en'], ZW: ['en'],
};
export const EDITION_CHANNEL_LANGUAGE: Record<Edition, string> = { fr: 'fra', en: 'eng', ar: 'ara' };
export function editionPriorityCountries(edition: Edition): string[] {
  return [EDITIONS[edition].defaultCountry, ...EDITIONS[edition].secondaryCountries];
}
export function editionLanguageRank(language: string | null | undefined, edition: Edition): 0 | 1 {
  const aliases: Record<Edition, string[]> = { fr: ['fra', 'fre', 'fr', 'french', 'français'], en: ['eng', 'en', 'english'], ar: ['ara', 'ar', 'arabic', 'arabe'] };
  return language?.toLowerCase().split(/[;,|]/).some(code => aliases[edition].includes(code.trim()) || code.trim().startsWith(edition + '-')) ? 0 : 1;
}
