import { DEFAULT_EDITION, type Edition } from '@/lib/editions';
import { pluralCategory } from './format';

/**
 * Messages des dictionnaires : chaînes simples, gabarits `{nom}` et objets de pluriel (`{ one, other }`, plus `zero`, `two`,
 * `few`, `many` en arabe). Tout reste sérialisable : un dictionnaire peut passer du serveur au navigateur.
 */
export type PluralMessage = Readonly<Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }>;

/** Remplace `{nom}` par la valeur fournie ; un nom absent reste tel quel (visible en relecture plutôt que vide). */
export function format(template: string, values: Readonly<Record<string, string | number>> = {}) {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

/** Forme plurielle selon `Intl.PluralRules` de l'édition, avec `{count}` et les autres valeurs. */
export function formatPlural(message: PluralMessage, count: number, values: Readonly<Record<string, string | number>> = {}, edition: Edition = DEFAULT_EDITION) {
  return format(message[pluralCategory(edition, count)] ?? message.other, { count, ...values });
}

type WidenObject<T> = { readonly [K in keyof T]: Widen<T[K]> };

/**
 * Garde toutes les clés françaises obligatoires, sans figer les textes ni les catégories de pluriel.
 * Seuls les objets composés de catégories Intl avec `other` sont des pluriels : un espace de noms ordinaire
 * ne devient jamais facultatif. L'arabe peut ajouter `zero`, `two`, `few` et `many` (EDI-104).
 */
export type Widen<T> = T extends string ? string
  : T extends readonly (infer Item)[] ? readonly Widen<Item>[]
  : T extends Readonly<{ other: string }>
    ? keyof T extends Intl.LDMLPluralRule ? WidenObject<T> & PluralMessage : WidenObject<T>
    : WidenObject<T>;
