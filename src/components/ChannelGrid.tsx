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
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-zinc-950 p-4 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
                    isBlocked
                      ? 'cursor-not-allowed border-zinc-850 opacity-75'
                      : 'cursor-pointer hover:bg-zinc-900'
                  } ${
                    isSelected
                      ? 'border-yellow-300 ring-2 ring-yellow-400/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel)}
                    disabled={isBlocked}
                    aria-label={`Regarder ${channel.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                  />
                  {/* Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel.id);
                    }}
                    aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${channel.name} ${isFavorite ? 'des' : 'aux'} favoris`}
                    aria-pressed={isFavorite}
                    title={`${isFavorite ? 'Retirer des' : 'Ajouter aux'} favoris`}
                    className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 group-focus-within:opacity-100 ${
                      isFavorite
                        ? 'bg-yellow-400/20 text-yellow-200 scale-110'
                        : 'bg-black/60 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-zinc-300'
                    }`}
                  >
                    <Star aria-hidden="true" className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <div className="pointer-events-none relative z-[1] flex items-start justify-between gap-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700/60 overflow-hidden shrink-0 shadow-inner">
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
                        className="hidden w-full h-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-yellow-300 font-extrabold text-base"
                        style={{ display: channel.logoUrl ? 'none' : 'flex' }}
                      >
                        {channel.name.trim().charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="pointer-events-none relative z-[1] mt-4">
                    <h3 className="font-extrabold text-zinc-100 text-sm group-hover:text-yellow-300 transition truncate pr-6">
                      {channel.name}
                    </h3>

                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                      <span className="flex items-center gap-1 font-semibold text-zinc-300">
                        <Globe className="w-3.5 h-3.5 text-zinc-500" />
                        {formatCountryName(channel.countryCode)}
                      </span>
                      {channel.groupTitle && (
                        <span className="flex items-center gap-1 truncate max-w-[120px] text-zinc-400">
                          <Tag className="w-3.5 h-3.5 text-zinc-500" />
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
                  className={`group relative flex items-center justify-between rounded-xl border bg-zinc-950 p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
                    isBlocked
                      ? 'cursor-not-allowed opacity-75'
                      : 'cursor-pointer hover:bg-zinc-900'
                  } ${
                    isSelected
                      ? 'border-yellow-300 ring-1 ring-yellow-400/20'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel)}
                    disabled={isBlocked}
                    aria-label={`Regarder ${channel.name}`}
                    aria-current={isSelected ? 'true' : undefined}
                    className="absolute inset-0 z-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
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
                    className={`absolute left-4 z-10 p-1.5 rounded-lg transition-all focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 group-focus-within:opacity-100 ${
                      isFavorite
                        ? 'bg-yellow-400/20 text-yellow-200'
                        : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-400'
                    }`}
                  >
                    <Star aria-hidden="true" className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>

                  <div className="pointer-events-none relative z-[1] flex items-center gap-4 ml-8">
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
                      <h4 className="font-bold text-zinc-100 text-sm group-hover:text-yellow-200 transition">
                        {channel.name}
                      </h4>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {formatCountryName(channel.countryCode, 'Intl')}
                        </span>
                        {channel.groupTitle && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
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
                     <span className="text-[10px] font-bold uppercase tracking-wider mr-2 text-yellow-300">
                       Sélectionner
                     </span>
                     <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoadMore}
            disabled={loading}
            aria-busy={loading}
            className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-900 disabled:bg-black text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-6 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-yellow-300" />
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
