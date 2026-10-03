'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseFollowedCountries } from '@/lib/followed-countries';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { radarCountry, radarCountryUrl } from '@/lib/radar-workspace';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));

/** Pays du Radar : il vit dans l'URL (`?country=SN`) et se partage avec la TV. */
export function useRadarCountry() {
  const searchParams = useSearchParams();
  const countryParam = searchParams.get('country');
  const selectedCountry = radarCountry(countryParam);
  const selectCountry = useCallback((code: string | null) => {
    const next = radarCountryUrl(window.location.href, radarCountry(code));
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.pushState(null, '', next);
    }
  }, []);
  // Arrivée sans pays dans le lien : le Radar s'ouvre sur le pays principal suivi (UX-503), sans entrée d'historique.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('country')) return;
    let primary: string | undefined;
    try {
      primary = parseFollowedCountries(window.localStorage.getItem(STORAGE_KEYS.followedCountries), AFRICAN_CODES)[0];
    } catch {
      primary = undefined;
    }
    if (primary) window.history.replaceState(null, '', radarCountryUrl(window.location.href, primary));
  }, []);
  return { selectedCountry, selectCountry, unknownCountry: Boolean(countryParam) && !selectedCountry };
}
