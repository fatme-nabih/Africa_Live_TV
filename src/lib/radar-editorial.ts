import type { RadarArticle } from './live-osint-types';

export type EditorialKind = 'national' | 'panafrican' | 'international';

export const EDITORIAL_LABELS: Record<EditorialKind, string> = {
  national: 'Presse nationale',
  panafrican: 'Panafricain et économie',
  international: 'International',
};

// Rédactions nationales du catalogue de flux (une par pays).
const NATIONAL_MARKERS = ['aps', 'aip', 'okapi', 'malijet', 'lefaso', 'cameroun', 'guinée', 'guinee', 'hespress', 'tsa', 'gabon', 'benin', 'bénin'];

/** Famille éditoriale d'une dépêche : rubrique internationale, presse nationale ou panafricaine / économie. */
export function editorialKind(article: Pick<RadarArticle, 'editorialScope' | 'sourceName'>): EditorialKind {
  if (article.editorialScope === 'international') return 'international';
  const name = (article.sourceName || '').toLowerCase();
  return NATIONAL_MARKERS.some(marker => name.includes(marker)) ? 'national' : 'panafrican';
}
