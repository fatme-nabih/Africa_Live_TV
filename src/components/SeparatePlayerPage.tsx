'use client';

import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import BrandWatermark from '@/components/BrandWatermark';
import Player from '@/components/Player';

export default function SeparatePlayerPage({ channelId }: { channelId: string }) {
  const router = useRouter();

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
    <main className="relative flex min-h-screen flex-col bg-black text-zinc-100 selection:bg-yellow-400/25 selection:text-yellow-100">
      <BrandWatermark />

      <header className="relative z-10 flex items-center justify-between border-b border-white/[0.08] bg-black/60 px-4 py-2.5 backdrop-blur-2xl sm:px-6">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
        <button
          type="button"
          onClick={showCatalog}
          aria-label="Retourner au catalogue Africa Live"
          className="group flex items-center gap-2.5 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/10 transition group-hover:ring-amber-400/40 shadow-sm">
            <BrandLogo className="h-full w-full drop-shadow-[0_2px_8px_rgba(250,204,21,0.25)]" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500 bg-clip-text text-transparent">
              AFRICA LIVE
            </span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showCatalog}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Catalogue</span>
          </button>
          <button
            type="button"
            onClick={closePlayer}
            aria-label="Fermer le lecteur"
            title="Fermer le lecteur"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section aria-label="Lecteur vidéo" className="relative z-10 flex flex-1 items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-[1500px]">
          <Player channelId={channelId} />
        </div>
      </section>
    </main>
  );
}
