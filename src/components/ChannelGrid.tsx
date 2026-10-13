'use client';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

import React from 'react';
import { Play, RefreshCw, Star } from 'lucide-react';
import { EmptyState, Skeleton } from '@/components/ui';
import ChannelTile, { ChannelArt, ShareChannelLink } from '@/components/tv/ChannelTile';
import { categoryLabels } from '@/lib/catalog-metadata';
import { uniqueChannelLabels } from '@/lib/channel-labels';
import { formatCountryName } from '@/lib/format';
import type { Channel } from '@/types/channel';

interface ChannelGridProps {
  compact?: boolean;
  channels: Channel[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: Channel) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  viewMode: 'grid' | 'list';
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

function LoadingSkeleton({ viewMode, compact = false }: { viewMode: 'grid' | 'list'; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div
      role="status"
      aria-label={t.tv.copy["Chargement des chaînes"]}
      className={viewMode === 'grid'
        ? `grid grid-cols-2 gap-3 sm:gap-4 ${compact ? '' : 'md:grid-cols-3 xl:grid-cols-4'}`
        : 'flex flex-col gap-2'}
    >
      {Array.from({ length: viewMode === 'grid' ? 8 : 5 }).map((_, index) => (
        viewMode === 'grid' ? (
          <div key={index}>
            <Skeleton className="aspect-video w-full rounded-card" />
            <Skeleton className="mt-3 h-3 w-2/3" />
            <Skeleton className="mt-2 h-2.5 w-1/2" />
          </div>
        ) : (
          <div key={index} className="flex items-center gap-3 rounded-card border border-line bg-surface-1 p-3">
            <Skeleton className="size-12 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        )
      ))}
      <span className="sr-only">{t.tv.copy["Chargement du catalogue…"]}</span>
    </div>
  );
}

function LoadMoreButton({ loading, label, onLoadMore }: { loading: boolean; label: string; onLoadMore: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading}
      aria-busy={loading}
      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line-gold bg-surface-2 px-5 text-sm font-semibold text-text transition-colors hover:bg-surface-3 disabled:cursor-wait disabled:opacity-50"
    >
      {loading && <RefreshCw className="size-3.5 animate-spin text-al-gold" aria-hidden="true" />}
      <span>{loading ? t.tv.copy["Chargement…"] : label}</span>
    </button>
  );
}

export default function ChannelGrid({
  compact = false,
  channels,
  selectedChannelId,
  onSelectChannel,
  loading,
  hasMore,
  onLoadMore,
  viewMode,
  favorites,
  toggleFavorite,
}: ChannelGridProps) {
  const { t, edition } = useI18n();
  const labels = React.useMemo(() => uniqueChannelLabels(channels), [channels]);
  if (channels.length === 0 && loading) return <LoadingSkeleton viewMode={viewMode} compact={compact} />;

  if (channels.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-card border border-dashed border-line bg-surface-1">
          <EmptyState
            illustration="acacia"
            title={t.tv.copy["Aucune chaîne disponible sur cette page"]}
            description={t.tv.copy["Modifiez vos filtres ou chargez la suite du catalogue."]}
          />
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <LoadMoreButton loading={loading} label={t.tv.copy["Charger la suite du catalogue"]} onLoadMore={onLoadMore} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={viewMode === 'grid'
          ? `tile-fade grid grid-cols-2 gap-3 sm:gap-4 ${compact ? '' : 'md:grid-cols-3 xl:grid-cols-4'}`
          : 'tile-fade flex flex-col gap-2'}
      >
        {channels.map((channel) => {
          const isSelected = selectedChannelId === channel.id;
          const isFavorite = favorites.includes(channel.id);

          if (viewMode === 'grid') {
            return (
              <ChannelTile
                key={channel.id}
                channel={channel}
                label={labels.get(channel.id)}
                selected={isSelected}
                favorite={isFavorite}
                onSelect={onSelectChannel}
                onToggleFavorite={toggleFavorite}
              />
            );
          }

          return (
            <article
              key={channel.id}
              className={`group relative flex items-center gap-3 rounded-card border p-2.5 transition-colors sm:p-3 ${
                isSelected ? 'border-al-gold bg-al-gold/[0.06]' : 'border-line bg-surface-1 hover:border-line-gold'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectChannel(channel)}
                aria-label={format(t.tv.copy["Regarder {v0}"], {v0: labels.get(channel.id) ?? channel.name})}
                aria-current={isSelected ? 'true' : undefined}
                className="absolute inset-0 z-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
              />
              <div className="pointer-events-none relative z-[1] size-12 shrink-0 overflow-hidden rounded-control border border-line">
                <ChannelArt channel={channel} />
              </div>
              <div className="pointer-events-none relative z-[1] min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-text"><bdi>{channel.name}</bdi></h3>
                <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-text-muted">
                  <span>{formatCountryName(channel.countryCode, t.tv.copy["International"], edition)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{categoryLabels(channel.groupTitle, edition, t.tv.categories)}</span>
                </p>
              </div>
              <span className="pointer-events-none relative z-[1] hidden size-9 items-center justify-center rounded-pill border border-line-gold bg-al-gold/10 text-al-gold transition-colors group-hover:bg-al-yellow group-hover:text-black md:flex">
                {/* ml-0.5 physique : recentrage optique du triangle « lecture », qui pointe à droite dans toutes les éditions. */}
                <Play className="ml-0.5 size-3 fill-current" aria-hidden="true" />
              </span>
              <ShareChannelLink
                channel={channel}
                label={labels.get(channel.id)}
                className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-pill text-text-muted transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
              />
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); toggleFavorite(channel.id); }}
                aria-label={format(t.tv.copy["{v0} {v1} {v2} favoris"], {v0: isFavorite ? t.tv.copy["Retirer"] : t.tv.copy["Ajouter"], v1: labels.get(channel.id) ?? channel.name, v2: isFavorite ? t.tv.copy["des"] : t.tv.copy["aux"]})}
                aria-pressed={isFavorite}
                className={`relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
                  isFavorite ? 'border border-line-gold bg-al-gold/15 text-al-gold' : 'text-text-muted hover:bg-white/10 hover:text-text'
                }`}
              >
                <Star className={`size-3.5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <LoadMoreButton loading={loading} label={t.tv.copy["Charger plus de chaînes"]} onLoadMore={onLoadMore} />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? t.tv.copy["Chargement du catalogue."] : format(t.tv.copy["{v0} chaînes affichées."], {v0: channels.length})}
      </p>
    </div>
  );
}
