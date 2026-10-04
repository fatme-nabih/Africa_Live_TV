import Image from 'next/image';
import type { CSSProperties } from 'react';

export type BrandBackdropVariant = 'hero' | 'app' | 'quiet';

const OPACITY: Record<BrandBackdropVariant, number> = { hero: 0.06, app: 0.035, quiet: 0.02 };

/**
 * Grand logo en couleur, très atténué, effacé par une vignette radiale.
 * Remplace le filigrane gris : la tricolore du logo irrigue la page sans gêner la lecture.
 * Le contraste du texte posé dessus reste largement supérieur à 4.5:1 (6 % maximum d'opacité).
 * Le mode Éco data (html[data-eco]) et prefers-reduced-transparency le rendent statique et plus discret.
 * Performance (UX-602) : c'est l'élément LCP des pages publiques. Fichier dédié pré-redimensionné (480 px, WebP q55, 19 Ko au lieu
 * de 34 Ko, sans passer par l'optimiseur d'images) chargé tout de suite et en priorité haute : à 6 % d'opacité la différence de
 * définition est invisible. Régénérable depuis public/africa-live-logo.png (sharp : 480 × 480, webp quality 55).
 */
export default function BrandBackdrop({
  variant = 'app',
  className = '',
}: {
  variant?: BrandBackdropVariant;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      data-brand-backdrop={variant}
      className={`pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      {variant !== 'quiet' && (
        <div className="brand-backdrop-halo absolute h-[min(130vw,980px)] w-[min(130vw,980px)]" />
      )}
      <Image
        src="/brand/backdrop-480.webp"
        alt=""
        width={640}
        height={640}
        unoptimized
        loading="eager"
        fetchPriority="high"
        className="brand-backdrop-logo relative h-auto w-auto max-h-[85vh] max-w-[85vw] object-contain"
        style={{ '--backdrop-opacity': OPACITY[variant] } as CSSProperties}
      />
    </div>
  );
}
