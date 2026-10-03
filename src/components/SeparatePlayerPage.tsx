'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import Wordmark from '@/components/brand/Wordmark';
import Player from '@/components/Player';
import { recordRecentChannel } from '@/components/tv/hooks';
import { buildPlayerPath } from '@/lib/player-window';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { readZapList, zapNeighbors } from '@/lib/zap-list';
import type { Channel } from '@/types/channel';

const subscribeNothing = () => () => {};
function readZapRaw() {
  try { return window.localStorage.getItem(STORAGE_KEYS.zapList); } catch { return null; }
}

export default function SeparatePlayerPage({ channelId }: { channelId: string }) {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  const [zapped, setZapped] = useState(false);
  // Liste de zapping transmise par le catalogue au moment du lancement (même appareil, six heures au plus).
  const rawZap = useSyncExternalStore(subscribeNothing, readZapRaw, () => null);
  const zapList = useMemo(() => readZapList({ getItem: () => rawZap }), [rawZap]);
  const current = zapList.find(item => item.id === channelId);
  const { previous, next } = zapNeighbors(zapList, channelId);
  const zapTo = (target: Channel) => { setZapped(true); router.replace(buildPlayerPath(target.id)); };
  useEffect(() => {
    const stop = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === window.opener && event.data?.type === 'africa-live-stop-player') setStopped(true);
    };
    window.addEventListener('message', stop);
    return () => window.removeEventListener('message', stop);
  }, []);

  const showCatalog = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      return;
    }
    router.push('/app');
  };

  const closePlayer = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    router.push('/app');
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-black text-text selection:bg-al-gold/25 selection:text-text">
      <BrandBackdrop variant="quiet" />

      <header className="relative z-10 flex items-center justify-between border-b border-line bg-black/60 px-4 py-2.5 sm:px-6">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
        <button
          type="button"
          onClick={showCatalog}
          aria-label="Retourner au catalogue Africa Live"
          className="group flex items-center gap-2.5 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/10 transition group-hover:ring-al-gold/40 shadow-sm">
            <BrandLogo className="h-full w-full drop-shadow-[0_2px_8px_rgba(252,209,22,0.25)]" />
          </div>
          <Wordmark className="text-base sm:text-lg" />
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showCatalog}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-text transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Catalogue</span>
          </button>
          <button
            type="button"
            onClick={closePlayer}
            aria-label="Fermer le lecteur"
            title="Fermer le lecteur"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-text-muted transition hover:border-white/20 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section aria-label="Lecteur vidéo" className="relative z-10 flex flex-1 items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-[1500px]">
          {stopped ? <p role="status">Lecture arrêtée depuis le catalogue. Choisissez une chaîne pour relancer le lecteur.</p> : <Player
            key={channelId}
            channelId={channelId}
            channelName={current?.name}
            zapping={current ? { previous: previous ? () => zapTo(previous) : null, next: next ? () => zapTo(next) : null } : undefined}
            manualExternal={zapped}
            onPlaybackStarted={() => { if (current) recordRecentChannel(current); }}
          />}
        </div>
      </section>
    </main>
  );
}
