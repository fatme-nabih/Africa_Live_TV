import type { Channel } from '@/types/channel';

/**
 * Mur TV 2×2 (UX-506) : derrière un drapeau. Actif en développement ; en production seulement si
 * NEXT_PUBLIC_TV_WALL=true (variable à décider par le propriétaire, aucune valeur posée par défaut).
 */
export const TV_WALL_ENABLED = process.env.NEXT_PUBLIC_TV_WALL === 'true' || process.env.NODE_ENV === 'development';
export const TV_WALL_SIZE = 4;
export const TV_WALL_MIN_WIDTH = 1280;

/** Chaînes du mur : les dernières regardées qui se lisent dans le navigateur (VLC ne peut pas s'afficher dans une case). */
export function pickWallChannels(recents: readonly Channel[], size = TV_WALL_SIZE): Channel[] {
  return recents.filter(channel => channel.playbackMode !== 'EXTERNAL').slice(0, size);
}
