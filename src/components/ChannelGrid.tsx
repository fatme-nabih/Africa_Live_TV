'use client';

/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Tv, Globe, Tag, RefreshCw, LayoutGrid, Star } from 'lucide-react';
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
  if (channels.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-zinc-950/80 border border-zinc-800 rounded-2xl text-zinc-400 text-center">
        <Tv className="w-12 h-12 text-zinc-600 mb-4" />
        <p className="font-semibold text-zinc-200">Aucun résultat trouvé</p>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">Essayez de modifier vos filtres ou d&apos;élargir votre recherche.</p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        layout
        className={
          viewMode === 'grid'
            ? "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4"
            : "flex flex-col gap-2"
        }
      >
        <AnimatePresence mode="popLayout">
          {channels.map((channel) => {
            const isSelected = selectedChannelId === channel.id;
            const isFavorite = favorites.includes(channel.id);
            const localPlayback = process.env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
            const isBlocked = !localPlayback && (
              channel.availabilityStatus === 'REVIEW_REQUIRED' ||
              channel.availabilityStatus === 'OFFLINE'
            );

            if (viewMode === 'grid') {
              return (
                <motion.div
                  layout
                  key={channel.id}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-zinc-950/90 p-3 sm:p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isBlocked
                      ? 'cursor-not-allowed border-zinc-850 opacity-70'
                      : 'cursor-pointer hover:bg-zinc-900/90 hover:shadow-xl'
                  } ${
                    isSelected
                      ? 'border-amber-400/90 ring-2 ring-amber-400/30 shadow-[0_0_20px_rgba(250,204,21,0.18)] bg-zinc-900/90'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel)}
                    disabled={isBlocked}
                    aria-label={`Regarder ${channel.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                  {/* Favorite Button (touch-friendly: visible on mobile, hover-only on desktop) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel.id);
                    }}
                    aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${channel.name} ${isFavorite ? 'des' : 'aux'} favoris`}
                    aria-pressed={isFavorite}
                    title={`${isFavorite ? 'Retirer des' : 'Ajouter aux'} favoris`}
                    className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 p-2 rounded-full transition-all duration-200 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group-focus-within:opacity-100 ${
                      isFavorite
                        ? 'bg-amber-400/20 text-amber-300 scale-110 shadow-sm shadow-amber-500/20 opacity-100'
                        : 'bg-black/60 text-zinc-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-amber-200 hover:bg-black/80'
                    }`}
                  >
                    <Star aria-hidden="true" className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-current text-amber-400' : ''}`} />
                  </button>

                  <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-2">
                    <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-900/90 border border-zinc-750 overflow-hidden shrink-0 shadow-inner">
                      {channel.logoUrl ? (
                        <img
                          src={channel.logoUrl}
                          alt=""
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const sibling = (e.target as HTMLImageElement).nextElementSibling;
                            if (sibling) (sibling as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-amber-400 font-extrabold text-sm sm:text-base border border-amber-400/20"
                        style={{ display: channel.logoUrl ? 'none' : 'flex' }}
                      >
                        {channel.name.trim().charAt(0).toUpperCase()}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-red-400 tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        Live
                      </span>
                    )}
                  </div>

                  <div className="pointer-events-none relative z-[1] mt-3 sm:mt-4">
                    <h3 className="font-bold text-zinc-100 text-xs sm:text-sm group-hover:text-amber-300 transition truncate pr-2">
                      {channel.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] sm:text-xs text-zinc-400">
                      <span className="flex items-center gap-1 font-medium text-zinc-300 truncate max-w-[90px] sm:max-w-none">
                        <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                        {formatCountryName(channel.countryCode)}
                      </span>
                      {channel.groupTitle && (
                        <span className="hidden sm:flex items-center gap-1 truncate max-w-[100px] text-zinc-400">
                          <Tag className="w-3 h-3 text-zinc-500 shrink-0" />
                          {channel.groupTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            } else {
              // LIST MODE
              return (
                <motion.div
                  layout
                  key={channel.id}
                  variants={itemVariants}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  className={`group relative flex items-center justify-between rounded-xl border bg-zinc-950/90 p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    isBlocked
                      ? 'cursor-not-allowed opacity-70'
                      : 'cursor-pointer hover:bg-zinc-900/80'
                  } ${
                    isSelected
                      ? 'border-amber-400/80 ring-1 ring-amber-400/30 shadow-lg shadow-amber-500/10 bg-zinc-900/90'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel)}
                    disabled={isBlocked}
                    aria-label={`Regarder ${channel.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel.id);
                    }}
                    aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${channel.name} ${isFavorite ? 'des' : 'aux'} favoris`}
                    aria-pressed={isFavorite}
                    title={`${isFavorite ? 'Retirer des' : 'Ajouter aux'} favoris`}
                    className={`absolute left-3 z-10 p-1.5 rounded-lg transition-all focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group-focus-within:opacity-100 ${
                      isFavorite
                        ? 'bg-amber-400/20 text-amber-300 opacity-100'
                        : 'text-zinc-500 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:text-amber-200'
                    }`}
                  >
                    <Star aria-hidden="true" className={`w-4 h-4 ${isFavorite ? 'fill-current text-amber-400' : ''}`} />
                  </button>

                  <div className="pointer-events-none relative z-[1] flex items-center gap-3.5 ml-8">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-black border border-zinc-800 overflow-hidden shrink-0">
                      {channel.logoUrl ? (
                        <img
                          src={channel.logoUrl}
                          alt=""
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                          }}
                        />
                      ) : (
                        <Tv aria-hidden="true" className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-100 text-sm group-hover:text-amber-300 transition">
                        {channel.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {formatCountryName(channel.countryCode, 'Intl')}
                        </span>
                        {channel.groupTitle && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-750" />
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {channel.groupTitle}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-[1] flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] font-bold uppercase tracking-wider mr-2 text-amber-300">
                       Sélectionner
                     </span>
                     <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-amber-300">
                        <LayoutGrid aria-hidden="true" className="h-4 w-4" />
                     </div>
                  </div>
                </motion.div>
              );
            }
          })}
        </AnimatePresence>
      </motion.div>

      {/* Chargement et bouton En voir plus */}
      {hasMore && (
        <div className="flex justify-center mt-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLoadMore}
            disabled={loading}
            aria-busy={loading}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 text-zinc-100 border border-amber-400/30 hover:border-amber-400/60 px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-amber-950/10 transition disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              'Charger plus de chaînes'
            )}
          </motion.button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Chargement du catalogue.' : `${channels.length} chaînes affichées.`}
      </p>
    </div>
  );
}
