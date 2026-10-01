'use client';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { catalogFilterUrl, catalogFiltersFromUrl, catalogPreset, EMPTY_CATALOG_FILTERS } from '@/lib/catalog-filter-state';
import type { ChannelFilters } from '@/types/channel';
import type { CategoryPreset } from './CategoryTabs';

export function useCatalogFilters() {
  const params = useSearchParams();
  const serialized = params.toString();
  const { filters, favoritesOnly } = useMemo(() => catalogFiltersFromUrl(new URLSearchParams(serialized)), [serialized]);
  const update = useCallback((next: ChannelFilters, favorites = favoritesOnly) => {
    const href = catalogFilterUrl(window.location.href, next, favorites);
    if (href !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, '', href);
  }, [favoritesOnly]);
  const selectPreset = useCallback((preset: CategoryPreset) => {
    if (preset.id === 'all') update(EMPTY_CATALOG_FILTERS, false);
    else if (preset.id === 'favorites') update(filters, !favoritesOnly);
    else if (preset.id === 'africa') update({ ...filters, country: '', region: 'africa' }, false);
    else if (preset.id === 'senegal') update({ ...filters, country: 'SN', region: '' }, false);
    else update({ ...filters, group: preset.group ?? '' }, false);
  }, [filters, favoritesOnly, update]);
  return { filters, favoritesOnly, update, selectPreset, activePresetId: catalogPreset(filters, favoritesOnly),
    reset: () => update(EMPTY_CATALOG_FILTERS, false), setFavoritesOnly: (value: boolean) => update(filters, value) };
}
