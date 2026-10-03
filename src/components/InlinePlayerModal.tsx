'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, X, Tv, Globe } from 'lucide-react';
import Player from '@/components/Player';
import type { Channel } from '@/types/channel';
import { ShareChannelLink } from '@/components/tv/ChannelTile';
import { formatCountryName } from '@/lib/format';
import { zapNeighbors } from '@/lib/zap-list';

interface InlinePlayerModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPopoutWindow: () => void;
  /** Chaînes parmi lesquelles zapper (la liste d'où vient la sélection). */
  playlist?: Channel[];
  onZap?: (channel: Channel) => void;
  onPlaybackStarted?: (channel: Channel) => void;
}

export default function InlinePlayerModal({
  channel,
  isOpen,
  onClose,
  onOpenPopoutWindow,
  playlist,
  onZap,
  onPlaybackStarted,
}: InlinePlayerModalProps) {
  const [zapped, setZapped] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keepFocusInside);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keepFocusInside);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!channel) return null;

  const neighbors = playlist && onZap ? zapNeighbors(playlist, channel.id) : null;
  const zap = (target: Channel) => { setZapped(true); onZap?.(target); };
  const zapping = neighbors
    ? { previous: neighbors.previous ? () => zap(neighbors.previous!) : null, next: neighbors.next ? () => zap(neighbors.next!) : null }
    : undefined;

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
            className="absolute inset-0 bg-black/90"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="inline-player-title"
            aria-describedby="inline-player-description"
            className="relative z-10 flex flex-col w-full h-full sm:h-auto max-w-5xl overflow-hidden rounded-none sm:rounded-3xl border-0 sm:border border-line bg-black/85 shadow-2xl justify-between sm:justify-start"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-line bg-black/50 px-4 sm:px-5 py-3 sm:py-3.5 shrink-0">
              <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-al-gold/30 bg-al-gold/10 text-al-gold">
                  <Tv className="h-4 w-4 sm:h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 id="inline-player-title" className="text-xs sm:text-base font-bold text-text truncate">
                    {channel.name}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-text-muted" />
                      {formatCountryName(channel.countryCode)}
                    </span>
                    {channel.groupTitle && (
                      <>
                        <span>•</span>
                        <span className="uppercase text-xs font-bold text-al-gold">
                          {channel.groupTitle}
                        </span>
                      </>
                    )}
                  </div>
                  <p id="inline-player-description" className="sr-only">
                    Lecteur direct de la chaîne sélectionnée. Appuyez sur Échap pour fermer.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <ShareChannelLink
                  channel={channel}
                  className="inline-flex size-9 items-center justify-center rounded-control border border-line bg-surface-2 text-text-muted transition-colors hover:border-line-gold hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                />
                <button
                  type="button"
                  onClick={onOpenPopoutWindow}
                  title="Ouvrir dans une fenêtre séparée"
                  aria-label="Ouvrir dans une fenêtre séparée"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-text transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-al-gold" />
                  <span>Fenêtre séparée</span>
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer le lecteur"
                  title="Fermer le lecteur"
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-text-muted transition hover:border-white/20 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="p-2 sm:p-5 bg-black/60 flex-1 flex flex-col justify-center">
              <Player
                key={channel.id}
                channelId={channel.id}
                channelName={channel.name}
                zapping={zapping}
                manualExternal={zapped}
                onPlaybackStarted={() => onPlaybackStarted?.(channel)}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
