import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import CountryChannels from '@/components/radar/CountryChannels';
import { ButtonLink, Tabs, tabPanelId } from '@/components/ui';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { RadarCountry } from '@/lib/live-osint-types';
import type { Channel } from '@/types/channel';

export type RadarPanelTab = 'news' | 'channels';
const ID_PREFIX = 'radar-feed';

export default function RadarFeedPanel({
  className = '',
  tab,
  onTabChange,
  articleCount,
  selectedCountry,
  activeCountry,
  channelsSummary,
  countryChannels,
  channelsLoading,
  channelsError,
  playingChannelId,
  onSelectCountry,
  onPlayChannel,
  onOpenPopout,
  onRetry,
  news,
}: {
  className?: string;
  tab: RadarPanelTab;
  onTabChange: (tab: RadarPanelTab) => void;
  articleCount: number;
  selectedCountry: string | null;
  activeCountry: RadarCountry | null;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  countryChannels: Channel[];
  channelsLoading: boolean;
  channelsError: string | null;
  playingChannelId: string | null;
  onSelectCountry: (code: string | null) => void;
  onPlayChannel: (channel: Channel) => void;
  onOpenPopout: (channel: Channel) => void;
  onRetry: () => void;
  news: ReactNode;
}) {
  const channelCount = selectedCountry
    ? (channelsSummary?.countries[selectedCountry]?.channelCount ?? countryChannels.length)
    : (channelsSummary?.totalChannels ?? 0);
  return (
    <article id="radar-fil" aria-label="Fil et chaînes du pays" className={`relative flex min-h-[520px] scroll-mt-20 flex-col overflow-hidden rounded-card border border-line bg-surface-1 ${className}`}>
      <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-black/40 px-3 py-2 sm:px-4">
        <Tabs
          idPrefix={ID_PREFIX}
          ariaLabel="Dépêches ou chaînes TV"
          value={tab}
          onChange={id => onTabChange(id as RadarPanelTab)}
          tabs={[
            { id: 'news', label: 'Dépêches', count: articleCount },
            { id: 'channels', label: 'Chaînes TV', count: channelCount },
          ]}
        />
        <ButtonLink href={activeCountry ? `/app?country=${activeCountry.code}` : '/app'} variant="ghost" size="sm">
          {selectedCountry ? 'Voir les chaînes du pays' : 'Voir toutes les chaînes'}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </ButtonLink>
      </div>

      <div
        role="tabpanel"
        id={tabPanelId(ID_PREFIX, tab)}
        aria-labelledby={`${ID_PREFIX}-tab-${tab}`}
        className="flex flex-1 flex-col"
      >
        {tab === 'channels' ? (
          <CountryChannels
            selectedCountry={selectedCountry}
            activeCountry={activeCountry}
            countryChannels={countryChannels}
            loading={channelsLoading}
            error={channelsError}
            channelsSummary={channelsSummary}
            activePlayChannelId={playingChannelId}
            onSelectCountry={onSelectCountry}
            onPlayChannel={onPlayChannel}
            onOpenPopout={onOpenPopout}
            onRetry={onRetry}
          />
        ) : news}
      </div>
    </article>
  );
}
