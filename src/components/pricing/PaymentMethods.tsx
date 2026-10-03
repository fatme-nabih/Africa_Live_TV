import { CreditCard } from 'lucide-react';
import { cn } from '@/components/ui';

/**
 * Moyens de paiement acceptés via NabooPay : pastilles dessinées localement (aucun chargement tiers).
 * Les couleurs de marque viennent des jetons `pay-*` de globals.css.
 */
export default function PaymentMethods({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <ul aria-label="Moyens de paiement acceptés" className={cn('flex flex-wrap items-center gap-2', className)}>
      <li className={pill}>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
          <rect width="20" height="20" rx="5" className="fill-pay-wave" />
          <path d="M3.5 11.5c1.6-2.4 3.2-2.4 4.4 0s2.8 2.4 4.2 0 2.8-2.4 4.4 0" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span>Wave</span>
      </li>
      <li className={pill}>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
          <rect width="20" height="20" rx="3" className="fill-pay-orange" />
          <rect x="4" y="13" width="12" height="2.4" rx="1" fill="white" />
        </svg>
        <span>Orange Money</span>
      </li>
      <li className={pill}>
        <CreditCard size={18} aria-hidden="true" className="shrink-0 text-al-gold" />
        <span>{compact ? 'Carte bancaire' : 'Visa / Mastercard'}</span>
      </li>
    </ul>
  );
}

const pill = 'inline-flex min-h-9 items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 text-xs font-semibold text-text';
