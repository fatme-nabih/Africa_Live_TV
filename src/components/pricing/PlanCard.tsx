'use client';
import { fr } from '@/i18n/fr';
import { useI18n } from '@/i18n/client';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/ui';

/**
 * Carte d'offre partagée par la landing et /pricing. `featured` : l'offre mise en avant (bordure or, ruban).
 * L'action (lien ou bouton de paiement) est fournie par la page : la carte ne connaît pas le parcours de paiement.
 */
export default function PlanCard({
  name,
  price,
  period,
  description,
  perks,
  ribbon,
  featured = false,
  action,
  note,
  className,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  perks: readonly ReactNode[];
  ribbon?: string;
  featured?: boolean;
  action: ReactNode;
  note?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <article
      className={cn(
        'relative flex flex-col rounded-card border p-6 sm:p-7',
        featured ? 'border-al-gold/60 bg-surface-1 shadow-2xl shadow-black/50' : 'border-line bg-surface-1/90',
        className,
      )}
    >
      {ribbon && (
        <p className="absolute -top-3 start-6 rounded-pill bg-al-gold px-3 py-1 text-xs font-bold text-black shadow-md">
          {ribbon}
        </p>
      )}
      <h3 className="font-display text-lg font-bold text-text">{name}</h3>
      <p className="mt-1.5 text-sm text-text-muted">{description}</p>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-4xl font-bold text-text">{price}</span>
        <span className="text-base font-bold text-al-gold">{t.pricing.copy["FCFA"]}</span>
        <span className="text-sm text-text-muted">{period}</span>
      </p>
      <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-5 text-sm text-text">
        {perks.map((perk, index) => (
          <li key={index} className="flex items-start gap-2.5">
            <Check size={16} aria-hidden="true" className={cn('mt-0.5 shrink-0', featured ? 'text-al-gold' : 'text-al-green')} />
            <span>{perk}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7">{action}</div>
      {note && <p className="mt-2 text-center text-xs text-text-muted">{note}</p>}
    </article>
  );
}

/** Offres affichées (montants identiques à NABOOPAY_PLANS ; 9 900 = 10 × 990, soit 2 mois offerts). */
export const PLAN_COPY = fr.pricing.plans;
