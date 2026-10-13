import type { Edition } from './editions';
import { temporalWindow } from './radar-data';

/**
 * Pont entre éditions (EDI-601, décision D4) : les éditions restent strictes, mais un pays peu couvert dans l'édition courante
 * signale l'édition où il se raconte. Les comptes viennent des seuls caches encore valides des autres éditions.
 */
export type EditionBridgeEntry = { edition: Edition; counts: Record<string, number>; updatedAt: string };

/** L'édition courante a moins de 3 dépêches sur le pays… */
export const BRIDGE_CURRENT_BELOW = 3;
/** …et une autre édition au moins 5. */
export const BRIDGE_OTHER_AT_LEAST = 5;

/** Dépêches des dernières 24 h par pays, avec la même fenêtre que le fil du Radar. */
export function countryCountsFromArticles(articles: readonly { countryCode: string | null; publishedAt: string | null }[], asOf: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const article of temporalWindow([...articles], item => item.publishedAt, asOf).recent) {
    if (article.countryCode) counts[article.countryCode] = (counts[article.countryCode] ?? 0) + 1;
  }
  return counts;
}

/** Édition à proposer pour un pays, ou null : seuils < 3 / ≥ 5, édition active autre que la courante, la plus fournie d'abord. */
export function pickEditionBridge(
  bridge: readonly EditionBridgeEntry[] | undefined,
  country: string | null,
  currentCount: number,
  current: Edition,
  enabled: readonly Edition[],
): { edition: Edition; count: number } | null {
  if (!bridge?.length || !country || currentCount >= BRIDGE_CURRENT_BELOW) return null;
  let best: { edition: Edition; count: number } | null = null;
  for (const entry of bridge) {
    if (entry.edition === current || !enabled.includes(entry.edition)) continue;
    const count = entry.counts[country] ?? 0;
    if (Number.isInteger(count) && count >= BRIDGE_OTHER_AT_LEAST && (!best || count > best.count)) best = { edition: entry.edition, count };
  }
  return best;
}

/** Contrôle du contrat reçu par le navigateur : une entrée mal formée est ignorée, jamais affichée. */
export function parseEditionBridge(value: unknown, enabled: readonly Edition[]): EditionBridgeEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const { edition, counts, updatedAt } = entry as Partial<EditionBridgeEntry>;
    if (!edition || !enabled.includes(edition) || typeof updatedAt !== 'string' || !counts || typeof counts !== 'object') return [];
    const clean: Record<string, number> = {};
    for (const [code, count] of Object.entries(counts)) if (/^[A-Z]{2}$/.test(code) && Number.isInteger(count) && count > 0) clean[code] = count;
    return [{ edition, counts: clean, updatedAt }];
  });
}
