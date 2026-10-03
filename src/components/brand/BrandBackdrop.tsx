import Image from 'next/image';
import type { CSSProperties } from 'react';

export type BrandBackdropVariant = 'hero' | 'app' | 'quiet';

const OPACITY: Record<BrandBackdropVariant, number> = { hero: 0.06, app: 0.035, quiet: 0.02 };

/**
 * Grand logo en couleur, très atténué, effacé par une vignette radiale.
 * Remplace le filigrane gris : la tricolore du logo irrigue la page sans gêner la lecture.
 * Le contraste du texte posé dessus reste largement supérieur à 4.5:1 (6 % maximum d'opacité).
 * Le mode Éco data (html[data-eco]) et prefers-reduced-transparency le rendent statique et plus discret.
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
        src="/africa-live-logo.webp"
        alt=""
        width={640}
        height={640}
        sizes="(max-width: 640px) 85vw, 640px"
        priority={false}
        className="brand-backdrop-logo relative h-auto w-auto max-h-[85vh] max-w-[85vw] object-contain"
        style={{ '--backdrop-opacity': OPACITY[variant] } as CSSProperties}
      />
    </div>
  );
}
