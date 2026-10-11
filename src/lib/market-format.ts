export function formatMarketPrice(price: number, currency: string, unit: string): string {
  // USX : cotation en cents US (blé, coton, café), conservée telle que publiée.
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: price >= 100 ? 2 : 4, minimumFractionDigits: 2 }).format(price) + ` ${currency === 'USX' ? 'cents US' : currency} / ${unit.replace(/^[$¢]\//, '')}`;
}
const variationFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatVariation(value: number | null): { text: string; isPositive: boolean; isNeutral: boolean } {
  if (value === null || !Number.isFinite(value)) return { text: 'Variation inconnue', isPositive: false, isNeutral: true };
  return { text: `${value > 0 ? '+' : ''}${variationFormatter.format(value)} %`, isPositive: value > 0, isNeutral: value === 0 };
}

const forexFormatter = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export function formatForexRate(rate: number): string { return forexFormatter.format(rate); }
