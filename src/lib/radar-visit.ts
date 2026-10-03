import type { RadarArticle } from './live-osint-types';
import { RADAR_WINDOW_MS } from './radar-data';

/** Dernière visite du Radar (ms), lue sur l'appareil. Valeur absente, illisible ou dans le futur → première visite. */
export function parseVisit(raw: string | null, now: number): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 && value <= now ? Math.floor(value) : null;
}

/** Dépêches publiées après la dernière visite. `null` s'il n'y a pas de visite précédente. */
export function countSince(articles: readonly RadarArticle[], since: number | null): number | null {
  if (since === null) return null;
  return articles.filter(article => (Date.parse(article.publishedAt ?? article.indexedAt) || 0) > since).length;
}

export function isNewSince(article: RadarArticle, since: number | null): boolean {
  return since !== null && (Date.parse(article.publishedAt ?? article.indexedAt) || 0) > since;
}

/** Le Radar ne garde que 24 h : une visite plus ancienne n'est comptée que sur cette fenêtre. */
export function visitIsBeyondWindow(since: number | null, asOf: number): boolean {
  return since !== null && asOf - since > RADAR_WINDOW_MS;
}
