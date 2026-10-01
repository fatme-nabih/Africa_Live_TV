import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalArticleUrl, normalizeRadarDate, temporalWindow, uniqueFilterOptions } from './radar-data';
import { summarizeChannelCandidates, type SummarySourceRow } from './live-channel-summary';
import { clearRssCacheForTesting, getRadarRss, parseFeedXml, RSS_FEEDS } from './rss-collector';
import { clearNewsCacheForTests, getRadarNews } from './live-osint';
import { clearDisastersCacheForTests, getDisasterEventsSnapshot } from './live-disasters';
import { clearFirmsCacheForTests, getFirmsSnapshot } from './live-firms';
import { clearMarketsCache, getLiveMarkets } from './live-markets';
import { readRadarText } from './radar-upstream';
import { clearWeatherCacheForTesting, getRadarWeather } from './live-weather';

const NOW = Date.parse('2026-09-30T16:00:00Z');
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const emptyRss = () => new Response('<rss><channel/></rss>');
function reset() { clearRssCacheForTesting(); clearNewsCacheForTests(); clearDisastersCacheForTests(); clearFirmsCacheForTests(); clearMarketsCache(); clearWeatherCacheForTesting(); }

test('publication window preserves unknown dates, excludes future/old and respects the exact 24h boundary', () => {
  const dates = ['2026-09-30T16:00:00Z', '2026-09-29T16:00:00Z', '2026-09-29T15:59:59Z', '2026-09-30T16:00:01Z', '', '20260230T120000Z'];
  const result = temporalWindow(dates, date => date, NOW);
  assert.deepEqual(result.recent, dates.slice(0, 2));
  assert.equal(result.undated.length, 2);
  assert.equal(result.window.old, 1);
  assert.equal(result.window.future, 1);
  assert.equal(normalizeRadarDate('2026-02-30T12:00:00Z'), null);
  assert.equal(normalizeRadarDate('2026-09-30T12:00:00'), null);
  assert.equal(normalizeRadarDate('2026-09-30T14:00:00+02:00'), '2026-09-30T12:00:00.000Z');
});

test('URL identity removes tracking but preserves case-sensitive paths and meaningful parameters', () => {
  assert.equal(canonicalArticleUrl('https://Example.org/A?utm_source=rss&ref=edition&b=2&a=1#x'), 'https://example.org/A?a=1&b=2&ref=edition');
  assert.notEqual(canonicalArticleUrl('https://example.org/A'), canonicalArticleUrl('https://example.org/a'));
  assert.equal(canonicalArticleUrl('javascript:alert(1)'), '');
  assert.equal(canonicalArticleUrl('https://user:pass@example.org/'), '');
  assert.deepEqual(uniqueFilterOptions([' FR ', 'FR', '', ' ', 'SN', 'SN']), ['FR', 'SN']);
});

test('Ecofin links with the same long prefix receive distinct IDs, duplicate links retain one identity', () => {
  const prefix = 'https://www.agenceecofin.com/actualites/' + 'a'.repeat(120);
  const feed = RSS_FEEDS.find(f => /ecofin/i.test(f.name))!;
  const items = [prefix + '1', prefix + '2', prefix + '1?utm_source=rss'];
  const articles = parseFeedXml(`<rss>${items.map(url => `<item><title>Sénégal économie</title><link>${url}</link><updated>2026-09-30T15:00:00Z</updated></item>`).join('')}</rss>`, feed);
  assert.notEqual(articles[0].id, articles[1].id);
  assert.equal(articles[0].id, articles[2].id);
  assert.equal(articles[0].publishedAt, null);
  assert.equal(articles[0].updatedAt, '2026-09-30T15:00:00.000Z');
});

