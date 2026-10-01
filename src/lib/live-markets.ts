import type { LiveMarketsSnapshot, MarketCommodity, MarketForex, MarketTickerAlert } from './live-markets-types';
import { getDisasterEventsSnapshot } from './live-disasters';
import { getRadarRss } from './rss-collector';
import { AFRICAN_COUNTRIES } from './live-osint';
import { radarSource, temporalWindow, type RadarSourceState } from './radar-data';
export { formatMarketPrice, formatVariation } from './market-format';

export const PEGGED_EUR_XOF_RATE = 655.957;
export const PEGGED_EUR_XAF_RATE = 655.957;
const TTL = 15 * 60_000;
const MAX_STALE = 6 * 60 * 60_000;
let cache: { snapshot: LiveMarketsSnapshot; at: number } | null = null;
let inFlight: Promise<LiveMarketsSnapshot> | null = null;
const quotes = new Map<string, { value: MarketCommodity; at: number }>();
let forexCache: { value: MarketForex[]; at: number } | null = null;
const definitions = [
  { symbol: 'CC=F', name: 'Cacao', label: 'Cacao · marché mondial', unit: '$/tonne', source: 'Yahoo Finance / ICE US' },
  { symbol: 'BZ=F', name: 'Pétrole Brent', label: 'Pétrole Brent · marché mondial', unit: '$/baril', source: 'Yahoo Finance / ICE Europe' },
  { symbol: 'GC=F', name: 'Or', label: 'Or · marché mondial', unit: '$/oz', source: 'Yahoo Finance / COMEX' },
];

