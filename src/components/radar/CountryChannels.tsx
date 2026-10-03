import { ArrowRight, ExternalLink, Play } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { ChannelArt } from '@/components/tv/ChannelTile';
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

  const availableCountries = AFRICAN_COUNTRIES.filter(country => (channelsSummary?.countries[country.code]?.channelCount ?? 0) > 0)
    .sort((a, b) => (channelsSummary?.countries[b.code]?.channelCount ?? 0) - (channelsSummary?.countries[a.code]?.channelCount ?? 0));

  return (
    <div className="flex-1 divide-y divide-line overflow-y-auto">
      <div className="border-b border-line bg-black/20 px-4 py-3 sm:px-5">
        <div className="text-xs font-bold text-text">Télévisions d’Afrique référencées</div>
        <p className="mt-0.5 text-xs text-text-muted">Choisissez un pays pour voir ses chaînes et les regarder ici :</p>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4">
        {availableCountries.map(country => {
          const info = channelsSummary?.countries[country.code];
          return (
            <button
              key={country.code}
              type="button"
              onClick={() => onSelectCountry(country.code)}
              className="group flex min-h-14 items-center justify-between rounded-control border border-line bg-surface-2/60 p-3 text-left transition hover:border-line-gold hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
            >
              <span className="min-w-0 pr-2">
                <span className="block text-xs font-bold text-text">{country.name}</span>
                <span className="mt-0.5 block text-xs text-text-muted">{country.region}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="inline-flex items-center rounded-pill border border-line-gold bg-al-gold/10 px-2 py-0.5 text-xs font-bold tabular-nums text-al-gold">
                  {info?.channelCount ?? 0} chaînes
                </span>
                {(info?.directWebCount ?? 0) > 0 && (
                  <span className="mt-0.5 block text-xs font-semibold text-al-green">{info?.directWebCount} dans le navigateur</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