test('TV counts deduplicate channels and use resolver eligibility for CORS, review, freshness and sensitive URLs', () => {
  const base: SummarySourceRow = { channelId: 'web', countryCode: 'SN', url: 'https://example.org/live.m3u8', status: 'BROWSER_OK', corsAllowed: true,
    mixedContent: false, lastSuccessAt: '2026-09-30T15:00:00Z', directEligibility: 'PUBLIC_DIRECT_WEB', eligibilityReason: '' };
  const rows = [base, base, { ...base, channelId: 'vlc', status: 'VLC_ONLY', directEligibility: 'PUBLIC_DIRECT_VLC' },
    { ...base, channelId: 'review', directEligibility: 'REVIEW_REQUIRED' }, { ...base, channelId: 'old', lastSuccessAt: '2026-09-01T00:00:00Z' },
    { ...base, channelId: 'cors', corsAllowed: false }, { ...base, channelId: 'sensitive', url: 'https://example.org/live?token=secret' },
    { ...base, channelId: 'none', url: null }, { ...base, channelId: 'future', lastSuccessAt: '2026-10-01T00:00:00Z' }];
  const summary = summarizeChannelCandidates(rows, new Date(NOW));
  assert.equal(summary.totalChannels, 8);
  assert.equal(summary.totalDirectWeb, 1);
  assert.equal(summary.totalDirectVlc, 3);
});

test('RSS distinguishes valid empty, partial outage, stale reuse and expired fallback with unchanged success time', async t => {
  reset();
  let now = NOW, failure = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    if (failure && String(url) === RSS_FEEDS.find(f => f.enabled)!.url) throw new Error('outage');
    return emptyRss();
  });
  try {
    const empty = await getRadarRss();
    assert.equal(empty.articles.length, 0);
    assert.ok(empty.availability?.every(s => s.status === 'empty'));
    failure = true; now += 6 * 60_000;
    const partial = await getRadarRss();
    const stale = partial.availability?.find(s => s.status === 'stale');
    assert.ok(stale);
    assert.equal(stale.lastSuccessAt, new Date(NOW).toISOString());
    assert.equal(partial.partial, true);
    now += 46 * 60_000;
    const expired = await getRadarRss();
    assert.ok(expired.availability?.some(s => s.status === 'unavailable'));
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('outage'); });
    now += 46 * 60_000;
    await assert.rejects(getRadarRss());
  } finally { reset(); }
});

test('GDELT reports indexation, deduplicates and recomputes the window when a cache becomes stale', async t => {
  reset(); let now = NOW, fail = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async () => {
    if (fail) throw new Error('outage');
    return json({ articles: [
      { title: 'Current', url: 'https://example.org/A', seendate: '20260930T150000Z', sourcecountry: 'Senegal' },
      { title: 'Duplicate', url: 'https://example.org/A?utm_source=rss', seendate: '20260930T150000Z' },
      { title: 'Boundary', url: 'https://example.org/b', seendate: '20260929T160000Z' },
      { title: 'Unknown', url: 'https://example.org/u', seendate: 'invalid' },
      { title: 'Future', url: 'https://example.org/f', seendate: '20261001T150000Z' },
    ] });
  });
  try {
    const first = await getRadarNews();
    assert.equal(first.articles.length, 2); assert.equal(first.undatedArticles?.length, 1);
    assert.equal(first.articles[0].publishedAt, undefined);
    now += 60_000;
    const cached = await getRadarNews();
    assert.equal(cached.availability?.[0].fetchedAt, first.availability?.[0].fetchedAt);
    fail = true; now += 6 * 60_000;
    const stale = await getRadarNews();
    assert.equal(stale.stale, true); assert.equal(stale.articles.length, 1);
    assert.equal(stale.updatedAt, first.updatedAt);
    now += 46 * 60_000;
    await assert.rejects(getRadarNews());
  } finally { reset(); }
});

