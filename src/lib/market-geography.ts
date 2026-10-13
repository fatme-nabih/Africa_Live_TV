import { fr } from '@/i18n/fr';
import { format } from '@/i18n/message';
import { intlLocale } from '@/i18n/format';
import type { Dictionary } from '@/i18n/dictionary';
import { DEFAULT_EDITION, type Edition } from './editions';

/**
 * Qui produit, qui importe : principaux pays africains concernés par chaque produit du panier.
 * Liste indicative et volontairement courte (ordres de grandeur publics FAO, USDA, ICCO, USGS),
 * pas un classement : elle sert à situer un cours mondial sur la carte.
 */
export type CommodityRole = 'producteurs' | 'importateurs';
export interface CommodityGeography { role: CommodityRole; codes: string[] }
export interface CommodityFocus extends CommodityGeography { symbol: string; name: string }

export const COMMODITY_GEOGRAPHY: Record<string, CommodityGeography> = {
  'ZR=F': { role: 'importateurs', codes: ['CI', 'SN', 'ZA', 'GH', 'BJ', 'CM', 'GN', 'MZ'] },
  'ZW=F': { role: 'importateurs', codes: ['EG', 'DZ', 'MA', 'NG', 'TN', 'ET', 'SD', 'KE'] },
  'BZ=F': { role: 'producteurs', codes: ['NG', 'LY', 'DZ', 'AO', 'EG', 'CG', 'GA', 'GQ', 'SN'] },
  'GC=F': { role: 'producteurs', codes: ['GH', 'ZA', 'ML', 'BF', 'SD', 'TZ', 'GN'] },
  'CC=F': { role: 'producteurs', codes: ['CI', 'GH', 'CM', 'NG'] },
  'CT=F': { role: 'producteurs', codes: ['BJ', 'BF', 'ML', 'CI', 'CM', 'TD', 'EG'] },
  'KC=F': { role: 'producteurs', codes: ['ET', 'UG', 'CI', 'TZ', 'KE', 'RW'] },
  'HG=F': { role: 'producteurs', codes: ['CD', 'ZM'] },
};

export function commodityFocus(quote: { symbol: string; name: string }): CommodityFocus | null {
  const geography = COMMODITY_GEOGRAPHY[quote.symbol];
  return geography ? { symbol: quote.symbol, name: quote.name, ...geography } : null;
}

/** « Principaux producteurs : cacao » — formulation commune au bandeau et à la carte. */
export function commodityFocusLabel(focus: Pick<CommodityFocus, 'role' | 'name'>, labels: Dictionary['markets']['focus'] = fr.markets.focus, edition: Edition = DEFAULT_EDITION): string {
  return format(focus.role === 'producteurs' ? labels.producers : labels.importers, { name: focus.name.toLocaleLowerCase(intlLocale(edition)) });
}
