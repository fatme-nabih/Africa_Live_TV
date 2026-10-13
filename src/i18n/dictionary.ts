import type { Edition } from '@/lib/editions';
import { fr } from './fr';
import { en } from './en';
import { ar } from './ar';
import type { Widen } from './message';

/** Forme commune des dictionnaires, tirée du français. */
export type Dictionary = Widen<typeof fr>;
export type Namespace = keyof Dictionary;

/** Dictionnaires disponibles. Une édition y est ajoutée en même temps qu'à `READY_EDITIONS` (src/lib/editions.ts). */
export const DICTIONARIES: Readonly<Partial<Record<Edition, Dictionary>>> = { fr, en, ar };

/** Dictionnaire d'une édition ; repli sur le français (le français est toujours complet). */
export function getDictionary(edition: Edition): Dictionary {
  return DICTIONARIES[edition] ?? fr;
}

/** Espaces de noms transmis au navigateur, pour ne pas envoyer tout le dictionnaire. */
export function pickNamespaces(dictionary: Dictionary, namespaces: readonly Namespace[]): Partial<Dictionary> {
  return Object.fromEntries(namespaces.map(namespace => [namespace, dictionary[namespace]])) as Partial<Dictionary>;
}
