export function formatMarketPrice(price: number, currency: string, unit: string): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: price >= 100 ? 2 : 4, minimumFractionDigits: 2 }).format(price) + ` ${currency} / ${unit.replace('$/', '')}`;
}
export function formatVariation(value: number | null): { text: string; isPositive: boolean; isNeutral: boolean } {
  if (value === null || !Number.isFinite(value)) return { text: 'Variation inconnue', isPositive: false, isNeutral: true };
  return { text: `${value > 0 ? '+' : ''}${value.toFixed(2)} %`, isPositive: value > 0, isNeutral: value === 0 };
}
