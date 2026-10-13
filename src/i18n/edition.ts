import { edition as editionParam } from 'next/root-params';
import { notFound } from 'next/navigation';
import { enabledEditions, isEdition, type Edition } from '@/lib/editions';

/**
 * Édition de la page en cours, lue dans le segment racine `app/[edition]` (Server Components seulement).
 * Une édition inconnue ou inactive répond 404 (`dynamicParams = false` l'empêche déjà au routage).
 */
export async function getEdition(): Promise<Edition> {
  const value: unknown = await editionParam();
  if (!isEdition(value) || !enabledEditions().includes(value)) notFound();
  return value;
}
