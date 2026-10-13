import type { Dictionary } from '@/i18n/dictionary';
import { displayNames, intlLanguage } from '@/i18n/format';
import { DEFAULT_EDITION, type Edition } from './editions';
const key = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');
const categories: Record<string, string> = {
  News: 'Actualités', Business: 'Économie', General: 'Généralistes', Entertainment: 'Divertissement',
  Movies: 'Cinéma', Series: 'Séries', Sports: 'Sports', Kids: 'Jeunesse', Education: 'Éducation',
  Religious: 'Religion', Music: 'Musique', Legislative: 'Parlement', Documentary: 'Documentaires',
  Culture: 'Culture', Lifestyle: 'Art de vivre', Shop: 'Téléachat', Comedy: 'Comédie', Animation: 'Animation',
  Classic: 'Classiques', Outdoor: 'Plein air', Travel: 'Voyage', Family: 'Famille', Cooking: 'Cuisine',
  Auto: 'Automobile', Weather: 'Météo', Science: 'Sciences', Public: 'Service public', Relax: 'Détente',
};
const aliases = new Map(Object.entries(categories).flatMap(([code, label]) => [[key(code), code], [key(label), code]]));
// Sans catégorie exploitable, une chaîne est présentée comme généraliste (pas de code brut ni de « non renseignée »).
for (const alias of ['undefined', 'unknown', 'non renseignee', '']) aliases.set(alias, 'General');
aliases.set('actualites', 'News'); aliases.set('sport', 'Sports'); aliases.set('movie', 'Movies');
aliases.set('informations', 'News'); aliases.set('info', 'News');

export function categoryCodes(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return ['General'];
  return [...new Set(raw.split(/[;|,]/).map(token => aliases.get(key(token)) ?? key(token)))];
}
export function categoryLabel(code: string, edition: Edition = DEFAULT_EDITION, labels?: Dictionary['tv']['categories']) {
  return labels?.[code as keyof typeof labels] ?? (edition === 'en' ? code.replace(/([a-z])([A-Z])/g, '$1 $2') : categories[code] ?? 'Autre catégorie');
}
export function categoryLabels(raw: string | null | undefined, edition: Edition = DEFAULT_EDITION, labels?: Dictionary['tv']['categories']) {
  return categoryCodes(raw).map(code => categoryLabel(code, edition, labels)).join(' · ');
}
const languageAliases: Record<string, string> = { francais: 'fr', french: 'fr', anglais: 'en', english: 'en', arabe: 'ar', arabic: 'ar', wolof: 'wo' };
export function canonicalLanguage(raw: string): string {
  const token = key(raw);
  if (languageAliases[token]) return languageAliases[token];
  if (['', 'undefined', 'unknown', 'und', 'non renseignee'].includes(token)) return 'unknown';
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/.test(token)) return 'unknown';
  try { return Intl.getCanonicalLocales(token)[0].toLowerCase(); } catch { return 'unknown'; }
}
export function catalogLanguageCodes(raw: string | null | undefined) {
  return raw?.trim() ? [...new Set(raw.split(/[;,|]/).map(canonicalLanguage))] : ['unknown'];
}
export function catalogLanguageLabel(code: string, edition: Edition = DEFAULT_EDITION) {
  if (code === 'unknown') return edition === 'en' ? 'Language not specified' : 'Langue non renseignée';
  try { const name = displayNames(intlLanguage(edition), 'language').of(code); return name && name !== code ? name : edition === 'en' ? 'Other language' : 'Autre langue'; }
  catch { return edition === 'en' ? 'Other language' : 'Autre langue'; }
}
export function metadataValuesMatching(rows: (string | null)[], code: string, kind: 'category' | 'language') {
  const parse = kind === 'category' ? categoryCodes : catalogLanguageCodes;
  const wanted = kind === 'category' ? categoryCodes(code)[0] : canonicalLanguage(code);
  return [...new Set(rows.filter(raw => parse(raw).includes(wanted)))];
}
