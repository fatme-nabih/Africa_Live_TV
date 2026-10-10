'use client';
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { EMPTY_PREFERENCES, preferenceStore, reloadPreferences, retryRejectedFavorites, type PreferenceOperation } from '@/lib/preference-store';
import { startPreferenceSync } from '@/lib/preference-sync-client';
import { usePreferenceOwner } from './PreferenceOwnerContext';
export function usePreferences(operation?: PreferenceOperation) {
  const owner = usePreferenceOwner();
  const store = useMemo(() => owner && typeof window !== 'undefined' ? preferenceStore(owner) : null,[owner]);
  const subscribe = useCallback((listener: () => void) => {
    if (!store) return () => {};
    store.listeners.add(listener);
    const storage = (event: StorageEvent) => { if (event.key === store.key) reloadPreferences(store); };
    window.addEventListener('storage',storage);
    return () => { store.listeners.delete(listener); window.removeEventListener('storage',storage); };
  },[store]);
  const snapshot = useSyncExternalStore(subscribe,() => store?.snapshot ?? EMPTY_PREFERENCES,() => EMPTY_PREFERENCES);
  const running = useRef<ReturnType<typeof startPreferenceSync>|null>(null);
  useEffect(() => {
    if (!store || !operation) return;
    const task = startPreferenceSync(store,operation); running.current = task;
    return () => { task.stop(); if (running.current === task) running.current = null; };
  },[store,operation]);
  const retry = useCallback(() => {
    if (store && operation && store.blocked.has(operation)) return;
    if (store && operation === 'favorites') retryRejectedFavorites(store);
    running.current?.retry();
  },[store,operation]);
  return { owner, snapshot, retry };
}
