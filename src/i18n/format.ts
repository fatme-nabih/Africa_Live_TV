import { DEFAULT_EDITION, EDITIONS, type Edition } from '@/lib/editions';

/**
 * Formats purs par édition (EDI-104) : dates, heures, nombres, pluriels, tris, noms de pays et de langues.
 * Partagé serveur et navigateur. Les formateurs Intl coûtent cher à construire : ils sont gardés en mémoire par clé.
 * La sortie française reste celle des locales écrites jusqu'ici en dur (`fr-FR` ou `fr`, selon l'appel d'origine).
 */

/** Locale complète : `fr-FR`, `en-GB`, `ar-u-nu-latn` (chiffres occidentaux, D3). */
export function intlLocale(edition: Edition = DEFAULT_EDITION) {
  return EDITIONS[edition].intl;
}

/** Langue seule (`fr`, `en`, `ar`), pour les appels qui utilisaient `'fr'` : noms de pays et de langues, tris. */
export function intlLanguage(edition: Edition = DEFAULT_EDITION) {
  return edition === 'ar' ? 'ar-u-nu-latn' : edition;
}

const cache = new Map<string, unknown>();
function cached<T>(key: string, build: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (value === undefined) { value = build(); cache.set(key, value); }
  return value;
}

export function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions = {}) {
  return cached(`dt|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options));
}

export function numberFormat(locale: string, options: Intl.NumberFormatOptions = {}) {
  return cached(`nf|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options));
}

export function displayNames(locale: string, type: Intl.DisplayNamesType) {
  return cached(`dn|${locale}|${type}`, () => new Intl.DisplayNames([locale], { type }));
}

export function collator(locale: string) {
  return cached(`co|${locale}`, () => new Intl.Collator(locale));
}

/** Catégorie de pluriel : l'arabe en a six (`zero`, `one`, `two`, `few`, `many`, `other`). */
export function pluralCategory(edition: Edition, count: number): Intl.LDMLPluralRule {
  return cached(`pl|${edition}`, () => new Intl.PluralRules(intlLocale(edition))).select(count);
}

/** Forme du pluriel ; `other` sert de repli quand une catégorie manque. */
export function plural(edition: Edition, count: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) {
  return forms[pluralCategory(edition, count)] ?? forms.other;
}

/** « il y a 3 heures », « 3 hours ago », « قبل 3 ساعات ». */
export function relativeTime(edition: Edition, value: number, unit: Intl.RelativeTimeFormatUnit, style: Intl.RelativeTimeFormatStyle = 'long') {
  return cached(`rt|${edition}|${style}`, () => new Intl.RelativeTimeFormat(intlLocale(edition), { numeric: 'auto', style })).format(value, unit);
}
