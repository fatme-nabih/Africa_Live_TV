import { AFRICAN_COUNTRIES } from './radar-countries';
import { radarStatusLabel, type RadarSourceState, type RadarSourceStatus } from './radar-data';

const codes = new Set(AFRICAN_COUNTRIES.map(country => country.code));
export function radarCountry(raw: string | null) {
  const code = raw?.trim().toUpperCase();
  return code && codes.has(code) ? code : null;
}
export function radarCountryUrl(href: string, country: string | null) {
  const url = new URL(href);
  const code = radarCountry(country);
  if (code) url.searchParams.set('country', code);
  else url.searchParams.delete('country');
  return url.pathname + url.search + url.hash;
}

export type RadarSourceRow = Omit<RadarSourceState, 'status' | 'count'> & {
  status: RadarSourceStatus | 'loading' | 'not_requested'; count: number | null;
};
export function effectiveSourceStatus(source: RadarSourceRow, now: number): RadarSourceRow['status'] {
  if (['available', 'empty', 'partial'].includes(source.status) && source.cacheExpiresAt && Date.parse(source.cacheExpiresAt) <= now) return 'stale';
  return source.status;
}
export function sourceStatusText(status: RadarSourceRow['status']) {
  return status === 'loading' ? 'chargement' : status === 'not_requested' ? 'à la demande' : radarStatusLabel(status);
}
export type CoverageLevel = 'loading' | 'ok' | 'degraded' | 'down';

/** État d'ensemble des sources, en langage courant : « Toutes les sources répondent », « 3 sources momentanément muettes »… */
export function coverage(rows: RadarSourceRow[], now: number): { level: CoverageLevel; text: string; short: string } {
  const requested = rows.filter(row => row.status !== 'not_requested');
  const states = requested.map(row => effectiveSourceStatus(row, now));
  const loading = states.filter(state => state === 'loading').length;
  const healthy = states.filter(state => state === 'available' || state === 'empty').length;
  const silent = states.filter(state => state === 'unavailable' || state === 'not_configured').length;
  const aging = states.filter(state => state === 'stale' || state === 'partial').length;
  if (loading === requested.length && loading) return { level: 'loading', text: 'Chargement des sources…', short: 'Chargement des sources…' };
  if (silent === requested.length && silent) return { level: 'down', text: 'Aucune source ne répond pour le moment', short: 'Aucune source ne répond pour le moment' };
  if (healthy === requested.length && healthy) return { level: 'ok', text: 'Toutes les sources répondent', short: 'Toutes les sources répondent' };
  const parts: string[] = [];
  if (silent) parts.push(`${silent} source${silent > 1 ? 's' : ''} momentanément muette${silent > 1 ? 's' : ''}`);
  if (aging) parts.push(silent ? `${aging} aux données anciennes ou partielles` : `${aging} source${aging > 1 ? 's' : ''} aux données anciennes ou partielles`);
  if (loading) parts.push('chargement en cours');
  // En-tête : seulement ce qui manque vraiment ; le détail (données anciennes) reste dans « Sources et fraîcheur ».
  const short = silent ? parts[0] : aging ? 'Certaines données sont un peu anciennes' : 'Chargement des sources…';
  return { level: silent || aging ? 'degraded' : 'loading', text: parts.join(' · '), short };
}

export function coverageSummary(rows: RadarSourceRow[], now: number) {
  return coverage(rows, now).text;
}
export function sourcePlaceholder(provider: string, scope: string, status: RadarSourceRow['status']): RadarSourceRow {
  return { provider, scope, status, fetchedAt: '', lastSuccessAt: null, dataAt: null, cacheExpiresAt: null, count: null };
}
