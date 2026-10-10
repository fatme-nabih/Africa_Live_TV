import { useState } from 'react';
import { ArrowRight, ChevronRight, ExternalLink, Play, Search, Star, X } from 'lucide-react';
import { Badge, Button, Chip, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import CountryFlag from '@/components/radar/CountryFlag';
import { ChannelArt } from '@/components/tv/ChannelTile';
import { countryPlayback, filterCountryGrid, GRID_REGIONS, gridCountryName, orderCountryGrid, regionCounts } from '@/lib/country-grid';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { RadarCountry } from '@/lib/live-osint-types';
import type { Channel } from '@/types/channel';

export default function CountryChannels({
  selectedCountry,
  activeCountry,
  countryChannels,
  loading,
  error,
  channelsSummary,
  activePlayChannelId,
  followedCountries,
  onSelectCountry,
  onPlayChannel,
  onOpenPopout,
  onRetry,
}: {
  selectedCountry: string | null;
  activeCountry: RadarCountry | null;
  countryChannels: Channel[];
  loading: boolean;
  error: string | null;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  activePlayChannelId: string | null;
  followedCountries: readonly string[];
  onSelectCountry: (code: string | null) => void;
  onPlayChannel: (channel: Channel) => void;
  onOpenPopout: (channel: Channel) => void;
  onRetry: () => void;
}) {
  if (selectedCountry && activeCountry) {
    return (
      <div className="flex-1 divide-y divide-line overflow-y-auto">
        <div className="flex items-center justify-between border-b border-line-gold bg-al-gold/[0.04] px-4 py-2 text-xs">
          <span className="text-text">
            Chaînes du catalogue : <strong>{activeCountry.name}</strong> ({countryChannels.length})
          </span>
          <button type="button" onClick={() => onSelectCountry(null)} className="min-h-9 px-2 font-semibold text-text-muted hover:text-text">
            Tous les pays
          </button>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState title="Chaînes injoignables" description={error} onRetry={onRetry} />
          </div>
        ) : loading ? (
          <div role="status" aria-label="Chargement des chaînes" className="space-y-3 p-4">
            {[0, 1, 2, 3].map(row => <Skeleton key={row} className="h-16" />)}
          </div>
        ) : countryChannels.length === 0 ? (
          <EmptyState
            illustration="elephant"
            title={`Aucune chaîne directe répertoriée pour ${activeCountry.name}`}
            description="Découvrez les flux disponibles dans les autres pays africains."
            action={
              <Button variant="secondary" size="sm" onClick={() => onSelectCountry(null)} icon={<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />}>
                Choisir un autre pays
              </Button>
            }
          />
        ) : (
          countryChannels.map(channel => {
            const isPlaying = activePlayChannelId === channel.id;
            const inBrowser = channel.playbackMode === 'BROWSER';
            return (
              <div
                key={channel.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition sm:px-5 ${isPlaying ? 'bg-al-gold/[0.08]' : 'hover:bg-surface-2/60'}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="size-11 shrink-0 overflow-hidden rounded-control border border-line">
                    <ChannelArt channel={channel} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-text">{channel.name}</span>
                      {isPlaying && <Badge variant="live" className="py-0">En cours</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                      {channel.groupTitle && <span>{channel.groupTitle}</span>}
                      <span className={inBrowser ? 'text-al-green' : 'text-al-gold'}>{inBrowser ? 'Dans le navigateur' : 'Avec VLC'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPlayChannel(channel)}
                    aria-label={`Regarder ${channel.name}`}
                    icon={<Play aria-hidden="true" className="h-3 w-3 fill-current" />}
                  >
                    {isPlaying ? 'Actif' : 'Regarder'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => onOpenPopout(channel)}
                    title="Ouvrir dans une fenêtre séparée"
                    aria-label={`Ouvrir ${channel.name} en fenêtre séparée`}
                    className="hidden size-11 items-center justify-center rounded-control border border-line bg-surface-2 text-text-muted transition hover:border-line-gold hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:flex"
                  >
                    <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return <CountryGrid channelsSummary={channelsSummary} followedCountries={followedCountries} onSelectCountry={onSelectCountry} />;
}

/** Grille de tous les pays : recherche et région filtrent les deux blocs (vos pays, autres pays). */
function CountryGrid({
  channelsSummary,
  followedCountries,
  onSelectCountry,
}: {
  channelsSummary: LiveChannelsSummarySnapshot | null;
  followedCountries: readonly string[];
  onSelectCountry: (code: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const grid = orderCountryGrid(AFRICAN_COUNTRIES, channelsSummary?.countries, followedCountries);
  const perRegion = regionCounts([...grid.pinned, ...grid.others]);
  const { pinned, others } = filterCountryGrid(grid, query, region);
  const shown = pinned.length + others.length;
  const filtering = Boolean(query.trim()) || region !== null;
  const reset = () => { setQuery(''); setRegion(null); };

  const card = (country: RadarCountry, followed: boolean) => {
    const playback = countryPlayback(channelsSummary?.countries[country.code]);
    return (
      <button
        key={country.code}
        type="button"
        onClick={() => onSelectCountry(country.code)}
        aria-label={`${country.name}${followed ? ', pays suivi' : ''} : ${playback.inBrowser > 0 ? playback.primary : 'chaînes avec VLC'}, ${playback.totalLabel}`}
        className={`group flex min-h-16 items-center justify-between gap-2 rounded-control border p-3 text-left transition hover:border-line-gold hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${followed ? 'border-line-gold bg-al-gold/[0.06]' : 'border-line bg-surface-2/60'}`}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <CountryFlag code={country.code} />
            <span className="truncate text-sm font-bold text-text" title={country.name}>{gridCountryName(country)}</span>
            {followed && <Star aria-hidden="true" className="h-3.5 w-3.5 shrink-0 fill-current text-al-gold" />}
          </span>
          <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 pl-8 text-xs">
            <span className={`font-semibold tabular-nums ${playback.inBrowser > 0 ? 'text-al-green' : 'text-al-gold'}`}>{playback.primary}</span>
            <span aria-hidden="true" className="text-text-muted">·</span>
            <span className="tabular-nums text-text-muted">{playback.totalLabel}</span>
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-al-gold" />
      </button>
    );
  };

  return (
    <div className="flex-1 divide-y divide-line overflow-y-auto">
      <div className="space-y-3 border-b border-line bg-black/20 px-4 py-3 sm:px-5">
        <div>
          <div className="text-xs font-bold text-text">Télévisions d’Afrique référencées</div>
          <p className="mt-0.5 text-xs text-text-muted">Choisissez un pays pour voir ses chaînes et les regarder ici :</p>
        </div>
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              // Entrée ouvre le premier pays trouvé : taper « sen » puis Entrée suffit.
              const first = pinned[0] ?? others[0];
              if (event.key === 'Enter' && query.trim() && first) onSelectCountry(first.code);
            }}
            placeholder="Rechercher un pays…"
            aria-label="Rechercher un pays"
            enterKeyHint="go"
            className="min-h-11 w-full rounded-control border border-line bg-surface-2 pl-9 pr-10 text-sm text-text placeholder:text-text-muted hover:border-line-gold focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold/50 sm:min-h-9 sm:text-xs [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* Une seule ligne qui défile sur téléphone, plusieurs lignes sur ordinateur. */}
        <div role="group" aria-label="Filtrer par région" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
          <Chip selected={region === null} onClick={() => setRegion(null)} className="shrink-0">Toutes</Chip>
          {GRID_REGIONS.filter(item => perRegion[item.region]).map(item => (
            <Chip
              key={item.region}
              selected={region === item.region}
              onClick={() => setRegion(current => (current === item.region ? null : item.region))}
              aria-label={`${item.region}, ${perRegion[item.region]} pays`}
              title={item.region}
              className="shrink-0"
            >
              {item.label} <span className="tabular-nums text-text-muted">{perRegion[item.region]}</span>
            </Chip>
          ))}
        </div>
        <p role="status" className="sr-only">{filtering ? `${shown} pays affiché${shown > 1 ? 's' : ''}` : ''}</p>
      </div>

      {shown === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
          <p className="text-sm text-text">Aucun pays ne correspond{query.trim() ? ` à « ${query.trim()} »` : ''}.</p>
          <Button variant="secondary" size="sm" onClick={reset}>Effacer les filtres</Button>
        </div>
      )}

      {pinned.length > 0 && (
        <section aria-labelledby="radar-pays-suivis" className="px-3 pt-3 sm:px-4 sm:pt-4">
          <h3 id="radar-pays-suivis" className="mb-2 text-xs font-bold uppercase tracking-wide text-al-gold">Vos pays</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{pinned.map(country => card(country, true))}</div>
        </section>
      )}

      {others.length > 0 && (
        <section aria-labelledby={pinned.length > 0 ? 'radar-autres-pays' : undefined} className="p-3 sm:p-4">
          {pinned.length > 0 && <h3 id="radar-autres-pays" className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Autres pays</h3>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{others.map(country => card(country, false))}</div>
        </section>
      )}
    </div>
  );
}
