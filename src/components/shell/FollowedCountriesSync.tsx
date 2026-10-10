'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { usePreferences } from './usePreferences';
import { importLegacyChoices, legacyChoices, preferenceStore, updatePreferences } from '@/lib/preference-store';
import { formatCountryName } from '@/lib/format';
import { legacyChoicesReady, missingLegacyChoices } from '@/lib/legacy-preferences';
const EMPTY_LEGACY = '{"countries":[],"favorites":[]}';
function subscribeLegacy(callback: () => void) { window.addEventListener('storage',callback); return () => window.removeEventListener('storage',callback); }
/** « 2 pays suivis (Mali, Sénégal) et 24 chaînes favorites » : une phrase lisible, sans jargon de stockage. */
function legacyLabel(countries: string[], favorites: number) {
  const parts: string[] = [];
  if (countries.length) parts.push(`${countries.length} pays suivi${countries.length > 1 ? 's' : ''} (${countries.join(', ')})`);
  if (favorites) parts.push(`${favorites} chaîne${favorites > 1 ? 's' : ''} favorite${favorites > 1 ? 's' : ''}`);
  // Accord : masculin dès qu'un pays est cité, féminin pour les seules chaînes.
  return `${parts.join(' et ')} ${countries.length ? 'enregistré' : 'enregistrée'}${countries.length + favorites > 1 ? 's' : ''}`;
}
function useLegacyChoices() {
  const raw = useSyncExternalStore(subscribeLegacy,() => JSON.stringify(legacyChoices()),() => EMPTY_LEGACY);
  return useMemo(() => JSON.parse(raw) as ReturnType<typeof legacyChoices>,[raw]);
}
function addedLabel(countries: number, favorites: number) {
  return [countries ? `${countries} pays` : '', favorites ? `${favorites} chaîne${favorites > 1 ? 's' : ''} favorite${favorites > 1 ? 's' : ''}` : ''].filter(Boolean).join(' et ');
}
export function LegacyPreferencesRecovery() {
  const { owner, snapshot } = usePreferences();
  const legacy = useLegacyChoices();
  const missing = missingLegacyChoices(legacy,snapshot);
  if (!owner || !legacyChoicesReady(legacy,snapshot) || snapshot.legacyImport?.status === 'pending' || (!missing.countries.length && !missing.favorites.length)) return null;
  return <button className="mt-3 text-sm underline" aria-controls="legacy-choices" onClick={() => updatePreferences(preferenceStore(owner),state => ({ ...state, legacyHandled: false, legacyImport: null }))}>Reprendre les choix de cet appareil</button>;
}
export default function FollowedCountriesSync() {
  const { owner, snapshot, retry } = usePreferences('countries');
  const favoritesSync = usePreferences('favorites');
  const legacy = useLegacyChoices();
  if (!owner) return null;
  const ready = legacyChoicesReady(legacy,snapshot);
  const missing = missingLegacyChoices(legacy,snapshot);
  const imported = snapshot.legacyImport;
  const offer = !imported && !snapshot.legacyHandled && ready && (missing.countries.length > 0 || missing.favorites.length > 0);
  const checking = !imported && !snapshot.legacyHandled && !ready && (legacy.countries.length > 0 || legacy.favorites.length > 0);
  const dismiss = () => updatePreferences(preferenceStore(owner),state => ({ ...state, legacyHandled: true, legacyImport: null }));
  const startImport = () => { importLegacyChoices(owner); retry(); favoritesSync.retry(); };
  const buttonClass = 'inline-flex min-h-11 items-center font-semibold text-al-gold underline underline-offset-2 hover:text-text disabled:cursor-wait disabled:opacity-60';
  const secondaryClass = 'inline-flex min-h-11 items-center text-text-muted underline underline-offset-2 hover:text-text';
  const saved = imported ? addedLabel(imported.countries.length - imported.remainingCountries.length, imported.favorites.length - imported.remainingFavorites.length) : '';
  return <>
    {snapshot.errors.countries && <p role="status" className="px-4 py-2 text-sm text-text-muted">{snapshot.errors.countries} <button onClick={retry} className="underline">Réessayer</button></p>}
    {snapshot.errors.favorites && <p role="alert" className="px-4 py-2 text-sm text-text-muted">{snapshot.errors.favorites} <button onClick={favoritesSync.retry} className="underline">Réessayer les favoris</button></p>}
    {(offer || checking || imported) && <aside id="legacy-choices" aria-label="Choix de cet appareil" className="mx-4 mt-2 mb-[calc(4rem+env(safe-area-inset-bottom))] flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control border border-line bg-surface-1 p-3 text-sm text-text md:mb-2">
      {checking && <p role="status">Vérification des choix déjà enregistrés dans votre compte…</p>}
      {offer && <>
        <p className="min-w-0 flex-1 basis-full sm:basis-0">Vous avez {legacyLabel(missing.countries.map(code => formatCountryName(code)), missing.favorites.length)} sur cet appareil à ajouter à votre compte.</p>
        <span className="flex shrink-0 gap-3">
          <button className={buttonClass} onClick={startImport}>Ajouter à mon compte</button>
          <button className={secondaryClass} onClick={dismiss}>Plus tard</button>
        </span>
      </>}
      {imported?.status === 'pending' && <p role="status" aria-live="polite">{snapshot.errors.countries || snapshot.errors.favorites ? 'Ajout à votre compte en attente. Vos choix restent conservés pour réessayer.' : 'Ajout à votre compte en cours… Attente de la confirmation.'}</p>}
      {imported?.status === 'complete' && <>
        <p role="status" className="min-w-0 flex-1 basis-full sm:basis-0">Ajout confirmé : {saved || 'vos choix sont déjà dans votre compte'}{saved ? ' dans votre compte.' : '.'}</p>
        <button className={buttonClass} onClick={dismiss}>Fermer</button>
      </>}
      {imported?.status === 'partial' && <>
        <div role="status" className="min-w-0 flex-1 basis-full sm:basis-0">
          <p>{saved ? `Ajout confirmé : ${saved}. ` : ''}Certains choix restent à ajouter.</p>
          {imported.remainingFavorites.length > 0 && <p>{imported.remainingFavorites.length} chaîne{imported.remainingFavorites.length > 1 ? 's' : ''} n’{imported.remainingFavorites.length > 1 ? 'ont' : 'a'} pas pu être ajoutée{imported.remainingFavorites.length > 1 ? 's' : ''}. {snapshot.persisted ? 'Ces choix restent sur cet appareil pour réessayer.' : 'Ces choix restent conservés pour cette page.'}</p>}
          {imported.remainingCountries.length > 0 && <p>Pays encore à ajouter : {imported.remainingCountries.map(code => formatCountryName(code)).join(', ')}. Votre compte accepte cinq pays au maximum ; retirez un pays ou réessayez après synchronisation.</p>}
        </div>
        <span className="flex shrink-0 gap-3">
          <button className={buttonClass} disabled={!ready} onClick={startImport}>Réessayer l’ajout</button>
          <button className={secondaryClass} onClick={dismiss}>Plus tard</button>
        </span>
      </>}
      {!snapshot.persisted && <p className="w-full text-text-muted">Le navigateur empêche l’enregistrement local. Gardez cette page ouverte jusqu’à la confirmation ; le report n’est conservé que pour cette page.</p>}
    </aside>}
  </>;
}