async function readJson(url: string) {
  const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('MARKET_UPSTREAM_ERROR');
  if (Number(response.headers.get('content-length')) > 2_000_000) throw new Error('MARKET_PAYLOAD_TOO_LARGE');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('MARKET_PAYLOAD_EMPTY');
  let size = 0, text = '';
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 2_000_000) { await reader.cancel(); throw new Error('MARKET_PAYLOAD_TOO_LARGE'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}

async function commodity(def: typeof definitions[number], now: number) {
  try {
    const payload = await readJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.symbol)}?interval=1d&range=5d`);
    const meta = payload?.chart?.result?.[0]?.meta;
    if (!Number.isFinite(meta?.regularMarketPrice) || meta.regularMarketPrice <= 0 || !Number.isFinite(meta?.regularMarketTime)) throw new Error('MARKET_INVALID_QUOTE');
    const updatedAt = new Date(meta.regularMarketTime * 1000).toISOString();
    if (Date.parse(updatedAt) > now) throw new Error('MARKET_FUTURE_QUOTE');
    const previousClose = Number.isFinite(meta.chartPreviousClose) && meta.chartPreviousClose > 0 ? meta.chartPreviousClose : null;
    const value: MarketCommodity = { ...def, price: meta.regularMarketPrice, previousClose,
      changePercent24h: previousClose ? (meta.regularMarketPrice - previousClose) / previousClose * 100 : null,
      currency: typeof meta.currency === 'string' ? meta.currency : 'USD', updatedAt };
    quotes.set(def.symbol, { value, at: now });
    return { value, source: radarSource(def.source, 'Monde · dernière séance', now, TTL, 1, { dataAt: updatedAt }) };
  } catch {
    const cached = quotes.get(def.symbol);
    const usable = cached && now - cached.at <= MAX_STALE;
    return { value: usable ? cached.value : null, source: radarSource(def.source, 'Monde · dernière séance', now, TTL, usable ? 1 : 0,
      { status: usable ? 'stale' : 'unavailable', lastSuccessAt: cached ? new Date(cached.at).toISOString() : null, dataAt: cached?.value.updatedAt }) };
  }
}

async function forex(now: number) {
  const fixed: MarketForex[] = [
    { pair: 'EUR / XOF', base: 'EUR', quote: 'XOF', rate: PEGGED_EUR_XOF_RATE, label: 'Parité fixe UEMOA', isPegged: true, updatedAt: '', source: 'BCEAO · parité institutionnelle' },
    { pair: 'EUR / XAF', base: 'EUR', quote: 'XAF', rate: PEGGED_EUR_XAF_RATE, label: 'Parité fixe CEMAC', isPegged: true, updatedAt: '', source: 'BEAC · parité institutionnelle' },
  ];
  try {
    const payload = await readJson('https://open.er-api.com/v6/latest/USD');
    if (payload?.result !== 'success' || !Number.isFinite(payload.rates?.EUR) || payload.rates.EUR <= 0 || !Number.isFinite(payload.time_last_update_unix)) throw new Error('FOREX_INVALID_PAYLOAD');
    const date = new Date(payload.time_last_update_unix * 1000).toISOString();
    if (Date.parse(date) > now) throw new Error('FOREX_FUTURE_RATE');
    const value: MarketForex[] = [
      { pair: 'USD / EUR', base: 'USD', quote: 'EUR', rate: payload.rates.EUR, label: 'Taux indicatif mondial', isPegged: false, updatedAt: date, source: 'ExchangeRate-API' },
      { pair: 'USD / XOF', base: 'USD', quote: 'XOF', rate: Number.isFinite(payload.rates.XOF) && payload.rates.XOF > 0 ? payload.rates.XOF : PEGGED_EUR_XOF_RATE / payload.rates.EUR, label: 'Taux indicatif dérivé', isPegged: false, updatedAt: date, source: 'ExchangeRate-API / parité BCEAO' },
    ];
    forexCache = { value, at: now };
    return { value: [...fixed, ...value], source: radarSource('ExchangeRate-API', 'Monde · devises', now, TTL, value.length, { dataAt: date }) };
  } catch {
    const usable = forexCache && now - forexCache.at <= MAX_STALE ? forexCache : null;
    return { value: [...fixed, ...(usable?.value ?? [])], source: radarSource('ExchangeRate-API', 'Monde · devises', now, TTL, usable?.value.length ?? 0,
      { status: usable ? 'stale' : 'unavailable', lastSuccessAt: forexCache ? new Date(forexCache.at).toISOString() : null, dataAt: forexCache?.value[0]?.updatedAt }) };
  }
}

function countryCode(name: string | undefined) {
  if (!name) return undefined;
  const english = new Intl.DisplayNames(['en'], { type: 'region' });
  return AFRICAN_COUNTRIES.find(c => [c.code, c.name, english.of(c.code)].some(candidate => candidate?.toLowerCase() === name.toLowerCase()))?.code;
}

async function tickerAlerts(now: number) {
  const alerts: MarketTickerAlert[] = [], availability: RadarSourceState[] = [];
  const settled = await Promise.allSettled([getDisasterEventsSnapshot(), getRadarRss()]);
  const disasters = settled[0];
  if (disasters.status === 'fulfilled') {
    availability.push(...disasters.value.metadata.availability ?? []);
    for (const feature of disasters.value.features) {
      const p = feature.properties;
      if (p.severity !== 'red' && p.severity !== 'orange' && (p.magnitude ?? 0) < 4.8) continue;
      const code = countryCode(p.countryName);
      alerts.push({ id: `disaster-${p.source}-${p.id}`, type: 'disaster', title: p.title, severity: p.severity === 'red' ? 'critical' : 'warning',
        countryCode: code, scope: code ? 'Africa' : 'unknown', source: p.source, dateKind: 'event', url: p.sourceUrl, timestamp: p.eventDate });
    }
  } else availability.push(radarSource('USGS / GDACS', 'Événements', now, TTL, 0, { status: 'unavailable' }));
  const rss = settled[1];
  if (rss.status === 'fulfilled') {
    availability.push(...rss.value.availability ?? []);
    for (const article of [...rss.value.articles, ...rss.value.undatedArticles ?? []]) {
      if (!/économ|finance/i.test(article.category) && article.sourceName !== 'Agence Ecofin') continue;
      alerts.push({ id: `news-${article.id}`, type: 'news', title: article.title, severity: 'info', source: article.sourceName,
        dateKind: 'publication', countryCode: article.countryCode ?? undefined, scope: article.countryCode ? 'Africa' : 'unknown', url: article.url, timestamp: article.publishedAt });
    }
  } else availability.push(radarSource('RSS', 'Afrique', now, TTL, 0, { status: 'unavailable' }));
  const windowed = temporalWindow(alerts, alert => alert.timestamp, now);
  return { alerts: [...windowed.recent, ...windowed.undated].slice(0, 12), availability };
}

export async function getLiveMarkets(options: { forceRefresh?: boolean } = {}): Promise<LiveMarketsSnapshot> {
  const now = Date.now();
  if (!options.forceRefresh && cache && now - cache.at < TTL) {
    const windowed = temporalWindow(cache.snapshot.alerts, alert => alert.timestamp, now);
    return { ...cache.snapshot, alerts: [...windowed.recent, ...windowed.undated] };
  }
  if (!inFlight) inFlight = (async () => {
    const [commodityResults, currencies, ticker] = await Promise.all([Promise.all(definitions.map(def => commodity(def, now))), forex(now), tickerAlerts(now)]);
    const snapshot: LiveMarketsSnapshot = {
      commodities: commodityResults.flatMap(result => result.value ? [result.value] : []), forex: currencies.value, alerts: ticker.alerts,
      updatedAt: new Date(now).toISOString(), availability: [...commodityResults.map(result => result.source), currencies.source, ...ticker.availability],
      disclaimer: 'Dernières cotations disponibles, à usage informatif ; dates de séance distinctes de la collecte. Parités fixes BCEAO/BEAC.' };
    cache = { snapshot, at: now };
    return snapshot;
  })().finally(() => { inFlight = null; });
  return inFlight;
}
export function clearMarketsCache() { cache = null; inFlight = null; quotes.clear(); forexCache = null; }
