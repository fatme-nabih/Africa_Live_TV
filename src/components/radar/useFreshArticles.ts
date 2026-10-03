'use client';

import { useCallback, useMemo, useState } from 'react';
import { canonicalArticleUrl } from '@/lib/radar-data';
import { splitArrivals } from '@/lib/radar-fresh';
import type { RadarArticle } from '@/lib/live-osint-types';

type Tracker = {
  localKey: string;
  refreshToken: number;
  dataVersion: number;
  /** Dépêches déjà « libérées » (affichées) ; `null` tant que la première liste n'est pas arrivée. */
  released: ReadonlySet<string> | null;
  /** « Actualiser » vient d'être demandé : la prochaine réponse s'affiche entièrement. */
  manual: boolean;
};

/**
 * Rafraîchissement doux (UX-308) : après le premier affichage, les dépêches qui arrivent d'elles-mêmes
 * attendent derrière une pastille « n nouvelles ↑ » au lieu de s'insérer et de décaler la lecture.
 * Un changement de pays ou de rubrique, un clic sur « Actualiser » ou sur la pastille les affiche.
 */
export function useFreshArticles(
  articles: RadarArticle[],
  { localKey, refreshToken, dataVersion }: { localKey: string; refreshToken: number; dataVersion: number },
) {
  const keys = useMemo(() => articles.map(article => canonicalArticleUrl(article.url)), [articles]);
  const [tracker, setTracker] = useState<Tracker>({ localKey, refreshToken, dataVersion, released: null, manual: false });

  // État ajusté pendant le rendu (schéma recommandé par React) : aucun effet, donc aucun rendu intermédiaire.
  let next = tracker;
  if (next.localKey !== localKey) next = { ...next, localKey, released: null };
  if (next.refreshToken !== refreshToken) next = { ...next, refreshToken, manual: true };
  if (next.dataVersion !== dataVersion) {
    next = { ...next, dataVersion };
    if (next.manual) next = { ...next, manual: false, released: new Set(keys) };
  }
  if (next.released === null && keys.length > 0) next = { ...next, released: new Set(keys) };
  if (next !== tracker) setTracker(next);

  const { shown, pending } = useMemo(
    () => splitArrivals(articles, article => canonicalArticleUrl(article.url), next.released),
    [articles, next.released],
  );
  const release = useCallback(() => setTracker(current => ({ ...current, released: new Set(keys) })), [keys]);
  return { shown, pendingCount: pending.length, release };
}
