import assert from 'node:assert/strict';
import test from 'node:test';

import { accessGauge, planLabel } from './access-gauge';

const NOW = Date.parse('2026-10-03T12:00:00Z');
const inDays = (days: number) => new Date(NOW + days * 86_400_000).toISOString();

test('trial gauge counts remaining days out of the 5-day trial', () => {
  const gauge = accessGauge({ status: 'trial', hasAccess: true, expiresAt: inDays(3.2), reason: 'trial_active' }, null, NOW);
  assert.deepEqual(gauge, { daysLeft: 4, totalDays: 5, ratio: 0.8, label: '4 jours restants', endingSoon: false });
});

test('subscription gauge uses the plan duration and clamps to it', () => {
  const annual = accessGauge({ status: 'active', hasAccess: true, expiresAt: inDays(400), reason: 'subscription_active' }, 'lumina_all_access_annual', NOW);
  assert.equal(annual?.totalDays, 365);
  assert.equal(annual?.daysLeft, 365);
  const monthly = accessGauge({ status: 'active', hasAccess: true, expiresAt: inDays(0.5), reason: 'subscription_active' }, 'lumina_all_access_monthly', NOW);
  assert.equal(monthly?.label, '1 jour restant');
  assert.equal(monthly?.endingSoon, true);
});

test('no gauge without access or without a known end date', () => {
  assert.equal(accessGauge({ status: 'expired', hasAccess: false, expiresAt: inDays(-1), reason: 'trial_expired' }, null, NOW), null);
  assert.equal(accessGauge({ status: 'active', hasAccess: true, expiresAt: null, reason: 'administrator_access' }, null, NOW), null);
  assert.equal(accessGauge({ status: 'active', hasAccess: true, expiresAt: 'invalide', reason: 'subscription_active' }, null, NOW), null);
});

test('plan labels never expose internal identifiers', () => {
  assert.equal(planLabel('lumina_all_access_monthly', { status: 'active', reason: 'subscription_active' }), 'Africa Live Mensuel');
  assert.equal(planLabel('lumina_all_access_annual', { status: 'active', reason: 'subscription_active' }), 'Africa Live Annuel');
  assert.equal(planLabel(undefined, { status: 'trial', reason: 'trial_active' }), 'Essai gratuit');
  assert.equal(planLabel('inconnu', { status: 'expired', reason: 'subscription_expired' }), 'Aucune formule active');
  assert.equal(planLabel(null, { status: 'active', reason: 'administrator_access' }), 'Accès administrateur');
});
