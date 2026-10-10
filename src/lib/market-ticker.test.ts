import test from 'node:test';
import assert from 'node:assert/strict';
import { previousSessionClose } from './market-quotes';
import { marketTickerItems, parseMarketsSnapshot, MARKET_MAX_STALE_MS } from './market-ticker';
import { marketArticleScope } from './live-markets';
import { articleTopics } from './radar-topics';

const now = Date.parse('2026-10-10T12:00:00Z');
const seconds = (date: string) => Date.parse(date) / 1000;
const quoteChart = (closes: (number | null)[] = [5867, 5700, 5582, 5665, 5665]) => ({
  meta: { regularMarketTime: seconds('2026-10-09T17:29:55Z'), exchangeTimezoneName: 'America/New_York', chartPreviousClose: 5867 },
  timestamp: [5, 6, 7, 8, 9].map(day => seconds(`2026-10-${String(day).padStart(2, '0')}T04:00:00Z`)),
  indicators: { quote: [{ close: closes }] },
});
const snapshot = () => ({
  updatedAt: new Date(now).toISOString(), disclaimer: '', availability: [],
  commodities: [{ symbol: 'CC=F', name: 'Cacao', label: 'Cacao · marché mondial', price: 5671, previousClose: 5665, previousCloseAt: '2026-10-08T04:00:00Z', changePercent24h: -3.34, currency: 'USD', unit: '$/tonne', updatedAt: '2026-10-09T17:29:55Z', source: 'Yahoo Finance / ICE US' }],
  forex: [{ pair: 'EUR / XOF', base: 'EUR', quote: 'XOF', rate: 655.957, label: 'Parité fixe', isPegged: true, source: 'BCEAO', updatedAt: '' },
    { pair: 'USD / EUR', base: 'USD', quote: 'EUR', rate: 0.892, label: 'Taux indicatif', isPegged: false, source: 'ExchangeRate-API', updatedAt: new Date(now).toISOString() }],
  alerts: [{ id: 'africa', title: 'Afrique', type: 'news', severity: 'info', scope: 'Africa', timestamp: new Date(now).toISOString(), url: 'https://example.test/africa?utm_source=rss' },
    { id: 'world', title: 'Monde', type: 'news', severity: 'info', scope: 'World', timestamp: new Date(now).toISOString(), url: 'https://example.test/world' }],
});

test('quote variation uses the preceding session, ignoring the five-day chart baseline', () => {
  const previous = previousSessionClose(quoteChart());
  assert.deepEqual(previous, { price: 5665, updatedAt: '2026-10-08T04:00:00.000Z' });
  const parsed = parseMarketsSnapshot(snapshot(), now)!;
  assert.ok(Math.abs(parsed.commodities[0].changePercent24h! - 0.1059135039717564) < 0.000001);
});

test('a missing preceding close stays unknown instead of falling back two sessions or to chartPreviousClose', () => {
  assert.equal(previousSessionClose(quoteChart([5867, 5700, 5582, null, 5665])), null);
  assert.equal(previousSessionClose({ ...quoteChart(), indicators: { quote: [{ close: [5867] }] } }), null);
  assert.equal(previousSessionClose({ ...quoteChart(), meta: { regularMarketTime: seconds('2026-10-09T17:00:00Z'), exchangeTimezoneName: 'invalid' } }), null);
});

test('the preceding session is Friday on Monday and respects the exchange timezone at UTC midnight', () => {
  const result = { meta: { regularMarketTime: seconds('2026-10-13T00:30:00Z'), exchangeTimezoneName: 'America/New_York' },
    timestamp: ['2026-10-09T13:00:00Z', '2026-10-12T13:00:00Z'].map(seconds), indicators: { quote: [{ close: [100, 110] }] } };
  assert.deepEqual(previousSessionClose(result), { price: 100, updatedAt: '2026-10-09T13:00:00.000Z' });
});

test('a chart missing the quoted session cannot prove a previous session', () => {
  const chart = quoteChart();
  chart.timestamp.pop(); chart.indicators.quote[0].close.pop();
  assert.equal(previousSessionClose(chart), null);
});

test('Africa keeps pan-African news without a country; a national-media country cannot turn international news African', () => {
  assert.equal(marketArticleScope({ editorialScope: 'africa', countryCode: null }), 'Africa');
  assert.equal(marketArticleScope({ editorialScope: 'international', countryCode: 'SN', countryBasis: 'media' }), 'World');
  assert.equal(marketArticleScope({ editorialScope: 'international', countryCode: 'SN', countryBasis: 'inferred_topic' }), 'Africa');
  assert.ok(articleTopics({ title: 'Budget', category: 'Economie' }).includes('economie'));
});

test('scope filters separate news and CFA rates, keep strategic commodities, and deduplicate canonical URLs', () => {
  const raw = snapshot(); raw.alerts.push({ ...raw.alerts[0], id: 'duplicate', url: 'https://example.test/africa?utm_source=other' });
  const parsed = parseMarketsSnapshot(raw, now)!;
  assert.deepEqual(marketTickerItems(parsed, 'Africa').map(item => item.id), ['alert:https://example.test/africa', 'quote:CC=F', 'forex:EUR / XOF']);
  assert.deepEqual(marketTickerItems(parsed, 'World').map(item => item.id), ['alert:https://example.test/world', 'quote:CC=F', 'forex:USD / EUR']);
});

test('invalid numeric rows and unsafe URLs are removed before formatting while valid entries survive', () => {
  const raw = snapshot(); raw.forex.push({ ...raw.forex[0], rate: NaN }); raw.commodities.push({ ...raw.commodities[0], price: Infinity });
  raw.alerts[0].url = 'javascript:alert(1)';
  const parsed = parseMarketsSnapshot(raw, now)!;
  assert.equal(parsed.forex.length, 2); assert.equal(parsed.commodities.length, 1); assert.equal(parsed.alerts[0].url, undefined);
});

test('invalid, future and expired envelopes are rejected; old/future news is excluded', () => {
  assert.equal(parseMarketsSnapshot({ ...snapshot(), forex: null }, now), null);
  assert.equal(parseMarketsSnapshot({ ...snapshot(), updatedAt: 'tomorrow' }, now), null);
  assert.equal(parseMarketsSnapshot({ ...snapshot(), updatedAt: new Date(now + 1000).toISOString() }, now), null);
  assert.equal(parseMarketsSnapshot({ ...snapshot(), updatedAt: new Date(now - MARKET_MAX_STALE_MS - 1).toISOString() }, now), null);
  const raw = snapshot(); raw.alerts[0].timestamp = new Date(now - 25 * 3600_000).toISOString(); raw.alerts[1].timestamp = new Date(now + 1000).toISOString();
  assert.equal(parseMarketsSnapshot(raw, now)!.alerts.length, 0);
});

test('an undated reference never produces a claimed daily variation', () => {
  const raw = snapshot(); raw.commodities[0].previousCloseAt = '';
  assert.equal(parseMarketsSnapshot(raw, now)!.commodities[0].changePercent24h, null);
});
