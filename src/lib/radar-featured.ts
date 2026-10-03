import { canonicalArticleUrl } from './radar-data';
import type { RadarArticle } from './live-osint-types';

export const FEATURED_COUNT = 3;
const LEAD_PROMOTION_WINDOW_MS = 3 * 60 * 60_000;

function sourceOf(article: RadarArticle) {
  return (article.sourceName || article.domain).toLowerCase();
}

/**
 * « À la une » : les dépêches les plus récentes de la liste (déjà triée du plus récent au plus ancien),
 * de rédactions différentes tant que c'est possible. Si la première n'a pas d'illustration, une dépêche
 * illustrée publiée dans les 3 h qui la suivent prend la tête.
 */
export function pickFeatured(articles: RadarArticle[], count = FEATURED_COUNT): RadarArticle[] {
  const picked: RadarArticle[] = [];
  const sources = new Set<string>();
  for (const article of articles) {
    if (picked.length >= count) break;
    const source = sourceOf(article);
    if (sources.has(source)) continue;
    sources.add(source);
    picked.push(article);
  }
  for (const article of articles) {
    if (picked.length >= count) break;
    if (!picked.includes(article)) picked.push(article);
  }
  const [lead] = picked;
  if (lead && !lead.imageUrl) {
    const leadTime = Date.parse(lead.indexedAt) || 0;
    const illustrated = picked.slice(1).find(article => article.imageUrl && leadTime - (Date.parse(article.indexedAt) || 0) <= LEAD_PROMOTION_WINDOW_MS);
    if (illustrated) return [illustrated, ...picked.filter(article => article !== illustrated)];
  }
  return picked;
}

/** Clés (URL canoniques) des dépêches à la une, pour ne pas les répéter dans le fil. */
export function featuredKeys(featured: RadarArticle[]): Set<string> {
  return new Set(featured.map(article => canonicalArticleUrl(article.url)));
}
