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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inline-player-title"
            className="relative z-10 flex flex-col w-full max-w-5xl overflow-hidden rounded-3xl border border-yellow-500/20 bg-zinc-950 shadow-2xl shadow-yellow-950/30"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-5 py-3.5 backdrop-blur">
              <div className="flex items-center gap-3 min-w-0 pr-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-200">
                  <Tv className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="inline-player-title" className="text-base font-extrabold text-white truncate">
                    {channel.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-zinc-500" />
                      {formatCountryName(channel.countryCode)}
                    </span>
                    {channel.groupTitle && (
                      <>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-semibold text-yellow-400/80">
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
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 transition hover:border-yellow-400/50 hover:bg-zinc-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-yellow-300" />
                  <span className="hidden sm:inline">Fenêtre séparée</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer le lecteur"
                  title="Fermer le lecteur"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="p-3 sm:p-6 bg-black">
              <Player channelId={channel.id} channelName={channel.name} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
