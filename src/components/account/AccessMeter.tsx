'use client';
import { useI18n } from '@/i18n/client';
import type { AccessGauge } from '@/lib/access-gauge';

/** Jauge des jours d'accès restants : vert tant que l'accès dure, or quand il se termine bientôt (jamais rouge). */
export default function AccessMeter({ gauge }: { gauge: AccessGauge }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-xl font-bold text-text">{gauge.label}</p>
        <p className="text-xs text-text-muted">{t.account.copy["sur "]}{gauge.totalDays} {t.account.copy[" jours"]}</p>
      </div>
      <div
        role="meter"
        aria-label={t.account.copy["Jours d’accès restants"]}
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
