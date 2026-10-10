'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { usePreferences } from './usePreferences';
import { importLegacyChoices, legacyChoices, preferenceStore, updatePreferences } from '@/lib/preference-store';
import { formatCountryName } from '@/lib/format';
const EMPTY_LEGACY = '{"countries":[],"favorites":[]}';
function subscribeLegacy(callback: () => void) { window.addEventListener('storage',callback); return () => window.removeEventListener('storage',callback); }
export function LegacyPreferencesRecovery() {
  const { owner } = usePreferences();
  const raw = useSyncExternalStore(subscribeLegacy,() => JSON.stringify(legacyChoices()),() => EMPTY_LEGACY);
  const legacy = useMemo(() => JSON.parse(raw) as ReturnType<typeof legacyChoices>,[raw]);
  if (!owner || (!legacy.countries.length && !legacy.favorites.length)) return null;
  return <button className="mt-3 text-sm underline" onClick={() => updatePreferences(preferenceStore(owner),state => ({ ...state, legacyHandled: false }))}>Reprendre les choix de cet appareil</button>;
}
export default function FollowedCountriesSync() {
  const { owner, snapshot, retry } = usePreferences('countries');
  usePreferences('favorites');
  const raw = useSyncExternalStore(subscribeLegacy,() => JSON.stringify(legacyChoices()),() => EMPTY_LEGACY);
  const legacy = useMemo(() => JSON.parse(raw) as ReturnType<typeof legacyChoices>,[raw]);
  if (!owner) return null;
  const offer = !snapshot.legacyHandled && (legacy.countries.length > 0 || legacy.favorites.length > 0);
  return <>
    {snapshot.errors.countries && <p role="status" className="px-4 py-2 text-sm text-text-muted">{snapshot.errors.countries} <button onClick={retry} className="underline">Réessayer</button></p>}
    {offer && <aside className="mx-4 my-2 rounded-control border border-line p-3 text-sm text-text">
      <p>Des choix de cet appareil n’ont pas de compte identifié : {legacy.countries.map(code => formatCountryName(code)).join(', ')}{legacy.favorites.length ? ` · ${legacy.favorites.length} favoris` : ''}. Vous pouvez les ajouter au compte actuel.</p>
      <button className="mr-3 underline" onClick={() => importLegacyChoices(owner)}>Ajouter ces choix à mon compte</button>
      <button className="underline" onClick={() => updatePreferences(preferenceStore(owner),state => ({ ...state, legacyHandled: true }))}>Garder pour plus tard</button>
    </aside>}
  </>;
}
