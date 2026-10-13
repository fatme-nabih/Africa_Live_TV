'use client';
import { useMemo, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { usePreferences } from './usePreferences';
import { importLegacyChoices, legacyChoices, preferenceStore, updatePreferences } from '@/lib/preference-store';
import { formatCountryName } from '@/lib/format';
import { legacyChoicesReady, missingLegacyChoices } from '@/lib/legacy-preferences';
import { useI18n } from '@/i18n/client';
import { format, formatPlural } from '@/i18n/message';
import type { Dictionary } from '@/i18n/dictionary';
import type { Edition } from '@/lib/editions';
import { preferenceErrorText } from '@/lib/preference-error-text';
import { withoutEditionPrefix } from '@/lib/edition-routing';
type LegacyLabels = Dictionary['shell']['legacy'];
const EMPTY_LEGACY = '{"countries":[],"favorites":[]}';
function subscribeLegacy(callback: () => void) { window.addEventListener('storage',callback); return () => window.removeEventListener('storage',callback); }
/** « 2 pays suivis (Mali, Sénégal) et 24 chaînes favorites » : une phrase lisible, sans jargon de stockage. */
function legacyLabel(countries: string[], favorites: number, labels: LegacyLabels, edition: Edition) {
  const parts: string[] = [];
  if (countries.length) parts.push(formatPlural(labels.countries, countries.length, { list: countries.join(labels.separator) }, edition));
  if (favorites) parts.push(formatPlural(labels.favorites, favorites, {}, edition));
  // Accord : masculin dès qu'un pays est cité, féminin pour les seules chaînes.
  return formatPlural(countries.length ? labels.savedMasculine : labels.savedFeminine, countries.length + favorites, { choices: parts.join(labels.and) }, edition);
}
function useLegacyChoices() {
  const raw = useSyncExternalStore(subscribeLegacy,() => JSON.stringify(legacyChoices()),() => EMPTY_LEGACY);
  return useMemo(() => JSON.parse(raw) as ReturnType<typeof legacyChoices>,[raw]);
}
function addedLabel(countries: number, favorites: number, labels: LegacyLabels, edition: Edition) {
  return [countries ? format(labels.countriesShort, { count: countries }) : '', favorites ? formatPlural(labels.favorites, favorites, {}, edition) : ''].filter(Boolean).join(labels.and);
}
export function LegacyPreferencesRecovery() {
  const { t } = useI18n();
  const { owner, snapshot } = usePreferences();
  const legacy = useLegacyChoices();
  const missing = missingLegacyChoices(legacy,snapshot);
  if (!owner || !legacyChoicesReady(legacy,snapshot) || snapshot.legacyImport?.status === 'pending' || (!missing.countries.length && !missing.favorites.length)) return null;
  return <button className="mt-3 text-sm underline" aria-controls="legacy-choices" onClick={() => updatePreferences(preferenceStore(owner),state => ({ ...state, legacyHandled: false, legacyImport: null }))}>{t.shell.legacy.resume}</button>;
}
export default function FollowedCountriesSync() {
  const { t, edition } = useI18n();
  const labels = t.shell.legacy;
  const pathname = withoutEditionPrefix(usePathname());
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
  const saved = imported ? addedLabel(imported.countries.length - imported.remainingCountries.length, imported.favorites.length - imported.remainingFavorites.length, labels, edition) : '';
  return <>
    {snapshot.errors.countries && <p role="status" className="px-4 py-2 text-sm text-text-muted">{preferenceErrorText(snapshot.errors.countries, t.shell.preferenceErrors.copy)} <button onClick={retry} className="underline">{labels.retry}</button></p>}
    {snapshot.errors.favorites && pathname !== '/app' && <p role="alert" className="px-4 py-2 text-sm text-text-muted">{preferenceErrorText(snapshot.errors.favorites, t.shell.preferenceErrors.copy)} <button onClick={favoritesSync.retry} className="underline">{labels.retryFavorites}</button></p>}
    {(offer || checking || imported) && <aside id="legacy-choices" aria-label={labels.region} className="mx-4 mt-2 mb-[calc(4rem+env(safe-area-inset-bottom))] flex flex-wrap items-center gap-x-4 gap-y-2 rounded-control border border-line bg-surface-1 p-3 text-sm text-text md:mb-2">
      {checking && <p role="status">{labels.checking}</p>}
      {offer && <>
        <p className="min-w-0 flex-1 basis-full sm:basis-0">{format(labels.offer, { choices: legacyLabel(missing.countries.map(code => formatCountryName(code, undefined, edition)), missing.favorites.length, labels, edition) })}</p>
        <span className="flex shrink-0 gap-3">
          <button className={buttonClass} onClick={startImport}>{labels.add}</button>
          <button className={secondaryClass} onClick={dismiss}>{labels.later}</button>
        </span>
      </>}
      {imported?.status === 'pending' && <p role="status" aria-live="polite">{snapshot.errors.countries || snapshot.errors.favorites ? labels.pendingError : labels.pending}</p>}
      {imported?.status === 'complete' && <>
        <p role="status" className="min-w-0 flex-1 basis-full sm:basis-0">{saved ? format(labels.confirmed, { saved }) : labels.confirmedNone}</p>
        <button className={buttonClass} onClick={dismiss}>{labels.close}</button>
      </>}
      {imported?.status === 'partial' && <>
        <div role="status" className="min-w-0 flex-1 basis-full sm:basis-0">
          <p>{(saved ? format(labels.partialConfirmed, { saved }) : '') + labels.partialRest}</p>
          {imported.remainingFavorites.length > 0 && <p>{formatPlural(labels.remainingFavorites, imported.remainingFavorites.length, { kept: snapshot.persisted ? labels.keptDevice : labels.keptPage }, edition)}</p>}
          {imported.remainingCountries.length > 0 && <p>{format(labels.remainingCountries, { list: imported.remainingCountries.map(code => formatCountryName(code, undefined, edition)).join(labels.separator) })}</p>}
        </div>
        <span className="flex shrink-0 gap-3">
          <button className={buttonClass} disabled={!ready} onClick={startImport}>{labels.retryAdd}</button>
          <button className={secondaryClass} onClick={dismiss}>{labels.later}</button>
        </span>
      </>}
      {!snapshot.persisted && <p className="w-full text-text-muted">{labels.notPersisted}</p>}
    </aside>}
  </>;
}
