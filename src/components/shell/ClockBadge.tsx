'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildClock, detectTimeZone, type ClockReading } from '@/lib/clock';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

/** Heure locale de l'appareil ; l'heure de Dakar est donnée en info-bulle et pour les lecteurs d'écran. */
export default function ClockBadge({ className = '' }: { className?: string }) {
  const { t } = useI18n();
  const labels = t.shell.clock;
  const [reading, setReading] = useState<ClockReading | null>(null);

  useEffect(() => {
    const timeZone = detectTimeZone();
    const tick = () => setReading(buildClock(new Date(), timeZone, labels));
    tick();
    const interval = window.setInterval(tick, 15_000);
    return () => window.clearInterval(interval);
  }, [labels]);

  return (
    <div
      title={reading?.tooltip}
      className={`items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 text-xs font-semibold text-text-muted ${className}`}
    >
      <Clock3 size={14} aria-hidden="true" className="text-al-gold" />
      <span className="tabular-nums text-text">{reading?.time ?? '—'}</span>
      {reading && !reading.isDakar && <span className="hidden xl:inline">{reading.zone}</span>}
      <span className="sr-only">{reading ? format(labels.localWith, { tooltip: reading.tooltip }) : labels.local}</span>
    </div>
  );
}
