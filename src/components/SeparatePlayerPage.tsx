'use client';

import Image from 'next/image';
import { ArrowLeft, X } from 'lucide-react';

import Player from '@/components/Player';

export default function SeparatePlayerPage({ channelId }: { channelId: string }) {
  const showCatalog = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      return;
    }
    window.location.assign('/app');
  };

  const closePlayer = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    window.location.assign('/app');
  };

  return (
    <main className="flex min-h-screen flex-col bg-black text-zinc-100 selection:bg-yellow-400/25 selection:text-yellow-100">
      <header className="flex items-center justify-between border-b border-zinc-900 bg-zinc-950/95 px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={showCatalog}
          aria-label="Retourner au catalogue Africa Live"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group"
        >
          <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-black p-0.5 ring-2 ring-amber-400/40 group-hover:ring-amber-400 transition-all shadow-[0_0_12px_rgba(250,204,21,0.2)]">
            <Image
              src="/logo.png"
              alt="Africa Live"
              width={88}
              height={88}
              className="h-full w-full object-cover rounded-full"
              priority
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-emerald-400 via-amber-300 to-red-500 bg-clip-text text-transparent">
              AFRICA LIVE
            </span>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={showCatalog}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-zinc-600 hover:text-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Catalogue
          </button>
          <button
            type="button"
            onClick={closePlayer}
            aria-label="Fermer le lecteur"
            title="Fermer le lecteur"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section aria-label="Lecteur vidéo" className="flex flex-1 items-center justify-center p-3 sm:p-5">
        <div className="w-full max-w-[1500px]">
          <Player channelId={channelId} />
        </div>
      </section>
    </main>
  );
}