test('disaster and FIRMS services accept empty data, identify partial outage and cap stale fallbacks', async t => {
  reset(); let now = NOW, fail = false, partial = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    if (fail || (partial && String(url).includes('gdacs'))) throw new Error('outage');
    if (String(url).includes('usgs')) return json({ features: [] });
    if (String(url).includes('gdacs')) return emptyRss();
    return new Response('latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,confidence,version,bright_t31,frp,daynight\n');
  });
  try {
    assert.ok((await getDisasterEventsSnapshot()).metadata.availability?.every(s => s.status === 'empty'));
    assert.equal((await getFirmsSnapshot()).metadata.availability?.[0].status, 'empty');
    partial = true; now += 20 * 60_000;
    assert.ok((await getDisasterEventsSnapshot()).metadata.availability?.some(s => s.status === 'unavailable'));
    fail = true; now += 20 * 60_000;
    assert.equal((await getFirmsSnapshot()).metadata.availability?.[0].status, 'stale');
    now += 7 * 60 * 60_000;
    await assert.rejects(getDisasterEventsSnapshot()); await assert.rejects(getFirmsSnapshot());
  } finally { reset(); }
});

test('markets preserve real session dates, partial/stale quotes and never invent values during outage', async t => {
  reset(); let now = NOW, fail = false, calls = 0;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    calls++;
    if (fail) throw new Error('outage');
    if (String(url).includes('finance.yahoo')) return json({ chart: { result: [{ meta: { regularMarketPrice: 100, chartPreviousClose: 90, regularMarketTime: (NOW - 3600_000) / 1000, currency: 'USD' } }] } });
    if (String(url).includes('er-api')) return json({ result: 'success', rates: { EUR: 0.9, XOF: 590.3 }, time_last_update_unix: (NOW - 7200_000) / 1000 });
    if (String(url).includes('usgs')) return json({ features: [] });
    return emptyRss();
  });
  try {
    const first = await getLiveMarkets(); assert.equal(first.commodities.length, 3);
    assert.equal(first.commodities[0].updatedAt, new Date(NOW - 3600_000).toISOString());
    const before = calls; await getLiveMarkets(); assert.equal(calls, before);
    fail = true; now += 16 * 60_000;
    const stale = await getLiveMarkets(); assert.equal(stale.commodities.length, 3);
    assert.equal(stale.availability?.[0].status, 'stale');
    assert.equal(stale.availability?.[0].lastSuccessAt, first.updatedAt);
    now += 7 * 60 * 60_000;
    const unavailable = await getLiveMarkets(); assert.equal(unavailable.commodities.length, 0);
    assert.ok(unavailable.forex.every(rate => rate.isPegged && rate.updatedAt === ''));
    assert.equal(unavailable.availability?.[0].status, 'unavailable');
  } finally { reset(); }
});

test('upstream reader bounds streamed bytes even without content-length', async () => {
  await assert.rejects(readRadarText(new Response('123456'), 5), /TOO_LARGE/);
  assert.equal(await readRadarText(new Response('Été'), 10), 'Été');
});

for (const failure of ['http', 'payload', 'timeout']) test(`Provider failure ${failure} remains an outage and recovers to valid empty data`, async t => {
  reset();
  t.mock.method(Date, 'now', () => NOW);
  t.mock.method(globalThis, 'fetch', async (_url: string | URL | Request, init?: RequestInit) => {
    assert.ok(init?.signal, 'every upstream request has a deadline signal');
    if (failure === 'timeout') throw new DOMException('Deadline exceeded', 'TimeoutError');
    return new Response('invalid payload', { status: failure === 'http' ? 503 : 200 });
  });
  try {
    await assert.rejects(getRadarNews()); await assert.rejects(getRadarRss());
    await assert.rejects(getDisasterEventsSnapshot()); await assert.rejects(getFirmsSnapshot()); await assert.rejects(getRadarWeather());
    const markets = await getLiveMarkets();
    assert.equal(markets.commodities.length, 0);
    assert.ok(markets.availability?.every(source => source.status === 'unavailable'));
    t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => String(url).includes('gdelt') ? json({ articles: [] }) : String(url).includes('usgs') ? json({ features: [] }) : emptyRss());
    assert.equal((await getRadarNews()).availability?.[0].status, 'empty');
    assert.ok((await getRadarRss()).availability?.every(source => source.status === 'empty'));
    assert.ok((await getDisasterEventsSnapshot()).metadata.availability?.every(source => source.status === 'empty'));
  } finally { reset(); }
});
