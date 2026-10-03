import type { ReactNode } from 'react';
import BrandLogo from '@/components/BrandLogo';
import { cn } from '@/components/ui';
import BrandBackdrop from './BrandBackdrop';
import GoldRing from './GoldRing';
import KenteBand from './KenteBand';
import { AcaciaSilhouette, ElephantSilhouette, LionSilhouette } from './Silhouettes';

const ILLUSTRATIONS = { acacia: AcaciaSilhouette, elephant: ElephantSilhouette, lion: LionSilhouette } as const;

/**
 * Écran « hors antenne » partagé : 404, erreurs de page, paiement non abouti.
 * `inset` : dans la coquille de l'application (pas de plein écran ni de fond de marque en double).
 */
export default function OffAirScreen({
  code,
  title,
  description,
  actions,
  illustration = 'elephant',
  inset = false,
  alert = false,
}: {
  code?: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  illustration?: keyof typeof ILLUSTRATIONS;
  inset?: boolean;
  /** Annonce immédiate aux lecteurs d'écran (erreur survenue pendant l'usage). */
  alert?: boolean;
}) {
  const Silhouette = ILLUSTRATIONS[illustration];
  const Tag = inset ? 'section' : 'main';
  return (
    <Tag
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden px-4 text-text',
        inset ? 'flex-1 py-12' : 'min-h-screen bg-black py-16',
      )}
    >
      {!inset && <BrandBackdrop variant="hero" />}
      <div role={alert ? 'alert' : undefined} className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center">
        {!inset && (
          <GoldRing className="size-20">
            <BrandLogo className="size-[4.25rem]" />
          </GoldRing>
        )}
        {code && (
          <p className="mt-6 font-display text-6xl leading-none font-bold text-al-gold/70" aria-hidden="true">{code}</p>
        )}
        <h1 className="mt-4 font-display text-2xl font-bold text-text sm:text-4xl">{title}</h1>
        <Silhouette className="mt-6 h-20 w-auto text-al-gold opacity-40" />
        <p className="mt-6 max-w-md text-sm leading-relaxed text-text-muted sm:text-base">{description}</p>
        {actions && <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
        <KenteBand className="mt-12 w-40" />
      </div>
    </Tag>
  );
}
