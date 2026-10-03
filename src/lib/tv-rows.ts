import { channelSchema, type CatalogRequest } from './api-contracts';
import { STORAGE_KEYS } from './storage-keys';
import type { Channel, ChannelFilters } from '@/types/channel';

// Rangées de l'accueil TV : mêmes requêtes que le catalogue (/api/channels), chargées à la demande et gardées en session.
export const TV_ROW_LIMIT = 12;
export const TV_ROWS_CACHE_TTL_MS = 5 * 60_000;
export const DEFAULT_FOLLOWED_COUNTRY = 'SN';

export type TvRowId = 'favorites' | 'country' | 'news' | 'sports' | 'music';
export const TV_ROW_IDS: readonly TvRowId[] = ['favorites', 'country', 'news', 'sports', 'music'];

const GROUPS: Partial<Record<TvRowId, string>> = { news: 'News', sports: 'Sports', music: 'Music' };

export function tvRowRequest(id: TvRowId, followedCountry: string = DEFAULT_FOLLOWED_COUNTRY): CatalogRequest {
  return {
    search: '',
    country: id === 'country' ? followedCountry : '',
    region: '',
    group: GROUPS[id] ?? '',
    language: '',
    status: '',
    favoritesOnly: id === 'favorites',
    cursor: null,
    limit: TV_ROW_LIMIT,
  };
}

export function tvRowTitle(id: TvRowId, countryName = 'Sénégal') {
  switch (id) {
    case 'favorites': return 'Mes favoris';
    case 'country': return `${countryName} en direct`;
    case 'news': return 'Info';
    case 'sports': return 'Sport';
    case 'music': return 'Musique';
  }
}

/** Accueil : aucune recherche ni filtre ni favoris seuls. Dès qu'un filtre est actif, les rangées cèdent la place aux résultats. */
export function isCatalogHome(filters: ChannelFilters, favoritesOnly: boolean) {
  return !favoritesOnly && !filters.search && !filters.country && !filters.group && !filters.language && !filters.status && !filters.region;
}

export function tvRowCacheKey(id: TvRowId, followedCountry: string) {
  return id === 'country' ? `country:${followedCountry}` : id;
}

type CacheEntry = { at: number; channels: Channel[] };

function readAll(storage: Pick<Storage, 'getItem'>): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEYS.tvRows) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Rangée en cache et encore fraîche, sinon null. Les entrées invalides sont ignorées. */
export function readTvRowCache(storage: Pick<Storage, 'getItem'>, key: string, now = Date.now()): Channel[] | null {
  const entry = readAll(storage)[key] as Partial<CacheEntry> | undefined;
  if (!entry || typeof entry.at !== 'number' || now - entry.at > TV_ROWS_CACHE_TTL_MS || !Array.isArray(entry.channels)) return null;
  const channels: Channel[] = [];
  for (const item of entry.channels) {
    const parsed = channelSchema.safeParse(item);
    if (parsed.success) channels.push(parsed.data);
  }
  return channels;
}

export function writeTvRowCache(storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, channels: readonly Channel[], now = Date.now()) {
  const all = readAll(storage);
  all[key] = { at: now, channels: channels.slice(0, TV_ROW_LIMIT) } satisfies CacheEntry;
  try {
    storage.setItem(STORAGE_KEYS.tvRows, JSON.stringify(all));
  } catch {
    // Stockage plein ou bloqué : la rangée se rechargera la prochaine fois.
  }
}

/** Oublie les rangées en cache (par exemple après un changement de favoris). */
export function clearTvRowCache(storage: Pick<Storage, 'removeItem'>) {
  try {
    storage.removeItem(STORAGE_KEYS.tvRows);
  } catch {
    // Rien à faire.
  }
}
