import test from 'node:test';
import assert from 'node:assert/strict';
import { basketCommodities, indicativeUsdXof } from './market-basket';
import { formatMarketPrice } from './market-format';
import type { LiveMarketsSnapshot, MarketCommodity } from './live-markets-types';

const quote = (symbol: string, price: number, currency = 'USD'): MarketCommodity => ({ symbol, name: symbol, label: symbol, price, currency, unit: '$/x', source: 'Test', updatedAt: '2026-10-09T17:00:00Z', previousClose: null, changePercent24h: null });
const snapshot = (commodities: MarketCommodity[], usdXof?: number): LiveMarketsSnapshot => ({ commodities, alerts: [], updatedAt: '2026-10-10T12:00:00Z', availability: [], disclaimer: '',
  forex: [{ pair: 'EUR / XOF', base: 'EUR', quote: 'XOF', rate: 655.957, label: 'Parité fixe', isPegged: true, updatedAt: '', source: 'BCEAO' },
    ...(usdXof ? [{ pair: 'USD / XOF', base: 'USD', quote: 'XOF', rate: usdXof, label: 'Taux indicatif', isPegged: false, updatedAt: '2026-10-10T00:00:00Z', source: 'ExchangeRate-API' }] : [])] });

test('quotes published in US cents keep their original currency on display', () => {
  assert.match(formatMarketPrice(81.02, 'USX', '¢/lb'), /^81,02 cents US \/ lb$/);
  assert.match(formatMarketPrice(16.94, 'USD', '$/cwt'), /^16,94 USD \/ cwt$/);
});

test('the dollar chip needs a real indicative USD rate; the euro peg alone is not enough', () => {
  assert.equal(indicativeUsdXof(snapshot([])), null);
  assert.equal(indicativeUsdXof(snapshot([], 562.5)), 562.5);
});

test('the basket starts with everyday imports and keeps unknown products last', () => {
  const ordered = basketCommodities(snapshot([quote('XX=F', 1), quote('CC=F', 1), quote('GC=F', 1), quote('ZR=F', 1)])).map(item => item.symbol);
  assert.deepEqual(ordered, ['ZR=F', 'GC=F', 'CC=F', 'XX=F']);
  assert.deepEqual(basketCommodities(null), []);
});

test('every basket product points to real African countries on the map, without duplicates', async () => {
  const { BASKET_ORDER } = await import('./market-basket');
  const { COMMODITY_GEOGRAPHY, commodityFocus, commodityFocusLabel } = await import('./market-geography');
  const { AFRICAN_COUNTRIES } = await import('./radar-countries');
  const known = new Set(AFRICAN_COUNTRIES.map(country => country.code));
  assert.deepEqual(Object.keys(COMMODITY_GEOGRAPHY).sort(), [...BASKET_ORDER].sort());
  for (const [symbol, geography] of Object.entries(COMMODITY_GEOGRAPHY)) {
    assert.ok(geography.codes.length > 0 && geography.codes.every(code => known.has(code)), symbol);
    assert.equal(new Set(geography.codes).size, geography.codes.length, symbol);
  }
  assert.ok(COMMODITY_GEOGRAPHY['ZR=F'].codes.includes('SN') && COMMODITY_GEOGRAPHY['ZR=F'].role === 'importateurs');
  assert.equal(commodityFocusLabel(commodityFocus({ symbol: 'CC=F', name: 'Cacao' })!), 'Principaux producteurs : cacao');
  assert.equal(commodityFocus({ symbol: 'XX=F', name: 'Inconnu' }), null);
});

test('sparkline history keeps dated valid closes up to the quoted session and is validated on the client', async () => {
  const { recentCloses } = await import('./market-quotes');
  const { parseMarketsSnapshot } = await import('./market-ticker');
  const s = (iso: string) => Date.parse(iso) / 1000;
  const chart = { meta: { regularMarketTime: s('2026-10-09T18:00:00Z') }, timestamp: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12'].map(day => s(day + 'T04:00:00Z')),
    indicators: { quote: [{ close: [10, null, 12, -1, 13, 99] }] } };
  assert.deepEqual(recentCloses(chart).map(point => point.price), [10, 12, 13], 'gaps and future sessions are skipped, never invented');
  assert.deepEqual(recentCloses({ timestamp: [1], indicators: { quote: [{ close: [] }] } }), []);
  const now = Date.parse('2026-10-10T12:00:00Z');
  const raw = { ...snapshot([quote('CC=F', 5671)]), updatedAt: new Date(now).toISOString() };
  (raw.commodities[0] as MarketCommodity).history = [{ at: '2026-10-08T04:00:00Z', price: 5600 }, { at: 'bad', price: 1 }, { at: '2026-10-09T04:00:00Z', price: NaN }, { at: '2026-10-09T04:00:00Z', price: 5671 }];
  assert.deepEqual(parseMarketsSnapshot(raw, now)!.commodities[0].history!.map(point => point.price), [5600, 5671]);
});
