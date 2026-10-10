// Clés localStorage de l'application. Préfixe `al_` (Africa Live) ; les anciennes clés
// `iptv_*` sont migrées de façon transparente, sans perdre les favoris existants.
export const STORAGE_KEYS = {
  vlcNoticeDismissed: 'al_vlc_notice_dismissed',
  favorites: 'al_favorites',
  favoritesPending: 'al_favorites_pending',
  favoritesMigrated: 'al_favorites_server_migrated',
  recentCountries: 'al_recent_countries',
  followedCountries: 'al_followed_countries',
  followedCountriesPending: 'al_followed_countries_pending',
  recentChannels: 'al_recent_channels',
  ecoMode: 'al_eco',
  zapList: 'al_zap_list',
  tvRows: 'al_tv_rows',
  radarVisit: 'al_radar_visit',
  radarWeatherOpen: 'al_radar_weather_open',
  radarMarketsOpen: 'al_radar_markets_open',
} as const;

export const VLC_NOTICE_CHANGE_EVENT = 'al_vlc_notice_change';

const LEGACY_KEYS: ReadonlyArray<readonly [legacy: string, current: string]> = [
  ['iptv_vlc_notice_dismissed', STORAGE_KEYS.vlcNoticeDismissed],
  ['iptv_favorites', STORAGE_KEYS.favorites],
  ['iptv_favorites_pending', STORAGE_KEYS.favoritesPending],
  ['iptv_favorites_server_migrated', STORAGE_KEYS.favoritesMigrated],
];

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Copie chaque ancienne clé `iptv_*` vers sa clé `al_*` puis la supprime.
 * Une valeur déjà présente sous la nouvelle clé n'est jamais écrasée. Idempotent ;
 * un stockage indisponible (navigation privée, quota) n'interrompt jamais l'application.
 * Retourne le nombre de clés migrées.
 */
export function migrateLegacyStorage(storage: StorageLike): number {
  let migrated = 0;
  for (const [legacy, current] of LEGACY_KEYS) {
    try {
      const value = storage.getItem(legacy);
      if (value === null) continue;
      if (storage.getItem(current) === null) {
        storage.setItem(current, value);
        migrated += 1;
      }
      // Account preferences have no provable owner: keep their original copy recoverable.
      if (current === STORAGE_KEYS.vlcNoticeDismissed) storage.removeItem(legacy);
    } catch {
      // Stockage indisponible : on conserve l'ancienne valeur et on continue.
    }
  }
  return migrated;
}

let migrationDone = false;

/** Migre une seule fois par chargement de page ; à appeler avant toute lecture des clés `al_*`. */
export function migrateLegacyStorageOnce() {
  if (migrationDone || typeof window === 'undefined') return;
  migrationDone = true;
  try {
    migrateLegacyStorage(window.localStorage);
  } catch {
    // L'accès à window.localStorage peut lui-même lever une exception.
  }
}
