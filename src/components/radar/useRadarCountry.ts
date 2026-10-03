'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { radarCountry, radarCountryUrl } from '@/lib/radar-workspace';

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
  return { selectedCountry, selectCountry, unknownCountry: Boolean(countryParam) && !selectedCountry };
}
