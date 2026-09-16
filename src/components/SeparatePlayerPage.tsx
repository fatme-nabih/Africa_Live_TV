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
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        >
          <Image
            src="/africa-live.svg"
            alt="Africa Live"
            width={250}
            height={140}
            className="h-12 w-auto object-contain sm:h-14"
            priority
          />
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
