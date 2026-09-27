import React from 'react';
import { Tv } from 'lucide-react';

export function EmptyChannelState() {
  return (
    <div className="flex aspect-video h-full flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 backdrop-blur-xl p-6 text-zinc-400">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-400/70">
        <Tv className="h-8 w-8" />
      </div>
      <p className="text-base font-semibold text-zinc-200">Aucune chaîne sélectionnée</p>
      <p className="mt-1 text-center text-xs text-zinc-400">Choisissez une chaîne dans la grille pour démarrer la lecture.</p>
    </div>
  );
}
