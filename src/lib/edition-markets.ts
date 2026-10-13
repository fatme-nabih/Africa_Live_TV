import type { Edition } from './editions';
import type { LiveMarketsSnapshot, MarketForex } from './live-markets-types';

const PAIRS: Record<Edition, readonly string[]> = {
  fr: ['EUR / XOF', 'EUR / XAF', 'USD / EUR', 'USD / XOF'],
  en: ['USD / NGN', 'USD / GHS', 'USD / KES', 'USD / ZAR'],
  ar: ['USD / DZD', 'USD / MAD', 'USD / TND', 'USD / EGP'],
};
export function editionForex(rates: readonly MarketForex[], edition: Edition): MarketForex[] {
  return rates.filter(rate => PAIRS[edition].includes(rate.pair));
}
/** Les prix restent communs ; seul le panier visible et son compteur de devises changent. */
export function editionMarkets(snapshot: LiveMarketsSnapshot | null, edition: Edition): LiveMarketsSnapshot | null {
  if (!snapshot) return null;
  const forex = editionForex(snapshot.forex, edition);
  return { ...snapshot, forex, availability: snapshot.availability?.map(source => source.provider === 'ExchangeRate-API'
    ? { ...source, count: forex.filter(rate => !rate.isPegged).length } : source) };
}
