import { RefreshCw } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import type { CoverageLevel } from '@/lib/radar-workspace';

const DOT: Record<CoverageLevel, string> = {
  ok: 'bg-al-green',
  loading: 'bg-text-muted',
  degraded: 'bg-al-gold',
  down: 'bg-al-red',
};

export default function RadarHeader({
  refreshing,
  onRefresh,
  unknownCountry,
  coverage,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  unknownCountry: boolean;
  coverage: { level: CoverageLevel; short: string };
}) {
  return (
    <>
      <section id="radar-haut" className="mb-3 flex scroll-mt-20 flex-wrap items-end justify-between gap-3 sm:mb-4">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">Radar Afrique</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
            <span>Dépêches, météo et télévisions par pays.</span>
            <span className="ml-1 inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', DOT[coverage.level])} />
              {coverage.short}
            </span>
            <span aria-hidden="true">·</span>
            <a href="#radar-sources" className="font-semibold text-al-gold underline underline-offset-2 hover:text-text">Sources et fraîcheur</a>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          icon={<RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5 text-al-gold', refreshing && 'animate-spin')} />}
        >
          {refreshing ? 'Actualisation…' : 'Actualiser'}
        </Button>
      </section>

      {unknownCountry && (
        <p role="status" className="mb-3 rounded-control border border-line-gold bg-surface-1 px-3 py-2 text-xs text-text">Pays inconnu dans le lien : vue Afrique affichée.</p>
      )}
    </>
  );
}
