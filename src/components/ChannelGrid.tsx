'use client';

/* eslint-disable @next/next/no-img-element */
import React from 'react';
import {
  Globe,
  Play,
  RefreshCw,
  Star,
  Tag,
  Tv,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCountryName } from '@/lib/format';
import type { Channel } from '@/types/channel';

interface ChannelGridProps {
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

function ChannelLogo({ channel, compact = false }: { channel: Channel; compact?: boolean }) {
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-white/[0.04] shadow-inner ${compact ? 'h-11 w-11 rounded-xl' : 'h-full w-full rounded-xl'}`}>
      {channel.logoUrl ? (
        <img
          src={channel.logoUrl}
          alt=""
          className={compact ? 'h-full w-full object-contain p-1.5' : 'h-[72%] w-[72%] object-contain'}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="hidden h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-xl font-black text-amber-300"
        style={{ display: channel.logoUrl ? 'none' : 'flex' }}
        aria-hidden="true"
      >
        {channel.name.trim().charAt(0).toUpperCase() || <Tv className="h-5 w-5" />}
      </div>
    </div>
  );
}

function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  return (
    <div
      role="status"
      aria-label="Chargement des chaînes"
      className={viewMode === 'grid'
        ? 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'
        : 'flex flex-col gap-2'}
    >
      {Array.from({ length: viewMode === 'grid' ? 8 : 5 }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse rounded-2xl border border-zinc-800/80 bg-zinc-950/80 ${viewMode === 'grid' ? 'p-3 sm:p-4' : 'flex items-center gap-3 p-3'}`}
        >
          <div className={viewMode === 'grid' ? 'aspect-[16/10] rounded-xl bg-zinc-900' : 'h-11 w-11 rounded-xl bg-zinc-900'} />
          <div className={viewMode === 'grid' ? 'mt-4 space-y-2' : 'flex-1 space-y-2'}>
            <div className="h-3 w-2/3 rounded-full bg-zinc-800" />
            <div className="h-2.5 w-1/2 rounded-full bg-zinc-900" />
          </div>
        </div>
      ))}
      <span className="sr-only">Chargement du catalogue…</span>
    </div>
  );
}

export default function ChannelGrid({
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
  if (channels.length === 0 && loading) return <LoadingSkeleton viewMode={viewMode} />;

  if (channels.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/70 p-10 text-center sm:p-14">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
            <Tv className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="font-bold text-zinc-100">Aucune chaîne disponible sur cette page</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
            Modifiez vos filtres ou chargez la suite du catalogue.
          </p>
        </div>
        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loading}
              aria-busy={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-bold text-zinc-100 shadow-lg transition hover:border-amber-400/50 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-amber-300" aria-hidden="true" />}
              {loading ? 'Chargement…' : 'Charger la suite du catalogue'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={viewMode === 'grid'
          ? 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col gap-2'}
      >
        <AnimatePresence mode="popLayout">
          {channels.map((channel) => {
            const isSelected = selectedChannelId === channel.id;
            const isFavorite = favorites.includes(channel.id);

            if (viewMode === 'list') {
              return (
                <motion.article
                  layout
                  key={channel.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`group relative flex items-center gap-3 rounded-2xl border p-3 transition ${isSelected ? 'border-amber-400/70 bg-amber-400/[0.06]' : 'border-zinc-800/80 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/80'}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel)}
                    aria-label={`Regarder ${channel.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                  <div className="pointer-events-none relative z-[1]">
                    <ChannelLogo channel={channel} compact />
                  </div>
                  <div className="pointer-events-none relative z-[1] min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-white">{channel.name}</h3>
                    <p className="mt-1 flex items-center gap-2 truncate text-xs text-zinc-500">
                      <span>{formatCountryName(channel.countryCode, 'International')}</span>
                      {channel.groupTitle && <><span aria-hidden="true">•</span><span className="truncate">{channel.groupTitle}</span></>}
                    </p>
                  </div>
                  <span className="pointer-events-none relative z-[1] hidden h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-black transition group-hover:scale-105 md:flex">
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  </span>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); toggleFavorite(channel.id); }}
                    aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${channel.name} ${isFavorite ? 'des' : 'aux'} favoris`}
                    aria-pressed={isFavorite}
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isFavorite ? 'bg-amber-400/15 text-amber-300' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  </button>
                </motion.article>
              );
            }

            return (
              <motion.article
                layout
                key={channel.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                whileHover={{ y: -3 }}
                className={`group relative overflow-hidden rounded-2xl border transition duration-200 ${isSelected ? 'border-amber-400/80 bg-amber-400/[0.06] shadow-[0_16px_40px_-26px_rgba(250,204,21,0.85)]' : 'border-zinc-800/80 bg-zinc-950/85 hover:border-zinc-700 hover:bg-zinc-950'}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectChannel(channel)}
                  aria-label={`Regarder ${channel.name}`}
                  aria-current={isSelected ? 'true' : undefined}
                  className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
                />

                <div className="pointer-events-none relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-zinc-900 via-[#0d0e12] to-black p-5 sm:p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_65%,rgba(250,204,21,0.10),transparent_65%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div className="pointer-events-none relative z-[1] h-full w-full"><ChannelLogo channel={channel} /></div>
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); toggleFavorite(channel.id); }}
                    aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${channel.name} ${isFavorite ? 'des' : 'aux'} favoris`}
                    aria-pressed={isFavorite}
                    className={`pointer-events-auto absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${isFavorite ? 'border-amber-400/30 bg-amber-400/20 text-amber-300' : 'border-white/10 bg-black/55 text-zinc-300 hover:bg-black hover:text-white'}`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
                  </button>
                  <span className="pointer-events-none absolute bottom-2.5 left-1/2 z-[2] flex -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-black text-black opacity-0 shadow-xl transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <Play className="h-3 w-3 fill-current" aria-hidden="true" /> Regarder
                  </span>
                </div>

                <div className="pointer-events-none relative z-[1] p-3 sm:p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-xs font-extrabold text-zinc-100 transition group-hover:text-amber-200 sm:text-sm">{channel.name}</h3>
                    {isSelected && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.7)]" aria-label="Chaîne sélectionnée" />}
                  </div>
                  <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[10px] text-zinc-500 sm:text-[11px]">
                    <span className="flex min-w-0 items-center gap-1 truncate"><Globe className="h-3 w-3 shrink-0" aria-hidden="true" />{formatCountryName(channel.countryCode, 'International')}</span>
                    {channel.groupTitle && <span className="hidden min-w-0 items-center gap-1 truncate sm:flex"><Tag className="h-3 w-3 shrink-0" aria-hidden="true" />{channel.groupTitle}</span>}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-bold text-zinc-100 shadow-lg transition hover:border-amber-400/50 hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-amber-300" aria-hidden="true" />}
            {loading ? 'Chargement…' : 'Charger plus de chaînes'}
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Chargement du catalogue.' : `${channels.length} chaînes affichées.`}
      </p>
    </div>
  );
}
