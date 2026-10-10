'use client';
import { useCallback, useMemo } from 'react';
import { usePreferences } from '@/components/shell/usePreferences';
import { displayFavorites, toggleFavoriteIntent } from '@/lib/preference-store';
import { rejectedFavoritesMessage } from '@/lib/legacy-preferences';
export function useFavorites() {
  const { owner, snapshot, retry } = usePreferences('favorites');
  const favorites = useMemo(() => displayFavorites(snapshot),[snapshot]);
  const toggleFavorite = useCallback((id: string) => toggleFavoriteIntent(owner,id),[owner]);
  return { favorites, favoriteError: snapshot.errors.favorites ?? (snapshot.rejectedFavorites.length ? rejectedFavoritesMessage(snapshot.rejectedFavorites.length) : null), favoritesRevision: snapshot.favoriteRevision, toggleFavorite, synchronizeFavorites: retry };
}
