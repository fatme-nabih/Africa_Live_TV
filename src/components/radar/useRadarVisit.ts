'use client';
import { useEdition } from '@/i18n/client';
import { editionStorageKey } from '@/lib/edition-client';
import type { Edition } from '@/lib/editions';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { parseVisit } from '@/lib/radar-visit';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// Dernière visite figée pour toute la durée de la page : « nouvelles depuis votre visite » ne bouge pas pendant la lecture.
const pageVisits = new Map<Edition, number | null>();

function readVisit(edition: Edition): number | null {
  if (!pageVisits.has(edition)) {
    try {
      pageVisits.set(edition, parseVisit(window.localStorage.getItem(editionStorageKey(STORAGE_KEYS.radarVisit, edition)), Date.now()));
    } catch {
      pageVisits.set(edition, null);
    }
  }
  return pageVisits.get(edition) ?? null;
}

const subscribeNothing = () => () => {};

/**
 * Dernière visite du Radar, lue au chargement de la page.
 * L'heure n'est enregistrée qu'en quittant la page, et seulement si des dépêches ont été affichées
 * (une page fermée avant la fin du chargement ne fait pas oublier ce que l'utilisateur n'a pas vu).
 */
export function useRadarVisit(armed: boolean): { ready: boolean; since: number | null } {
  const edition = useEdition();
  const since = useSyncExternalStore<number | null | undefined>(subscribeNothing, () => readVisit(edition), () => undefined);
  const armedRef = useRef(armed);

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    const save = () => {
      if (!armedRef.current) return;
      try {
        window.localStorage.setItem(editionStorageKey(STORAGE_KEYS.radarVisit, edition), String(Date.now()));
      } catch {
        // Stockage indisponible : pas de repère de visite.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save();
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      save();
      // La prochaine arrivée sur le Radar relira la visite que l'on vient d'enregistrer.
      pageVisits.delete(edition);
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [edition]);

  return since === undefined ? { ready: false, since: null } : { ready: true, since };
}
