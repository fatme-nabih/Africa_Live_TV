'use client';

import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { buildClock, detectTimeZone, type ClockReading } from '@/lib/clock';

/** Heure locale de l'appareil ; l'heure de Dakar est donnée en info-bulle et pour les lecteurs d'écran. */
export default function ClockBadge({ className = '' }: { className?: string }) {
  const [reading, setReading] = useState<ClockReading | null>(null);

  useEffect(() => {
    const timeZone = detectTimeZone();
    const tick = () => setReading(buildClock(new Date(), timeZone));
    tick();
    const interval = window.setInterval(tick, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      title={reading?.tooltip}
      className={`items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 text-xs font-semibold text-text-muted ${className}`}
    >
      <Clock3 size={14} aria-hidden="true" className="text-al-gold" />
      <span className="tabular-nums text-text">{reading?.time ?? '—'}</span>
      {reading && !reading.isDakar && <span className="hidden xl:inline">{reading.zone}</span>}
      <span className="sr-only">{reading ? `Heure locale. ${reading.tooltip}` : 'Heure locale'}</span>
    </div>
  );
}
