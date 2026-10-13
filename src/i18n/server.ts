import { DEFAULT_EDITION } from '@/lib/editions';
import { getDictionary, pickNamespaces, type Dictionary, type Namespace } from './dictionary';
import { getEdition } from './edition';

/** Édition et dictionnaire de la page en cours (Server Components). */
export async function getI18n() {
  const edition = await getEdition();
  return { edition, t: getDictionary(edition) };
}

/** Messages à transmettre au fournisseur client : rien pour le français (déjà dans le bundle du navigateur). */
export function clientMessages(edition: Parameters<typeof getDictionary>[0], namespaces: readonly Namespace[]): Partial<Dictionary> | undefined {
  return edition === DEFAULT_EDITION ? undefined : pickNamespaces(getDictionary(edition), namespaces);
}
