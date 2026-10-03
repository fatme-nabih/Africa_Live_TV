'use client';

import { Leaf } from 'lucide-react';
import { writeEco } from '@/lib/eco-mode';
import { useEcoMode } from '@/components/tv/hooks';

/**
 * Mode Éco data : pas d'images de chaînes, lecture manuelle, fond et animations au repos.
 * `icon` : bouton compact de la barre ; `switch` : ligne explicative de la page Compte.
 */
export default function EcoToggle({ variant = 'icon' }: { variant?: 'icon' | 'switch' }) {
  const eco = useEcoMode();
  const toggle = () => writeEco(!eco);

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={eco}
        aria-label="Mode Éco data"
        title={eco ? 'Éco data activé : images et animations réduites' : 'Activer le mode Éco data'}
        className={`hidden size-11 shrink-0 items-center justify-center rounded-control border transition-colors sm:inline-flex ${
          eco ? 'border-al-green/60 bg-al-green/10 text-al-green' : 'border-line bg-surface-2 text-text-muted hover:border-line-gold hover:text-text'
        }`}
      >
        <Leaf size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id="eco-label" className="text-sm font-bold text-text">Mode Éco data</p>
        <p id="eco-help" className="mt-1 text-xs leading-relaxed text-text-muted">
          Moins de données mobiles : logos de chaînes remplacés par des vignettes, lecture lancée à votre demande,
          fond et animations au repos. Activé par défaut si votre navigateur demande d’économiser les données.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={eco}
        aria-labelledby="eco-label"
        aria-describedby="eco-help"
        onClick={toggle}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-pill border transition-colors ${
          eco ? 'border-al-green bg-al-green/30' : 'border-line bg-surface-3'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-pill bg-text transition-transform ${eco ? 'translate-x-6' : 'translate-x-1'}`}
        />
        <span className="absolute -inset-2" aria-hidden="true" />
      </button>
    </div>
  );
}
