export const RADAR_WINDOW_MS = 24 * 60 * 60_000;
export type RadarSourceStatus = 'available' | 'empty' | 'partial' | 'stale' | 'unavailable' | 'not_configured';
export type RadarSourceState = {
  provider: string;
  scope: string;
  status: RadarSourceStatus;
  fetchedAt: string;
  lastSuccessAt: string | null;
  dataAt: string | null;
  cacheExpiresAt: string | null;
  count: number;
  limit?: number;
};

export function radarSource(provider: string, scope: string, at: number, ttl: number, count: number,
  options: { status?: RadarSourceStatus; lastSuccessAt?: string | null; dataAt?: string | null; limit?: number } = {},
): RadarSourceState {
  const status = options.status ?? (count ? 'available' : 'empty');
  const success = options.lastSuccessAt === undefined
    ? (status === 'unavailable' || status === 'not_configured' ? null : new Date(at).toISOString())
    : options.lastSuccessAt;
  return { provider, scope, status, fetchedAt: new Date(at).toISOString(), lastSuccessAt: success,
    dataAt: options.dataAt ?? null, cacheExpiresAt: success ? new Date(Date.parse(success) + ttl).toISOString() : null,
    count, ...(options.limit === undefined ? {} : { limit: options.limit }) };
}

export function canonicalArticleUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    return url.toString();
  } catch { return ''; }
}

export function normalizeRadarDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const text = raw.trim();
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (compact) {
    const [, y, m, d, h, min, s] = compact.map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, h, min, s));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d &&
      date.getUTCHours() === h && date.getUTCMinutes() === min && date.getUTCSeconds() === s ? date.toISOString() : null;
  }
  // A timestamp without a zone must not silently inherit the workstation zone.
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) return null;
  const calendar = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (calendar) {
    const [, y, m, d] = calendar.map(Number);
    const day = new Date(Date.UTC(y, m - 1, d));
    if (day.getUTCFullYear() !== y || day.getUTCMonth() !== m - 1 || day.getUTCDate() !== d) return null;
  }
  const rfc = text.match(/^(?:\w{3},\s*)?(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s/i);
  if (rfc) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(rfc[2].toLowerCase());
    const date = new Date(Date.UTC(Number(rfc[3]), month, Number(rfc[1])));
    if (date.getUTCMonth() !== month || date.getUTCDate() !== Number(rfc[1])) return null;
  }
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

export function temporalWindow<T>(items: T[], dateOf: (item: T) => string | null | undefined, asOf: number) {
  const recent: T[] = [], undated: T[] = [];
  let future = 0, old = 0;
  for (const item of items) {
    const date = normalizeRadarDate(dateOf(item));
    if (!date) { undated.push(item); continue; }
    const time = Date.parse(date);
    if (time > asOf) future++;
    else if (time < asOf - RADAR_WINDOW_MS) old++;
    else recent.push(item);
  }
  recent.sort((a, b) => Date.parse(dateOf(b)!) - Date.parse(dateOf(a)!));
  return { recent, undated, window: { asOf: new Date(asOf).toISOString(), from: new Date(asOf - RADAR_WINDOW_MS).toISOString(), durationHours: 24, unknown: undated.length, future, old } };
}

export function uniqueFilterOptions(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

export function formatRadarDate(date: string | null | undefined) {
  const normalized = normalizeRadarDate(date);
  return normalized ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(normalized)) + ' GMT' : 'Date inconnue';
}

export function radarStatusLabel(status: RadarSourceStatus) {
  return { available: 'disponible', empty: 'réponse vide', partial: 'données partielles', stale: 'cache périmé', unavailable: 'indisponible', not_configured: 'non configuré' }[status];
}
