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
export function coverageSummary(rows: RadarSourceRow[], now: number) {
  const requested = rows.filter(row => row.status !== 'not_requested');
  const loading = requested.filter(row => effectiveSourceStatus(row, now) === 'loading').length;
  const healthy = requested.filter(row => ['available', 'empty'].includes(effectiveSourceStatus(row, now))).length;
  const broken = requested.filter(row => ['unavailable', 'not_configured'].includes(effectiveSourceStatus(row, now))).length;
  if (loading === requested.length && loading) return 'Chargement des sources';
  if (broken === requested.length && broken) return 'Sources indisponibles';
  if (healthy === requested.length && healthy) return `Sources disponibles · ${healthy} sources`;
  return `Couverture partielle · ${healthy}/${requested.length} sources à jour${loading ? ' · chargement en cours' : ''}`;
}
export function sourcePlaceholder(provider: string, scope: string, status: RadarSourceRow['status']): RadarSourceRow {
  return { provider, scope, status, fetchedAt: '', lastSuccessAt: null, dataAt: null, cacheExpiresAt: null, count: null };
}
