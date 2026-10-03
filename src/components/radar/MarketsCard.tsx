import { ChevronDown } from 'lucide-react';
import LiveMarketTicker from '@/components/radar/LiveMarketTicker';
import type { RadarSourceRow } from '@/lib/radar-workspace';

export default function MarketsCard({
  className = '',
  open,
  onOpenChange,
  onSelectCountry,
  onSourcesChange,
  refreshToken,
}: {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCountry: (code: string | null) => void;
  onSourcesChange: (sources: RadarSourceRow[]) => void;
  refreshToken: number;
}) {
  return (
    <details
      id="radar-marches"
      open={open}
      onToggle={event => onOpenChange(event.currentTarget.open)}
      className={`group scroll-mt-20 overflow-hidden rounded-card border border-line bg-surface-1 ${className}`}
    >
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 py-2 text-xs font-bold text-text transition hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:px-5">
        Marchés et événements
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-text-muted transition-transform group-open:rotate-180" />
      </summary>
      <LiveMarketTicker onSelectCountry={onSelectCountry} onSourcesChange={onSourcesChange} refreshToken={refreshToken} />
    </details>
  );
}
