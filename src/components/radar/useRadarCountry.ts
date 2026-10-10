'use client';

import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFollowedCountries } from '@/components/tv/hooks';
import { radarCountry, radarCountryUrl } from '@/lib/radar-workspace';

/** Pays du Radar : il vit dans l'URL (`?country=SN`) et se partage avec la TV. */
export function useRadarCountry() {
  const followed = useFollowedCountries();
  const primary = followed[0];
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
    if (primary) window.history.replaceState(null, '', radarCountryUrl(window.location.href, primary));
  }, [primary]);
  return { selectedCountry, selectCountry, unknownCountry: Boolean(countryParam) && !selectedCountry };
}
