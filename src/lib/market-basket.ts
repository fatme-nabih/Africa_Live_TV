import type { LiveMarketsSnapshot, MarketCommodity } from './live-markets-types';

/** Ordre du panier : le quotidien sénégalais (importations) d'abord, puis les exportations du continent. */
export const BASKET_ORDER = ['ZR=F', 'ZW=F', 'BZ=F', 'GC=F', 'CC=F', 'CT=F', 'KC=F', 'HG=F'];
const SHORT_NAMES: Record<string, string> = { 'BZ=F': 'Brent' };
export const basketName = (quote: Pick<MarketCommodity, 'symbol' | 'name'>) => SHORT_NAMES[quote.symbol] ?? quote.name;

/** Produits du panier dans l'ordre éditorial ; un produit inconnu passe en dernier. */
export function basketCommodities(snapshot: LiveMarketsSnapshot | null): MarketCommodity[] {
  if (!snapshot) return [];
  const rank = (symbol: string) => { const index = BASKET_ORDER.indexOf(symbol); return index < 0 ? BASKET_ORDER.length : index; };
  return [...snapshot.commodities].sort((a, b) => rank(a.symbol) - rank(b.symbol));
}

/** Taux indicatif USD → FCFA du relevé, ou null s'il manque (la parité EUR seule ne suffit pas). */
export function indicativeUsdXof(snapshot: LiveMarketsSnapshot | null): number | null {
  const rate = snapshot?.forex.find(row => row.base === 'USD' && row.quote === 'XOF' && !row.isPegged)?.rate;
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? rate : null;
}
