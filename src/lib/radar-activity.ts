// Activité d'un pays sur la carte : le nombre de dépêches des dernières 24 h règle la pulsation de son repère.
// 0 = aucune dépêche, 1 = discret (1-2), 2 = actif (3-7), 3 = très actif (8 et plus).
export type ActivityTier = 0 | 1 | 2 | 3;

export const ACTIVE_FROM = 3;
export const VERY_ACTIVE_FROM = 8;

export function activityTier(count: number): ActivityTier {
  if (!Number.isFinite(count) || count < 1) return 0;
  if (count >= VERY_ACTIVE_FROM) return 3;
  if (count >= ACTIVE_FROM) return 2;
  return 1;
}
