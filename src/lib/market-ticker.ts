import type { LiveMarketsSnapshot, MarketCommodity, MarketForex, MarketTickerAlert } from './live-markets-types';
import { canonicalArticleUrl, normalizeRadarDate, temporalWindow, type RadarSourceState, type RadarSourceStatus } from './radar-data';
import { AFRICAN_COUNTRIES } from './radar-countries';

export type MarketScope = 'Africa' | 'World';
export type MarketTickerItem =
  | { id: string; kind: 'alert'; value: MarketTickerAlert }
  | { id: string; kind: 'commodity'; value: MarketCommodity }
  | { id: string; kind: 'forex'; value: MarketForex };

export const MARKET_MAX_STALE_MS = 6 * 60 * 60_000;
const countries = new Set(AFRICAN_COUNTRIES.map(country => country.code));
const sourceStatuses = new Set<RadarSourceStatus>(['available', 'empty', 'partial', 'stale', 'unavailable', 'not_configured']);
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1500;
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
const date = (value: unknown, now: number) => { const normalized = normalizeRadarDate(value); return normalized && Date.parse(normalized) <= now ? normalized : null; };

/** Validate the envelope and discard malformed individual rows before any formatting/rendering. */
export function parseMarketsSnapshot(raw: unknown, now = Date.now()): LiveMarketsSnapshot | null {
  const body = record(raw);
  if (!body || !Array.isArray(body.alerts) || !Array.isArray(body.commodities) || !Array.isArray(body.forex)) return null;
  const updatedAt = date(body.updatedAt, now);
  if (!updatedAt || now - Date.parse(updatedAt) > MARKET_MAX_STALE_MS) return null;
  const commodities: MarketCommodity[] = [];
  for (const rawQuote of body.commodities.slice(0, 30)) {
    const quote = record(rawQuote);
    if (!quote || !text(quote.symbol) || !text(quote.name) || !text(quote.label) || !positive(quote.price) || !text(quote.currency) || !text(quote.unit) || !text(quote.source)) continue;
    const at = date(quote.updatedAt, now);
    if (!at) continue;
    const previousCloseAt = date(quote.previousCloseAt, now);
    const previousClose = positive(quote.previousClose) ? quote.previousClose : null;
    commodities.push({ symbol: quote.symbol, name: quote.name, label: quote.label, price: quote.price, currency: quote.currency, unit: quote.unit, source: quote.source,
      updatedAt: at, previousClose, previousCloseAt, changePercent24h: previousClose !== null && previousCloseAt && Date.parse(previousCloseAt) < Date.parse(at)
        ? (quote.price - previousClose) / previousClose * 100 : null });
  }
  const forex: MarketForex[] = [];
  for (const rawRate of body.forex.slice(0, 30)) {
    const rate = record(rawRate);
    if (!rate || !text(rate.pair) || !text(rate.base) || !text(rate.quote) || !positive(rate.rate) || !text(rate.label) || !text(rate.source) || typeof rate.isPegged !== 'boolean') continue;
    const at = date(rate.updatedAt, now);
    if (!rate.isPegged && !at) continue;
    forex.push({ pair: rate.pair, base: rate.base, quote: rate.quote, rate: rate.rate, label: rate.label, source: rate.source, isPegged: rate.isPegged, updatedAt: at ?? '' });
  }
  const alerts: MarketTickerAlert[] = [];
  for (const rawAlert of body.alerts.slice(0, 60)) {
    const alert = record(rawAlert);
    if (!alert || !text(alert.id) || !text(alert.title) || !['disaster', 'news'].includes(String(alert.type)) || !['critical', 'warning', 'info'].includes(String(alert.severity))) continue;
    if (alert.timestamp !== null && !date(alert.timestamp, now)) continue;
    const countryCode = text(alert.countryCode) && countries.has(alert.countryCode) ? alert.countryCode : undefined;
    const scope = ['Africa', 'World', 'unknown'].includes(String(alert.scope)) ? alert.scope as MarketTickerAlert['scope'] : countryCode ? 'Africa' : 'unknown';
    alerts.push({ id: alert.id, title: alert.title, type: alert.type as MarketTickerAlert['type'], severity: alert.severity as MarketTickerAlert['severity'],
      countryCode, scope, timestamp: date(alert.timestamp, now), url: canonicalArticleUrl(text(alert.url) ? alert.url : '') || undefined,
      source: text(alert.source) ? alert.source : undefined, dateKind: alert.dateKind === 'event' ? 'event' : 'publication' });
  }
  const availability: RadarSourceState[] = [];
  if (Array.isArray(body.availability)) for (const rawSource of body.availability.slice(0, 60)) {
    const source = record(rawSource);
    if (!source || !text(source.provider) || !text(source.scope) || !sourceStatuses.has(source.status as RadarSourceStatus)) continue;
    availability.push({ provider: source.provider, scope: source.scope, status: source.status as RadarSourceStatus, fetchedAt: date(source.fetchedAt, now) ?? updatedAt,
      lastSuccessAt: date(source.lastSuccessAt, now), dataAt: date(source.dataAt, now), cacheExpiresAt: normalizeRadarDate(source.cacheExpiresAt),
      count: typeof source.count === 'number' && Number.isFinite(source.count) && source.count >= 0 ? source.count : 0 });
  }
  const windowed = temporalWindow(alerts, alert => alert.timestamp, now);
  return { commodities, forex, alerts: [...windowed.recent, ...windowed.undated], updatedAt, availability, disclaimer: text(body.disclaimer) ? body.disclaimer : '' };
}

/** Monde shows international/unknown alerts; strategic global commodities also contextualise Africa. */
export function marketTickerItems(snapshot: LiveMarketsSnapshot | null, scope: MarketScope): MarketTickerItem[] {
  if (!snapshot) return [];
  const items: MarketTickerItem[] = [], seen = new Set<string>();
  const add = (item: MarketTickerItem) => { if (!seen.has(item.id)) { seen.add(item.id); items.push(item); } };
  for (const alert of snapshot.alerts) {
    if (scope === 'Africa' ? alert.scope !== 'Africa' : alert.scope === 'Africa') continue;
    add({ id: `alert:${canonicalArticleUrl(alert.url ?? '') || alert.id}`, kind: 'alert', value: alert });
  }
  for (const quote of snapshot.commodities) add({ id: `quote:${quote.symbol}`, kind: 'commodity', value: quote });
  for (const rate of snapshot.forex) {
    const cfa = ['XOF', 'XAF'].includes(rate.quote) || ['XOF', 'XAF'].includes(rate.base);
    if (scope === 'Africa' ? !cfa : cfa) continue;
    add({ id: `forex:${rate.pair}`, kind: 'forex', value: rate });
  }
  return items;
}
