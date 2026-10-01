import type { ChannelFilters } from '@/types/channel';
import { categoryCodes, canonicalLanguage } from './catalog-metadata';
export const EMPTY_CATALOG_FILTERS: ChannelFilters = { search: '', country: '', group: '', language: '', status: '', region: '' };
export function catalogFiltersFromUrl(params: URLSearchParams) {
  const country = params.get('country')?.trim().toUpperCase() ?? '';
  return { filters: { ...EMPTY_CATALOG_FILTERS,
    search: (params.get('search') ?? '').slice(0, 200), country: /^[A-Z]{2}$/.test(country) ? country : '',
    group: params.get('group') ? categoryCodes(params.get('group'))[0] : '',
    language: params.get('language') ? canonicalLanguage(params.get('language')!) : '',
    region: params.get('region') === 'africa' ? 'africa' : '',
    status: ['BROWSER_OK', 'VLC_ONLY', 'UNTESTED'].includes(params.get('status') ?? '') ? params.get('status') : '',
  } as ChannelFilters, favoritesOnly: params.get('favorites') === '1' };
}
export function catalogFilterUrl(href: string, filters: ChannelFilters, favoritesOnly: boolean) {
  const url = new URL(href);
  for (const field of ['search', 'country', 'group', 'language', 'region', 'status'] as const) {
    const value = filters[field];
    if (value) url.searchParams.set(field, value); else url.searchParams.delete(field);
  }
  if (favoritesOnly) url.searchParams.set('favorites', '1'); else url.searchParams.delete('favorites');
  return url.pathname + url.search + url.hash;
}
export function catalogPreset(filters: ChannelFilters, favoritesOnly: boolean) {
  if (favoritesOnly) return 'favorites';
  const groups: Record<string, string> = { News: 'news', Entertainment: 'entertainment', Movies: 'movies', Sports: 'sports', Series: 'series' };
  if (filters.group) return groups[filters.group] ?? '';
  if (filters.country === 'SN') return 'senegal';
  if (filters.region === 'africa' && !filters.country) return 'africa';
  return Object.values(filters).some(Boolean) ? '' : 'all';
}
export function catalogCountryHref(country: string | null | undefined) {
  return country && /^[A-Z]{2}$/.test(country) ? `/app?country=${encodeURIComponent(country)}` : '/app';
}
