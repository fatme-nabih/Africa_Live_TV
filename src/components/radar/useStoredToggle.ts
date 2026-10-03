'use client';

import { useCallback, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'al_radar_pref_change';
// Repli si le stockage du navigateur est indisponible (navigation privée) : la bascule marche le temps de la page.
const memory = new Map<string, boolean>();

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function read(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // Stockage indisponible : valeur de la page.
  }
  return memory.get(key) ?? fallback;
}

/** Bascule (déplié / replié) mémorisée sur l'appareil. Le rendu serveur et le premier rendu client donnent la valeur par défaut. */
export function useStoredToggle(key: string, defaultValue: boolean) {
  const value = useSyncExternalStore(subscribe, () => read(key, defaultValue), () => defaultValue);
  const set = useCallback((next: boolean) => {
    memory.set(key, next);
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      // Stockage indisponible : la préférence ne survit pas au rechargement.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [key]);
  return [value, set] as const;
}
