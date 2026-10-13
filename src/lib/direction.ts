/**
 * Sens de lecture côté navigateur (EDI-402). En droite → gauche, « suivant » est à gauche : les flèches horizontales
 * des listes et onglets s'inversent, comme le prévoient les pratiques ARIA. Les commandes média restent physiques.
 */
export function isRtl(element: Element | null | undefined) {
  return !!element && getComputedStyle(element).direction === 'rtl';
}

/** +1 pour la flèche « vers l'élément suivant », -1 pour la précédente, 0 pour toute autre touche. */
export function horizontalStep(key: string, rtl: boolean): -1 | 0 | 1 {
  if (key === 'ArrowRight') return rtl ? -1 : 1;
  if (key === 'ArrowLeft') return rtl ? 1 : -1;
  return 0;
}
