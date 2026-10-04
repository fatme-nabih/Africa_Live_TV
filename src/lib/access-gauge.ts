import { PAYMENT_GRACE_DAYS, TRIAL_DURATION_DAYS, type AccessDecision } from './access-policy';

const DAY_MS = 24 * 60 * 60 * 1000;

// Libellés affichés des formules : les identifiants internes (`lumina_all_access_*`) ne sont jamais montrés.
const PLANS: Record<string, { label: string; days: number }> = {
  lumina_all_access_monthly: { label: 'Africa Live Mensuel', days: 30 },
  lumina_all_access_annual: { label: 'Africa Live Annuel', days: 365 },
};

export function planLabel(planCode: string | null | undefined, decision: Pick<AccessDecision, 'status' | 'reason'>) {
  if (decision.reason === 'administrator_access') return 'Accès administrateur';
  if (decision.reason === 'local_development') return 'Version locale';
  if (decision.status === 'trial') return 'Essai gratuit';
  return (planCode && PLANS[planCode]?.label) || 'Aucune formule active';
}

export type AccessGauge = {
  daysLeft: number;
  totalDays: number;
  /** Part restante, entre 0 et 1. */
  ratio: number;
  label: string;
  /** Moins de 3 jours : on invite à renouveler (or, jamais rouge tant que l'accès est actif). */
  endingSoon: boolean;
};

/**
 * Jauge « jours restants » tirée de la décision d'accès déjà calculée côté serveur (aucune nouvelle donnée).
 * Pas de jauge sans échéance (administrateur, version locale) ni sans accès.
 */
export function accessGauge(
  decision: Pick<AccessDecision, 'status' | 'hasAccess' | 'expiresAt' | 'reason'>,
  planCode: string | null | undefined,
  now = Date.now(),
): AccessGauge | null {
  if (!decision.hasAccess || !decision.expiresAt) return null;
  const end = Date.parse(decision.expiresAt);
  if (!Number.isFinite(end)) return null;
  const totalDays = decision.status === 'trial' ? TRIAL_DURATION_DAYS
    : decision.status === 'grace' ? PAYMENT_GRACE_DAYS
    : (planCode && PLANS[planCode]?.days) || 30;
  const daysLeft = Math.min(totalDays, Math.max(0, Math.ceil((end - now) / DAY_MS)));
  const label = daysLeft === 0 ? 'Se termine aujourd’hui' : daysLeft === 1 ? '1 jour restant' : `${daysLeft} jours restants`;
  return { daysLeft, totalDays, ratio: totalDays ? daysLeft / totalDays : 0, label, endingSoon: daysLeft < 3 };
}

/**
 * Décision affichée sur la carte « Mon accès ». La décision d'accès renvoie l'essai ou l'abonnement en cours avant de vérifier le
 * rôle administrateur ; pour un administrateur la carte présente donc l'accès administrateur partout (statut, formule, sans jauge),
 * au lieu de mêler « Essai actif · 5 jours restants » et « Accès permanent ». Affichage seulement : l'accès réel ne change pas.
 */
export function accountAccessView<T extends AccessDecision>(decision: T, isAdmin: boolean): AccessDecision {
  return isAdmin ? { status: 'active', hasAccess: true, expiresAt: null, reason: 'administrator_access' } : decision;
}
