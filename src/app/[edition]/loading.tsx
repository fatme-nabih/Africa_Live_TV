import { getI18n } from '@/i18n/server';
import BrandLogo from '@/components/BrandLogo';
import GoldRing from '@/components/brand/GoldRing';

/** Attente d'une page : le logo dans son anneau or et une barre tricolore (immobile si le mouvement est réduit). */
export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div role="status" className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-5 px-4">
      <GoldRing className="size-16">
        <BrandLogo className="size-14" />
      </GoldRing>
      <span aria-hidden="true" className="bg-tricolor-bar h-1 w-32 animate-pulse rounded-pill motion-reduce:animate-none" />
      <span className="text-sm text-text-muted">{t.errors.copy["Le live arrive…"]}</span>
    </div>
  );
}
