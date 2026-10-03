'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { ECO_EVENT, effectiveEco, readEcoRaw, readSaveData } from '@/lib/eco-mode';
import { parseRecentCountries, RECENT_COUNTRIES_EVENT } from '@/lib/country-picker';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { parseRecentChannels, pushRecentChannel } from '@/lib/recent-channels';
import { DEFAULT_FOLLOWED_COUNTRY } from '@/lib/tv-rows';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import type { Channel } from '@/types/channel';

const RECENTS_EVENT = 'al_recent_channels_change';

function subscribe(events: string[]) {
  return (callback: () => void) => {
    window.addEventListener('storage', callback);
    for (const event of events) window.addEventListener(event, callback);
    return () => {
      window.removeEventListener('storage', callback);
      for (const event of events) window.removeEventListener(event, callback);
    };
  };
}

const subscribeEco = subscribe([ECO_EVENT]);
const subscribeRecents = subscribe([RECENTS_EVENT]);
const subscribeCountries = subscribe([RECENT_COUNTRIES_EVENT]);
const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));

/** Mode Éco data effectif (choix de l'utilisateur, sinon Save-Data du navigateur). Faux côté serveur. */
export function useEcoMode(): boolean {
  return useSyncExternalStore(
    subscribeEco,
    () => effectiveEco(readEcoRaw(), readSaveData()),
    () => false,
  );
}

function readRecentsRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.recentChannels);
  } catch {
    return null;
  }
}

/** Dernières chaînes regardées (le plus récent d'abord), lues sur l'appareil. */
export function useRecentChannels(): Channel[] {
  const raw = useSyncExternalStore(subscribeRecents, readRecentsRaw, () => null);
  return useMemo(() => parseRecentChannels(raw), [raw]);
}

export function recordRecentChannel(channel: Channel) {
  try {
    const current = parseRecentChannels(window.localStorage.getItem(STORAGE_KEYS.recentChannels));
    window.localStorage.setItem(STORAGE_KEYS.recentChannels, JSON.stringify(pushRecentChannel(current, channel)));
    window.dispatchEvent(new Event(RECENTS_EVENT));
  } catch {
    // Stockage indisponible : la lecture continue, seul l'historique est perdu.
  }
}

export function clearRecentChannels() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.recentChannels);
    window.dispatchEvent(new Event(RECENTS_EVENT));
  } catch {
    // Rien à effacer.
  }
}

function readCountriesRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.recentCountries);
  } catch {
    return null;
  }
}

/** Pays « suivi » de l'accueil TV : le dernier choisi dans la barre, sinon le Sénégal. */
export function useFollowedCountry(): string {
  const raw = useSyncExternalStore(subscribeCountries, readCountriesRaw, () => null);
  return parseRecentCountries(raw, AFRICAN_CODES)[0] ?? DEFAULT_FOLLOWED_COUNTRY;
}
