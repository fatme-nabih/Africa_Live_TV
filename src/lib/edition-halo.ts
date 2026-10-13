import type { Edition } from './editions';
import { EDITION_AFFINITY } from './edition-affinity';

/**
 * Halo de la sphère (EDI-602) : après un changement d'édition choisi par l'utilisateur, la carte du Radar allume une fois
 * les pays de la sphère de presse de l'édition. Marque de session seulement (aucun cookie, rien côté serveur).
 */
export const EDITION_CHANGE_KEY = 'al_edition_changed';
export const EDITION_HALO_MS = 2_400;

type SessionLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Pays où l'édition fait partie des langues de presse (`edition-affinity.ts`), dans l'ordre alphabétique des codes. */
export function editionSphere(edition: Edition): string[] {
  return Object.entries(EDITION_AFFINITY).filter(([, editions]) => editions.includes(edition)).map(([code]) => code).sort();
}

export function markEditionChange(edition: Edition, storage: SessionLike | null): void {
  try { storage?.setItem(EDITION_CHANGE_KEY, edition); } catch { /* stockage refusé : pas de halo, rien d'autre ne change */ }
}

/**
 * Consomme la marque une seule fois. Rien en mode Éco ni en mouvement réduit (`calm`), et rien si la marque vise une autre
 * édition : la marque est retirée dans tous les cas pour que le halo ne revienne pas plus tard.
 */
export function consumeEditionHalo(edition: Edition, storage: SessionLike | null, calm: boolean): string[] | null {
  let marked: string | null = null;
  try {
    marked = storage?.getItem(EDITION_CHANGE_KEY) ?? null;
    if (marked !== null) storage?.removeItem(EDITION_CHANGE_KEY);
  } catch { return null; }
  return marked === edition && !calm ? editionSphere(edition) : null;
}
