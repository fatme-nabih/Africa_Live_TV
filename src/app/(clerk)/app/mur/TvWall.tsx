'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Leaf, Monitor, Tv, Volume2, VolumeX } from 'lucide-react';
import { usePlayerDock } from '@/components/player/PlayerDock';
import { useEcoMode, useRecentChannels } from '@/components/tv/hooks';
import { ButtonLink, EmptyState, SectionHeader } from '@/components/ui';
import { formatCountryName } from '@/lib/format';
import { pickWallChannels, TV_WALL_MIN_WIDTH } from '@/lib/tv-wall';

const Player = dynamic(() => import('@/components/Player'), { ssr: false });

const QUERY = `(min-width: ${TV_WALL_MIN_WIDTH}px)`;
function subscribeWide(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

/**
 * Mur TV 2×2 : jusqu'à quatre chaînes récentes en même temps, une seule audible (UX-506).
 * Le lecteur unique de l'espace /app est fermé à l'arrivée : le mur devient la seule source active de la page.
 */
export default function TvWall() {
  const dock = usePlayerDock();
  const eco = useEcoMode();
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(QUERY).matches, () => true);
  const recents = useRecentChannels();
  const channels = useMemo(() => pickWallChannels(recents), [recents]);
  const [audible, setAudible] = useState<string | null | undefined>(undefined);
  const wallRef=useRef<HTMLUListElement>(null);
  const chooseAudible=(id:string|null)=>{
    // Revoke the current sound before React grants it to a different tile.
    wallRef.current?.querySelectorAll('video').forEach(video=>{video.muted=true;});
    setAudible(id);
  };
  const { close: closeDock } = dock;

  useEffect(() => { closeDock(); }, [closeDock]);

  const header = (
    <SectionHeader eyebrow="TV" title="Mur TV" className="mb-5"
      description="Jusqu’à quatre chaînes à la fois ; une seule a le son. Choisissez celle que vous écoutez." />
  );

  let body: React.ReactNode;
  if (eco) {
    body = <EmptyState illustration="acacia" title="Mur TV en pause en mode Éco data"
      description="Quatre directs à la fois consomment beaucoup de données. Désactivez Éco data pour l’utiliser."
      action={<ButtonLink href="/app" variant="secondary" icon={<Leaf size={16} aria-hidden="true" />}>Retour à la TV</ButtonLink>} />;
  } else if (!wide) {
    body = <EmptyState illustration="elephant" title="Mur TV sur grand écran"
      description="Le mur s’affiche sur un ordinateur ou une télévision (au moins 1 280 px de large)."
      action={<ButtonLink href="/app" variant="secondary" icon={<Monitor size={16} aria-hidden="true" />}>Retour à la TV</ButtonLink>} />;
  } else if (channels.length < 2) {
    body = <EmptyState illustration="lion" title="Composez votre mur"
      description="Regardez au moins deux chaînes à la TV : vos dernières chaînes remplissent le mur."
      action={<ButtonLink href="/app" variant="secondary" icon={<Tv size={16} aria-hidden="true" />}>Choisir des chaînes</ButtonLink>} />;
  } else {
    const current = audible === undefined ? channels[0]?.id : audible;
    body = (
      <ul ref={wallRef} aria-label="Chaînes du mur" className="grid grid-cols-2 gap-3">
        {channels.map((channel) => {
          const on = channel.id === current;
          return (
            <li key={channel.id} className={`overflow-hidden rounded-card border bg-surface-1 ${on ? 'border-al-gold' : 'border-line'}`}>
              <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
                <p className="min-w-0 truncate text-sm font-bold text-text">
                  {channel.name}
                  <span className="ml-2 text-xs font-normal text-text-muted">{formatCountryName(channel.countryCode)}</span>
                </p>
                <button type="button" onClick={() => chooseAudible(channel.id)} aria-pressed={on}
                  aria-label={on ? `${channel.name} : son actif` : `Écouter ${channel.name}`}
                  className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold transition-colors ${
                    on ? 'border-al-gold bg-al-gold/15 text-al-gold' : 'border-line bg-surface-2 text-text-muted hover:border-line-gold hover:text-text'}`}>
                  {on ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
                  {on ? 'Son' : 'Écouter'}
                </button>
              </div>
              <Player channelId={channel.id} channelName={channel.name} compact manualExternal forceMuted={!on}
                onMutedChange={muted => chooseAudible(muted ? null : channel.id)} />
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
      {header}
      {body}
    </main>
  );
}
