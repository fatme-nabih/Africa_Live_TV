'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Tv, Globe } from 'lucide-react';
import Player from '@/components/Player';
import type { Channel } from '@/types/channel';
import { formatCountryName } from '@/lib/format';

interface InlinePlayerModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPopoutWindow: () => void;
}

export default function InlinePlayerModal({
  channel,
  isOpen,
  onClose,
  onOpenPopoutWindow,
}: InlinePlayerModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!channel) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inline-player-title"
            className="relative z-10 flex flex-col w-full h-full sm:h-auto max-w-5xl overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-amber-500/25 bg-zinc-950 shadow-2xl shadow-amber-950/30 justify-between sm:justify-start"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 sm:px-5 py-3 sm:py-3.5 backdrop-blur shrink-0">
              <div className="h-0.5 w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                  <Tv className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="inline-player-title" className="text-sm sm:text-base font-extrabold text-white truncate">
                    {channel.name}
                  </h2>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-zinc-500" />
                      {formatCountryName(channel.countryCode)}
                    </span>
                    {channel.groupTitle && (
                      <>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-bold text-amber-400">
                          {channel.groupTitle}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onOpenPopoutWindow}
                  title="Ouvrir dans une fenêtre séparée"
                  aria-label="Ouvrir dans une fenêtre séparée"
                  className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 transition hover:border-amber-400/50 hover:bg-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-amber-300" />
                  <span>Fenêtre séparée</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer le lecteur"
                  title="Fermer le lecteur"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="p-2 sm:p-5 bg-black flex-1 flex flex-col justify-center">
              <Player channelId={channel.id} channelName={channel.name} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
