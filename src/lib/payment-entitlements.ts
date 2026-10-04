export const PAYMENT_PLAN_DAYS = { lumina_all_access_monthly: 30, lumina_all_access_annual: 365 } as const;
export type EntitlementPurchase = {
  id: string; planCode: string; status: string; paidAt: string | null;
  fulfilledAt: string | null; providerCreatedAt: string | null; createdAt: string;
};

// The first verified purchase date is immutable. Historical rows without paidAt
// use their first fulfilment (never a later provider update or the replay clock).
export function effectivePurchaseDate(purchase: EntitlementPurchase) {
  return purchase.paidAt ?? purchase.fulfilledAt ?? purchase.providerCreatedAt ?? purchase.createdAt;
}

export function calculatePaymentEntitlement(trialEndsAt: string, purchases: EntitlementPurchase[]) {
  let end = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(end)) throw new Error('INVALID_TRIAL_DATE');
  let start: number | null = null;
  let planCode: string | null = null;
  const valid = purchases.filter(p => p.status === 'completed').sort((a, b) =>
    Date.parse(effectivePurchaseDate(a)) - Date.parse(effectivePurchaseDate(b)) || a.id.localeCompare(b.id));
  for (const purchase of valid) {
    const days = PAYMENT_PLAN_DAYS[purchase.planCode as keyof typeof PAYMENT_PLAN_DAYS];
    const paid = Date.parse(effectivePurchaseDate(purchase));
    if (!days || !Number.isFinite(paid)) throw new Error('AMBIGUOUS_PURCHASE');
    start = Math.max(end, paid);
    end = start + days * 86_400_000;
    planCode = purchase.planCode;
  }
  return { currentPeriodStart: start === null ? null : new Date(start).toISOString(),
    currentPeriodEnd: new Date(end).toISOString(), planCode, hasPurchases: start !== null };
}

export function diagnosePaymentEntitlement(trialEndsAt: string, purchases: EntitlementPurchase[], recordedEnd: string | null, recordedStart: string | null = null) {
  if (purchases.some(p => p.status === 'completed' && !p.paidAt)) return { category: 'date_missing' as const };
  try {
    const expected = calculatePaymentEntitlement(trialEndsAt, purchases);
    const deltaMs = recordedEnd ? Date.parse(recordedEnd) - Date.parse(expected.currentPeriodEnd) : null;
    const completed=purchases.filter(p=>p.status==='completed');
    const days=completed.reduce((sum,p)=>sum+(PAYMENT_PLAN_DAYS[p.planCode as keyof typeof PAYMENT_PLAN_DAYS]??0),0);
    // Compatibility with the old formula is an explanation candidate, not
    // proof of provenance or authorization to reduce a historical grant.
    const legacyEnd=recordedStart ? Math.max(Date.parse(recordedStart),Date.parse(trialEndsAt))+days*86_400_000 : NaN;
    if(deltaMs!==0&&completed.length&&recordedEnd&&legacyEnd===Date.parse(recordedEnd)) {
      return {category:'legacy_formula_candidate' as const,expectedEnd:expected.currentPeriodEnd,deltaMs,requiresReview:true};
    }
    return { category: deltaMs === 0 ? 'consistent' as const : 'review_required' as const,
      expectedEnd: expected.currentPeriodEnd, deltaMs };
  } catch { return { category: 'date_missing' as const }; }
}
