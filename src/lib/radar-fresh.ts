/**
 * Rafraîchissement doux : les arrivées qui ne figurent pas dans la liste « libérée » restent en attente
 * au lieu de s'insérer en tête et de repousser ce que l'utilisateur lit.
 * `released` vaut `null` tant que la première liste n'a pas été affichée : tout est alors visible.
 */
export function splitArrivals<T>(
  current: readonly T[],
  keyOf: (item: T) => string,
  released: ReadonlySet<string> | null,
): { shown: T[]; pending: T[] } {
  if (!released) return { shown: [...current], pending: [] };
  const shown: T[] = [];
  const pending: T[] = [];
  for (const item of current) (released.has(keyOf(item)) ? shown : pending).push(item);
  return { shown, pending };
}
