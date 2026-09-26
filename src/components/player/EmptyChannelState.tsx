import React from 'react';
import { Tv } from 'lucide-react';

export function EmptyChannelState() {
  return (
    <div className="flex aspect-video h-full flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-zinc-400">
      <Tv className="mb-4 h-16 w-16 text-yellow-500/50" />
      <p className="text-lg font-medium text-zinc-200">Aucune chaîne sélectionnée</p>
      <p className="mt-1 text-center text-sm text-zinc-500">Choisissez une chaîne dans la grille pour démarrer la lecture.</p>
    </div>
  );
}
