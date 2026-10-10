import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMarketPrice,
  formatVariation,
  PEGGED_EUR_XOF_RATE,
  PEGGED_EUR_XAF_RATE,
  usdXofRate,
} from './live-markets';

test('F9: EUR per USD multiplies the XOF per EUR peg; valid direct XOF wins',()=>{
  assert.equal(usdXofRate({EUR:0.9}),590.3613);
  assert.equal(usdXofRate({EUR:0.9,XOF:600}),600);
  for(const EUR of [0,-1,NaN,Infinity]) assert.throws(()=>usdXofRate({EUR}));
});

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
  assert.equal(pos.text, '+2,46 %');
  assert.equal(pos.isPositive, true);
  assert.equal(pos.isNeutral, false);

  const neg = formatVariation(-1.2);
  assert.equal(neg.text, '-1,20 %');
  assert.equal(neg.isPositive, false);
  assert.equal(neg.isNeutral, false);

  const neutral = formatVariation(0);
  assert.equal(neutral.text, '0,00 %');
  assert.equal(neutral.isNeutral, true);

  const nullVal = formatVariation(null);
  assert.equal(nullVal.text, 'Variation inconnue');
  assert.equal(nullVal.isNeutral, true);
});
