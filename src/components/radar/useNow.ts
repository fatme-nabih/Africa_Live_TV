'use client';

import { useEffect, useState } from 'react';

/** Heure courante rafraîchie à intervalle régulier. Vaut 0 avant le montage (rendu serveur identique au premier rendu client). */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);
  return now;
}
