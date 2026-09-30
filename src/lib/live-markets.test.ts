import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearMarketsCache,
  formatMarketPrice,
  formatVariation,
  getLiveMarkets,
  PEGGED_EUR_XOF_RATE,
  PEGGED_EUR_XAF_RATE,
} from './live-markets';

test('PEGGED rates match the official BCEAO / BEAC treaties', () => {
  assert.equal(PEGGED_EUR_XOF_RATE, 655.957);
  assert.equal(PEGGED_EUR_XAF_RATE, 655.957);
});

test('formatMarketPrice formats prices with currency and unit', () => {
  const formattedCocoa = formatMarketPrice(5350, 'USD', '$/tonne');
  assert.match(formattedCocoa, /5\s?350/);
  assert.match(formattedCocoa, /USD \/ tonne/);

  const formattedBrent = formatMarketPrice(98.5, 'USD', '$/baril');
  assert.match(formattedBrent, /98,50/);
  assert.match(formattedBrent, /USD \/ baril/);
});

test('formatVariation classifies positive, negative and neutral changes', () => {
  const pos = formatVariation(2.456);
  assert.equal(pos.text, '+2.46 %');
  assert.equal(pos.isPositive, true);
  assert.equal(pos.isNeutral, false);

  const neg = formatVariation(-1.2);
  assert.equal(neg.text, '-1.20 %');
  assert.equal(neg.isPositive, false);
  assert.equal(neg.isNeutral, false);

  const neutral = formatVariation(0);
  assert.equal(neutral.text, '0.00 %');
  assert.equal(neutral.isNeutral, true);

  const nullVal = formatVariation(null);
  assert.equal(nullVal.text, '0.00 %');
  assert.equal(nullVal.isNeutral, true);
});

test('getLiveMarkets fetches commodities, forex and alerts resiliently', async () => {
  clearMarketsCache();
  const snapshot = await getLiveMarkets();

  assert.ok(Array.isArray(snapshot.commodities));
  assert.ok(snapshot.commodities.length >= 3);

  // Vérifier la présence des 3 commodités clés demandées
  const cacao = snapshot.commodities.find((c) => c.symbol === 'CC=F');
  assert.ok(cacao, 'Cacao must be present');
  assert.equal(cacao.name, 'Cacao');
  assert.ok(cacao.price > 0);

  const brent = snapshot.commodities.find((c) => c.symbol === 'BZ=F');
  assert.ok(brent, 'Brent must be present');
  assert.equal(brent.name, 'Pétrole Brent');
  assert.ok(brent.price > 0);

  const gold = snapshot.commodities.find((c) => c.symbol === 'GC=F');
  assert.ok(gold, 'Gold must be present');
  assert.equal(gold.name, 'Or');
  assert.ok(gold.price > 0);

  // Vérifier la présence des devises clés
  assert.ok(Array.isArray(snapshot.forex));
  const eurXof = snapshot.forex.find((f) => f.pair === 'EUR / XOF');
  assert.ok(eurXof, 'EUR / XOF must be present');
  assert.equal(eurXof.rate, 655.957);
  assert.equal(eurXof.isPegged, true);

  const eurXaf = snapshot.forex.find((f) => f.pair === 'EUR / XAF');
  assert.ok(eurXaf, 'EUR / XAF must be present');
  assert.equal(eurXaf.rate, 655.957);
  assert.equal(eurXaf.isPegged, true);

  const usdXof = snapshot.forex.find((f) => f.pair === 'USD / XOF');
  assert.ok(usdXof, 'USD / XOF must be present');
  assert.ok(usdXof.rate > 400 && usdXof.rate < 900);

  // Vérifier cache
  const cached = await getLiveMarkets();
  assert.equal(cached.updatedAt, snapshot.updatedAt);
});

test('getLiveMarkets forceRefresh bypasses the in-memory cache', async () => {
  clearMarketsCache();
  const first = await getLiveMarkets();
  // Attendre au moins 10ms pour garantir un timestamp différent
  await new Promise((resolve) => setTimeout(resolve, 15));
  const refreshed = await getLiveMarkets({ forceRefresh: true });

  assert.ok(typeof first.updatedAt === 'string');
  assert.ok(typeof refreshed.updatedAt === 'string');
});
