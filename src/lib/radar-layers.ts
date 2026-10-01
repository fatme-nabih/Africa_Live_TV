import { canonicalArticleUrl, normalizeRadarDate } from './radar-data';
import type { FirmsSnapshot } from './live-firms-types';
import type { DisasterEventsSnapshot } from './live-disasters-types';

export function validRadarPoint(geometry: unknown): boolean {
  if (!geometry || typeof geometry !== 'object') return false;
  const point = geometry as { type?: unknown; coordinates?: unknown };
  if (point.type !== 'Point' || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) return false;
  const [lon, lat] = point.coordinates;
  return typeof lon === 'number' && typeof lat === 'number' && Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90;
}
function collection(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Format de couche invalide.');
  const data = value as { type?: unknown; features?: unknown; metadata?: { updatedAt?: unknown } };
  if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.metadata || !normalizeRadarDate(data.metadata.updatedAt)) throw new Error('Format de couche invalide.');
  return data;
}
export function normalizeFirmsLayer(value: unknown): { data: FirmsSnapshot; rejected: number } {
  const raw = collection(value);
  const input = value as FirmsSnapshot;
  const features = input.features.filter(feature => {
    const p = feature?.properties;
    return validRadarPoint(feature?.geometry) && p && [p.brightness, p.frp, p.confidence].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) && p.confidence <= 100;
  });
  return { data: { ...input, features }, rejected: (raw.features as unknown[]).length - features.length };
}
export function normalizeDisasterLayer(value: unknown): { data: DisasterEventsSnapshot; rejected: number } {
  const raw = collection(value);
  const input = value as DisasterEventsSnapshot;
  const features = input.features.filter(feature => validRadarPoint(feature?.geometry) && feature?.properties &&
    ['green', 'orange', 'red'].includes(feature.properties.severity) && ['USGS', 'GDACS'].includes(feature.properties.source))
    .map(feature => {
      const p = feature.properties;
      return { ...feature, properties: { ...p, sourceUrl: canonicalArticleUrl(p.sourceUrl ?? ''), eventDate: normalizeRadarDate(p.eventDate) ?? '',
        color: p.severity === 'red' ? '#ef4444' : p.severity === 'orange' ? '#f97316' : '#facc15',
        glowColor: '#f97316', radius: p.eventType === 'earthquake' ? 7 : 6 } };
    });
  return { data: { ...input, features }, rejected: (raw.features as unknown[]).length - features.length };
}
export function escapeMapText(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function firmsObservationDate(date: unknown, time: unknown) {
  if (typeof date !== 'string' || typeof time !== 'string') return null;
  const clock = time.replace(/\s*UTC$/, '').trim();
  if (!/^\d{2}:\d{2}$/.test(clock)) return null;
  return normalizeRadarDate(`${date}T${clock}:00Z`);
}
