import type { ReactNode } from 'react';

/**
 * Anneau or : arc fin autour d'un élément (avatar, pays sélectionné, chaîne en lecture),
 * comme le cercle du logo.
 */
export default function GoldRing({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-grid place-items-center ${className}`}>
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 100"
        className="pointer-events-none absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] -rotate-[28deg]"
      >
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          pathLength="100"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="66 5 20 5"
          className="stroke-al-gold"
        />
      </svg>
      {children}
    </span>
  );
}
