import { HelpCircle, Home, Tv } from 'lucide-react';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import GoldRing from '@/components/brand/GoldRing';
import KenteBand from '@/components/brand/KenteBand';
import { ElephantSilhouette } from '@/components/brand/Silhouettes';
import BrandLogo from '@/components/BrandLogo';
import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 py-16 text-text selection:bg-al-gold/30 selection:text-text">
      <BrandBackdrop variant="hero" />

      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center">
        <GoldRing className="size-20">
          <BrandLogo className="size-[4.25rem]" />
        </GoldRing>

        <p className="mt-6 font-display text-6xl font-bold leading-none text-al-gold/70" aria-hidden="true">404</p>

        <h1 className="mt-4 font-display text-2xl font-bold text-text sm:text-4xl">
          Page hors antenne
        </h1>

        <ElephantSilhouette className="mt-6 h-20 w-auto text-al-gold opacity-40" />

        <p className="mt-6 max-w-md text-sm leading-relaxed text-text-muted sm:text-base">
          Le programme, la chaîne ou l’adresse demandée n’existe pas ou a été déplacé.
          Vérifiez l’adresse ou reprenez le fil du direct : le live revient à vous.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/app/live" variant="primary" icon={<Tv size={16} aria-hidden="true" />}>
            Ouvrir le dashboard
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" icon={<Home size={16} aria-hidden="true" />}>
            Accueil
          </ButtonLink>
          <ButtonLink href="/contact" variant="ghost" icon={<HelpCircle size={16} aria-hidden="true" />}>
            Besoin d’aide ?
          </ButtonLink>
        </div>

        <KenteBand className="mt-12 w-40" />
      </div>
    </main>
  );
}
