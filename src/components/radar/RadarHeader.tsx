import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import FollowCountryButton from '@/components/shell/FollowCountryButton';

export default function RadarHeader({
  refreshing,
  onRefresh,
  unknownCountry,
  country,
  ticker,
}: {
  refreshing: boolean;
  onRefresh: () => void;
  unknownCountry: boolean;
  /** Pays affiché : il peut être suivi (UX-503). */
  country: string | null;
  /** Bandeau sous le titre, sur toute la largeur. */
  ticker?: ReactNode;
}) {
  return (
    <>
      <section id="radar-haut" className="mb-3 flex scroll-mt-20 flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:mb-4">
        <div className="shrink-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">Radar Afrique</h1>
          <p className="mt-0.5 text-xs text-text-muted sm:text-sm">L’actualité, la météo et les chaînes TV, pays par pays.</p>
        </div>
        {ticker && <div className="order-last w-full min-w-0">{ticker}</div>}
        <div className="flex flex-wrap items-center gap-2">
        {country && <FollowCountryButton code={country} />}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing}
          icon={<RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5 text-al-gold', refreshing && 'animate-spin')} />}
        >
          {refreshing ? 'Actualisation…' : 'Actualiser'}
        </Button>
        </div>
      </section>

      {unknownCountry && (
        <p role="status" className="mb-3 rounded-control border border-line-gold bg-surface-1 px-3 py-2 text-xs text-text">Pays inconnu dans le lien : vue Afrique affichée.</p>
      )}
    </>
  );
}
