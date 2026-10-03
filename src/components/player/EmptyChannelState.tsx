import React from 'react';
import { Tv } from 'lucide-react';

export function EmptyChannelState() {
  return (
    <div className="flex aspect-video h-full flex-col items-center justify-center rounded-2xl border border-line bg-surface-1/80 p-6 text-text-muted">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-al-gold/20 bg-al-gold/10 text-al-gold/70">
        <Tv className="h-8 w-8" />
      </div>
      <p className="text-base font-semibold text-text">Aucune chaîne sélectionnée</p>
      <p className="mt-1 text-center text-xs text-text-muted">Choisissez une chaîne dans la grille pour démarrer la lecture.</p>
    </div>
  );
}
