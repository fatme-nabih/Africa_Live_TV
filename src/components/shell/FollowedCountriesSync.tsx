'use client';

import { useEffect } from 'react';
import { writeFollowedCountries } from '@/components/tv/hooks';
import {
  FOLLOWED_COUNTRIES_EVENT,
  mergeFollowedCountries,
  parseFollowedCountries,
  sameFollowedCountries,
} from '@/lib/followed-countries';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));
const ENDPOINT = '/api/followed-countries';

function readDeviceCountries() {
  try {
    return parseFollowedCountries(window.localStorage.getItem(STORAGE_KEYS.followedCountries), AFRICAN_CODES);
  } catch {
    return [];
  }
}

async function readAccountCountries(response: Response) {
  const body: unknown = await response.json();
  const countries = body && typeof body === 'object' && 'countries' in body ? body.countries : [];
  return parseFollowedCountries(JSON.stringify(countries), AFRICAN_CODES);
}

/**
 * Pays suivis synchronisés au compte (UX-503b), monté dans la coquille des pages connectées.
 * À l'ouverture : le compte fait foi, enrichi des pays de l'appareil ; ensuite chaque changement est envoyé (regroupé, 800 ms).
 * Le stockage de l'appareil reste la source d'affichage : hors connexion ou en cas d'erreur, rien ne change pour l'utilisateur.
 */
export default function FollowedCountriesSync() {
  useEffect(() => {
    let stopped = false;
    let accountCountries: string[] | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const send = async (countries: string[]) => {
      const response = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries }),
      });
      if (response.ok && !stopped) accountCountries = await readAccountCountries(response);
    };

    (async () => {
      try {
        const response = await fetch(ENDPOINT, { cache: 'no-store' });
        if (!response.ok || stopped) return;
        const account = await readAccountCountries(response);
        accountCountries = account;
        const device = readDeviceCountries();
        const merged = mergeFollowedCountries(account, device);
        if (!sameFollowedCountries(merged, device)) writeFollowedCountries(merged);
        if (!sameFollowedCountries(merged, account)) await send(merged);
      } catch {
        // Réseau ou session indisponible : les pays suivis restent ceux de l'appareil.
      }
    })();

    const onChange = () => {
      if (accountCountries === null) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const device = readDeviceCountries();
        if (accountCountries && !sameFollowedCountries(device, accountCountries)) send(device).catch(() => {});
      }, 800);
    };
    window.addEventListener(FOLLOWED_COUNTRIES_EVENT, onChange);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener(FOLLOWED_COUNTRIES_EVENT, onChange);
    };
  }, []);

  return null;
}
