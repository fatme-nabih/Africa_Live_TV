'use client';
import { useCallback, useMemo } from 'react';
import { usePreferences } from '@/components/shell/usePreferences';
import { displayFavorites, toggleFavoriteIntent } from '@/lib/preference-store';
import { useI18n } from '@/i18n/client';
import { formatPlural } from '@/i18n/message';
import { preferenceErrorText } from '@/lib/preference-error-text';
export function useFavorites() {
  const { t, edition } = useI18n();
  const { owner, snapshot, retry } = usePreferences('favorites');
  const favorites = useMemo(() => displayFavorites(snapshot),[snapshot]);
  const toggleFavorite = useCallback((id: string) => toggleFavoriteIntent(owner,id),[owner]);
  const favoriteError = snapshot.errors.favorites
    ? preferenceErrorText(snapshot.errors.favorites, t.shell.preferenceErrors.copy)
    : snapshot.rejectedFavorites.length ? formatPlural(t.shell.preferenceErrors.rejectedFavorites, snapshot.rejectedFavorites.length, {}, edition) : null;
  return { favorites, favoriteError, favoritesRevision: snapshot.favoriteRevision, toggleFavorite, synchronizeFavorites: retry };
}
