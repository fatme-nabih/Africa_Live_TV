'use client';

import { useEffect, useRef, useState } from 'react';
import { catalogRequestSchema, catalogResponseSchema, readApiResponse, type CatalogRequest } from '@/lib/api-contracts';
import { formatCountryName } from '@/lib/format';
import {
  readTvRowCache,
  tvRowCacheKey,
  tvRowRequest,
  tvRowTitle,
  writeTvRowCache,
  type TvRowId,
} from '@/lib/tv-rows';
import type { Channel } from '@/types/channel';
import ChannelRail from './ChannelRail';
import { clearRecentChannels, useFollowedCountry, useRecentChannels } from './hooks';

type RowProps = {
  selectedId: string | null;
  favorites: string[];
  onSelect: (channel: Channel, list: Channel[]) => void;
  onToggleFavorite: (id: string) => void;
};

async function fetchRow(request: CatalogRequest, signal: AbortSignal): Promise<Channel[]> {
  const response = await fetch('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(catalogRequestSchema.parse(request)),
    signal,
  });
  const data = await readApiResponse(response, catalogResponseSchema);
  return data.channels.filter(channel => channel.availabilityStatus !== 'OFFLINE');
}

/**
 * Rangée alimentée par le catalogue existant. Elle ne charge que lorsqu'elle approche de l'écran
 * (économie de données et de quota) ; le résultat reste cinq minutes en session. Une rangée vide ou en erreur disparaît.
 */
function CatalogRail({
  id,
  followedCountry,
  favoritesKey,
  ...rest
}: RowProps & { id: TvRowId; followedCountry: string; favoritesKey?: string }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [state, setState] = useState<{ key: string; channels: Channel[]; done: boolean }>({ key: '', channels: [], done: false });
  const cacheKey = tvRowCacheKey(id, followedCountry);
  const requestKey = `${cacheKey}|${favoritesKey ?? ''}`;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => setNear(true));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNear(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near) return;
    const controller = new AbortController();
    const useCache = id !== 'favorites';
    const cached = useCache ? readTvRowCache(window.sessionStorage, cacheKey) : null;
    if (cached) {
      queueMicrotask(() => { if (!controller.signal.aborted) setState({ key: requestKey, channels: cached, done: true }); });
      return () => controller.abort();
    }
    fetchRow(tvRowRequest(id, followedCountry), controller.signal)
      .then(channels => {
        if (controller.signal.aborted) return;
        if (useCache) writeTvRowCache(window.sessionStorage, cacheKey, channels);
        setState({ key: requestKey, channels, done: true });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ key: requestKey, channels: [], done: true });
      });
    return () => controller.abort();
  }, [near, id, followedCountry, cacheKey, requestKey]);

  const current = state.key === requestKey ? state : { channels: [] as Channel[], done: false };
  const hidden = current.done && current.channels.length === 0;
  return (
    <div ref={sentinel} data-tv-row={id}>
      {!hidden && (
        <ChannelRail
          title={tvRowTitle(id, formatCountryName(followedCountry, followedCountry))}
          channels={current.channels}
          loading={!current.done}
          {...rest}
        />
      )}
    </div>
  );
}

/** Accueil de la TV : Reprendre · Favoris · pays en direct · Info · Sport · Musique. */
export default function TvRows(props: RowProps) {
  const recents = useRecentChannels();
  const followedCountry = useFollowedCountry();
  return (
    <div className="flex flex-col gap-8" data-testid="tv-rows">
      {recents.length > 0 && (
        <ChannelRail
          title="Reprendre"
          channels={recents}
          action={
            <button
              type="button"
              onClick={clearRecentChannels}
              aria-label="Effacer l’historique Reprendre"
              className="inline-flex min-h-9 items-center rounded-control px-3 text-xs font-semibold text-text-muted transition-colors hover:text-text"
            >
              Effacer
            </button>
          }
          {...props}
        />
      )}
      <CatalogRail id="favorites" followedCountry={followedCountry} favoritesKey={props.favorites.join(',')} {...props} />
      <CatalogRail id="country" followedCountry={followedCountry} {...props} />
      <CatalogRail id="news" followedCountry={followedCountry} {...props} />
      <CatalogRail id="sports" followedCountry={followedCountry} {...props} />
      <CatalogRail id="music" followedCountry={followedCountry} {...props} />
    </div>
  );
}
