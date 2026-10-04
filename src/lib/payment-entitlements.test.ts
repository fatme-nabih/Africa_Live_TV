import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePaymentEntitlement, diagnosePaymentEntitlement, type EntitlementPurchase } from './payment-entitlements';
const trial = '2026-08-31T00:00:00Z';
function purchase(id: string, paidAt: string, extra: Partial<EntitlementPurchase> = {}): EntitlementPurchase {
  return { id, paidAt, status: 'completed', planCode: 'lumina_all_access_monthly', fulfilledAt: null,
    providerCreatedAt: null, createdAt: paidAt, ...extra };
}
test('F1: historical purchase remains fixed, pending/failed give no days', () => {
  const rows = [purchase('a', '2026-09-01T00:00:00Z'), purchase('b', '2026-10-20T00:00:00Z', {status:'pending'})];
  assert.equal(calculatePaymentEntitlement(trial, rows).currentPeriodEnd, '2026-10-01T00:00:00.000Z');
});
test('F1: trial, renewals, gaps, out of order, same date and refund are deterministic', () => {
  const a = purchase('a', '2026-08-20T00:00:00Z');
  const b = purchase('b', '2026-09-01T00:00:00Z', {planCode:'lumina_all_access_annual'});
  assert.equal(calculatePaymentEntitlement(trial, [b,a]).currentPeriodEnd, '2027-09-30T00:00:00.000Z');
  assert.equal(calculatePaymentEntitlement(trial, [{...a,status:'refunded'},b]).currentPeriodEnd, '2027-09-01T00:00:00.000Z');
  assert.equal(calculatePaymentEntitlement(trial, [a,purchase('c','2026-12-01T00:00:00Z')]).currentPeriodEnd, '2026-12-31T00:00:00.000Z');
  assert.equal(calculatePaymentEntitlement(trial, [a,{...a,id:'b'}]).currentPeriodEnd, '2026-10-30T00:00:00.000Z');
});
test('historical diagnostic is read-only and signals missing dates and excess grants', () => {
  const rows = [purchase('a','2026-09-01T00:00:00Z')];
  const before = JSON.stringify(rows);
  assert.equal(diagnosePaymentEntitlement(trial, rows, '2026-10-01T00:00:00Z').category,'consistent');
  assert.equal(diagnosePaymentEntitlement(trial, rows, '2026-11-01T00:00:00Z').category,'review_required');
  assert.equal(diagnosePaymentEntitlement(trial,rows,'2026-10-31T00:00:00Z','2026-10-01T00:00:00Z').category,'legacy_formula_candidate');
  assert.equal(diagnosePaymentEntitlement(trial, [{...rows[0],paidAt:null}], null).category,'date_missing');
  assert.equal(JSON.stringify(rows), before);
});
