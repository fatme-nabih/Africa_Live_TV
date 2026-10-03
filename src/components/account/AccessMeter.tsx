import type { AccessGauge } from '@/lib/access-gauge';

/** Jauge des jours d'accès restants : vert tant que l'accès dure, or quand il se termine bientôt (jamais rouge). */
export default function AccessMeter({ gauge }: { gauge: AccessGauge }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl font-bold text-text">{gauge.label}</p>
        <p className="text-xs text-text-muted">sur {gauge.totalDays} jours</p>
      </div>
      <div
        role="meter"
        aria-label="Jours d’accès restants"
        aria-valuemin={0}
        aria-valuemax={gauge.totalDays}
        aria-valuenow={gauge.daysLeft}
        aria-valuetext={gauge.label}
        className="mt-2 h-2.5 overflow-hidden rounded-pill bg-surface-3"
      >
        <div
          className={`h-full rounded-pill ${gauge.endingSoon ? 'bg-al-gold' : 'bg-al-green'}`}
          style={{ width: `${Math.max(4, Math.round(gauge.ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}
