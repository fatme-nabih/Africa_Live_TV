import type { SVGProps } from 'react';

/**
 * Silhouettes de la savane du logo : états vides et 404 uniquement, jamais en fond de contenu.
 * L'opacité s'applique à l'élément <svg> (opacity-40), pas à la couleur : les formes qui se
 * recouvrent restent un aplat uniforme.
 */
type SilhouetteProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'>;

const common = { 'aria-hidden': true, focusable: false, fill: 'currentColor' } as const;

export function AcaciaSilhouette(props: SilhouetteProps) {
  return (
    <svg viewBox="0 0 160 120" {...common} {...props}>
      <ellipse cx="80" cy="30" rx="46" ry="12" />
      <ellipse cx="46" cy="40" rx="38" ry="11" />
      <ellipse cx="116" cy="40" rx="40" ry="11" />
      <ellipse cx="80" cy="44" rx="30" ry="8" />
      <path d="M73 112c3-22 4-42 0-62h12c0 14 3 36 10 62z" />
      <path d="M80 70c-14-6-26-12-38-24M84 64c12-4 22-10 32-20" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <rect x="18" y="110" width="124" height="3" rx="1.5" />
    </svg>
  );
}

export function ElephantSilhouette(props: SilhouetteProps) {
  return (
    <svg viewBox="0 0 200 140" {...common} {...props}>
      {/* corps et tête */}
      <ellipse cx="112" cy="68" rx="54" ry="34" />
      <circle cx="58" cy="60" r="26" />
      {/* grande oreille */}
      <path d="M74 38c18-6 26 8 22 30-3 16-14 24-24 20-6-14-8-34 2-50z" />
      {/* trompe levée vers l'avant */}
      <path d="M38 66c-14 6-22 22-20 44 0 7 10 8 11 1-1-14 3-26 14-34z" />
      {/* pattes */}
      <rect x="72" y="92" width="18" height="36" rx="8" />
      <rect x="94" y="96" width="18" height="32" rx="8" />
      <rect x="124" y="96" width="18" height="32" rx="8" />
      <rect x="146" y="92" width="18" height="36" rx="8" />
      {/* queue */}
      <path d="M162 60c10 4 12 22 8 36" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function LionSilhouette(props: SilhouetteProps) {
  return (
    <svg viewBox="0 0 200 130" {...common} {...props}>
      {/* crinière puissante, tête, museau */}
      <circle cx="144" cy="50" r="30" />
      <path d="M150 42c16-2 30 6 34 18 1 6-3 10-9 12l-26-2z" />
      {/* oreilles */}
      <path d="M130 24l4-12 9 9zM148 21l8-9 3 13z" />
      {/* corps allongé, dos droit, ventre remonté */}
      <path d="M30 56c0-14 22-18 58-18 28 0 44 4 56 12l-4 34c-20 6-36 4-52 2-24 2-44 4-54-8z" />
      {/* pattes fines */}
      <rect x="36" y="78" width="11" height="40" rx="5" />
      <rect x="52" y="82" width="11" height="36" rx="5" />
      <rect x="108" y="82" width="11" height="36" rx="5" />
      <rect x="126" y="78" width="11" height="40" rx="5" />
      {/* queue à houppette */}
      <path d="M32 58c-16-2-24-18-18-34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="14" cy="22" rx="5" ry="8" />
    </svg>
  );
}
