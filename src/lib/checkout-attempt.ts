import { z } from 'zod';

const schema = z.object({ key: z.string().uuid(), attemptId: z.string().min(1).nullable() }).strict();
export type CheckoutAttempt = z.infer<typeof schema>;
export const CHECKOUT_PLANS = ['lumina_all_access_monthly', 'lumina_all_access_annual'] as const;
export type CheckoutPlan = typeof CHECKOUT_PLANS[number];
const memory = new Map<CheckoutPlan, CheckoutAttempt | null>();
const storageKey = (plan: CheckoutPlan) => 'al_checkout_attempt_' + plan;
// Accessing the Storage getter can fail as well as its individual methods.
function storage() { try { return typeof window === 'undefined' ? null : window.sessionStorage; } catch { return null; } }
export function readCheckoutAttempt(plan: CheckoutPlan): CheckoutAttempt | null {
  if (memory.has(plan)) return memory.get(plan) ?? null;
  let attempt: CheckoutAttempt | null = null;
  try {
    const raw = storage()?.getItem(storageKey(plan));
    if (raw) attempt = schema.safeParse(JSON.parse(raw)).data ?? null;
    if (!attempt) {
      const legacy = z.string().uuid().safeParse(storage()?.getItem('al_checkout_key_' + plan));
      if (legacy.success) attempt = { key: legacy.data, attemptId: null };
    }
  } catch { /* memory remains usable */ }
  memory.set(plan, attempt);
  return attempt;
}
export function saveCheckoutAttempt(plan: CheckoutPlan, attempt: CheckoutAttempt) {
  memory.set(plan, attempt);
  try { storage()?.setItem(storageKey(plan), JSON.stringify(attempt)); } catch { /* stable for this page */ }
}
export function replaceCheckoutAttempt(plan: CheckoutPlan, expectedKey: string, attempt: CheckoutAttempt) {
  if (readCheckoutAttempt(plan)?.key !== expectedKey) return false;
  saveCheckoutAttempt(plan,attempt); return true;
}
export function finishCheckoutAttempt(plan: CheckoutPlan, attempt: CheckoutAttempt) {
  const current = readCheckoutAttempt(plan);
  if (!current || current.key !== attempt.key || current.attemptId !== attempt.attemptId) return false;
  memory.set(plan, null);
  try { storage()?.removeItem(storageKey(plan)); storage()?.removeItem('al_checkout_key_' + plan); } catch { /* do not reload stale data in this page */ }
  return true;
}
export function confirmCheckoutAttempt(plan: CheckoutPlan, attemptId: string) {
  const current = readCheckoutAttempt(plan);
  return current?.attemptId === attemptId ? finishCheckoutAttempt(plan, current) : false;
}
