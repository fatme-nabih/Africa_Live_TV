'use client';

import { Heart, History, MapPin, Radar } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useSyncExternalStore } from 'react';
import { useNow } from '@/components/radar/useNow';
import { useRecentChannels } from '@/components/tv/hooks';
import { ButtonLink, EmptyState } from '@/components/ui';
import { flagEmoji, parseRecentCountries, RECENT_COUNTRIES_EVENT } from '@/lib/country-picker';
import { formatCountryName } from '@/lib/format';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { parseVisit } from '@/lib/radar-visit';
import { formatAgo } from '@/lib/relative-time';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const AFRICAN_CODES: ReadonlySet<string> = new Set(AFRICAN_COUNTRIES.map(country => country.code));

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(RECENT_COUNTRIES_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(RECENT_COUNTRIES_EVENT, callback);
  };
}

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * « Mon activité » : uniquement ce que l'appareil garde déjà (dernières chaînes, pays, visite du Radar)
 * et le nombre de favoris du compte calculé côté serveur. Aucune nouvelle donnée collectée.
 */
export default function AccountActivity({ favoritesCount }: { favoritesCount: number }) {
  const recents = useRecentChannels();
  const countriesRaw = useSyncExternalStore(subscribe, () => read(STORAGE_KEYS.recentCountries), () => null);
  const visitRaw = useSyncExternalStore(subscribe, () => read(STORAGE_KEYS.radarVisit), () => null);
  // 0 avant le montage : le serveur ne connaît pas l'appareil, le premier rendu client est identique.
  const now = useNow(60_000);
  const hydrated = now > 0;
  const countries = useMemo(() => parseRecentCountries(countriesRaw, AFRICAN_CODES), [countriesRaw]);
  const visit = hydrated ? parseVisit(visitRaw, now) : null;

  const empty = recents.length === 0 && countries.length === 0 && visit === null && favoritesCount === 0;

  return (
    <section aria-labelledby="activity-title" className="rounded-card border border-line bg-surface-1/90 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="font-display text-xl font-bold text-text">Mon activité</h2>
        <p className="text-xs text-text-muted">Chaînes, pays et visite : gardés sur cet appareil</p>
      </div>

      {hydrated && empty ? (
        <EmptyState
          illustration="lion"
          title="Votre activité apparaîtra ici"
          description="Choisissez un pays sur le Radar ou lancez une chaîne : vous les retrouverez ici."
          action={<ButtonLink href="/app/live" variant="secondary" icon={<Radar size={16} aria-hidden="true" />}>Ouvrir le Radar</ButtonLink>}
        />
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Block icon={History} title="Dernières chaînes">
            {recents.length ? (
              <ul className="space-y-1.5">
                {recents.slice(0, 4).map(channel => (
                  <li key={channel.id} className="flex min-w-0 items-center gap-2 text-sm text-text">
                    <span aria-hidden="true">{flagEmoji(channel.countryCode)}</span>
                    <span className="truncate">{channel.name}</span>
                  </li>
                ))}
              </ul>
            ) : <Muted>Aucune chaîne regardée pour l’instant.</Muted>}
            <ActivityLink href="/app">Reprendre à la TV</ActivityLink>
          </Block>

          <Block icon={MapPin} title="Pays récents">
            {countries.length ? (
              <ul className="flex flex-wrap gap-2">
                {countries.map(code => (
                  <li key={code}>
                    <Link
                      href={`/app/live?country=${code}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line bg-surface-2 px-3 text-sm text-text transition-colors hover:border-line-gold"
                    >
                      <span aria-hidden="true">{flagEmoji(code)}</span>
                      {formatCountryName(code)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Muted>Aucun pays choisi pour l’instant.</Muted>}
          </Block>

          <Block icon={Heart} title="Favoris">
            <p className="text-sm text-text">
              {favoritesCount === 0 ? 'Aucun favori enregistré.' : favoritesCount === 1 ? '1 chaîne en favori' : `${favoritesCount} chaînes en favori`}
            </p>
            {favoritesCount > 0 && <ActivityLink href="/app?favorites=1">Voir mes favoris</ActivityLink>}
          </Block>

          <Block icon={Radar} title="Radar">
            <p className="text-sm text-text">
              {visit === null ? 'Pas encore de visite enregistrée.' : `Dernière visite ${formatAgo(new Date(visit).toISOString(), now)}`}
            </p>
            <ActivityLink href="/app/live">Voir les nouvelles</ActivityLink>
          </Block>
        </div>
      )}
    </section>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Heart; title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-control border border-line bg-surface-2/60 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-text">
        <Icon size={16} aria-hidden="true" className="text-al-gold" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-muted">{children}</p>;
}

function ActivityLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-3 inline-flex min-h-9 items-center text-sm font-semibold text-al-gold transition-colors hover:text-text">
      {children} →
    </Link>
  );
}
