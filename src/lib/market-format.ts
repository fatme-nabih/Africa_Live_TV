import { fr } from '@/i18n/fr';
import { intlLocale, numberFormat } from '@/i18n/format';
import type { Dictionary } from '@/i18n/dictionary';
import { DEFAULT_EDITION, type Edition } from './editions';

type MarketLabels = Dictionary['markets'];

export function formatMarketPrice(price: number, currency: string, unit: string, edition: Edition = DEFAULT_EDITION, labels: MarketLabels = fr.markets): string {
  // USX : cotation en cents US (blé, coton, café), conservée telle que publiée.
  return numberFormat(intlLocale(edition), { maximumFractionDigits: price >= 100 ? 2 : 4, minimumFractionDigits: 2 }).format(price) + ` ${currency === 'USX' ? labels.usCents : currency} / ${edition === 'fr' ? unit.replace(/^[$¢]\//, '') : (labels.units as Record<string, string>)[unit.replace(/^[$¢]\//, '')] ?? unit.replace(/^[$¢]\//, '')}`;
}
export function formatVariation(value: number | null, edition: Edition = DEFAULT_EDITION, labels: MarketLabels = fr.markets): { text: string; isPositive: boolean; isNeutral: boolean } {
  if (value === null || !Number.isFinite(value)) return { text: labels.unknownVariation, isPositive: false, isNeutral: true };
  return { text: `${value > 0 ? '+' : ''}${numberFormat(intlLocale(edition), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} %`, isPositive: value > 0, isNeutral: value === 0 };
}

export function formatForexRate(rate: number, edition: Edition = DEFAULT_EDITION): string {
  return numberFormat(intlLocale(edition), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(rate);
}
