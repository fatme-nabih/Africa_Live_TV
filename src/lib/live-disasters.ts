import { ServiceUnavailableError } from '@/lib/api-errors';
import type {
  AlertSeverity,
  DisasterEvent,
  DisasterEventsSnapshot,
  DisasterEventType,
  DisasterGeoJsonFeature,
  DisasterQueryOptions,
} from '@/lib/live-disasters-types';

const USGS_EARTHQUAKES_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson';
const GDACS_GEORSS_URL = 'https://www.gdacs.org/xml/rss.xml';

// Africa and surrounding waters bounding box
const AFRICA_BBOX = {
  minLat: -36.0,
  maxLat: 38.0,
  minLon: -26.0,
  maxLon: 52.0,
};

const CACHE_TTL_MS = 15 * 60_000; // 15 minutes
const STALE_TTL_MS = 6 * 60 * 60_000; // Up to 6 hours stale
const DEFAULT_LIMIT = 200;

interface CacheEntry {
  events: DisasterEvent[];
  earthquakesCount: number;
  gdacsAlertsCount: number;
  timestamp: number;
}

let cachedDisasters: CacheEntry | null = null;
let inFlightFetch: Promise<CacheEntry> | null = null;

export function clearDisastersCacheForTests(): void {
  cachedDisasters = null;
  inFlightFetch = null;
}

export function isWithinAfrica(lat: number, lon: number): boolean {
  return (
    lat >= AFRICA_BBOX.minLat &&
    lat <= AFRICA_BBOX.maxLat &&
    lon >= AFRICA_BBOX.minLon &&
    lon <= AFRICA_BBOX.maxLon
  );
}

interface UsgsFeature {
  id: string;
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    url: string;
    title: string;
  };
  geometry: {
    coordinates: [number, number, number?]; // [lon, lat, depth]
  };
}

export function parseUsgsEarthquakes(geojson: unknown): DisasterEvent[] {
  if (!geojson || typeof geojson !== 'object' || !('features' in geojson)) {
    return [];
  }

  const features = (geojson as { features: unknown[] }).features;
  if (!Array.isArray(features)) return [];

  const events: DisasterEvent[] = [];

  for (const rawFeature of features) {
    const f = rawFeature as Partial<UsgsFeature>;
    if (!f.geometry || !f.properties || !Array.isArray(f.geometry.coordinates)) {
      continue;
    }

    const [lon, lat, depth] = f.geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    if (!isWithinAfrica(lat, lon)) continue;

    const mag = typeof f.properties.mag === 'number' ? f.properties.mag : undefined;
    const severity: AlertSeverity =
      mag !== undefined && mag >= 5.5
        ? 'red'
        : mag !== undefined && mag >= 4.5
        ? 'orange'
        : 'green';

    const eventDate = Number.isFinite(f.properties.time)
      ? new Date(f.properties.time).toISOString()
      : new Date().toISOString();

    events.push({
      id: f.id || `usgs-${lat.toFixed(2)}-${lon.toFixed(2)}`,
      source: 'USGS',
      eventType: 'earthquake',
      title: f.properties.title || `Séisme M ${mag ?? 'inconnu'}`,
      description: f.properties.place || undefined,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      depthKm: typeof depth === 'number' ? Math.round(depth * 10) / 10 : undefined,
      magnitude: mag !== undefined ? Math.round(mag * 10) / 10 : undefined,
      severity,
      eventDate,
      sourceUrl: f.properties.url || 'https://earthquake.usgs.gov',
    });
  }

  return events;
}

export function parseGdacsRss(xmlText: string): DisasterEvent[] {
  const events: DisasterEvent[] = [];
  const items = xmlText.split('<item>').slice(1);

  for (const itemXml of items) {
    const item = itemXml.split('</item>')[0];
    if (!item) continue;

    const pointMatch = item.match(/<georss:point>([\s\S]*?)<\/georss:point>/);
    if (!pointMatch) continue;

    const [latStr, lonStr] = pointMatch[1].trim().split(/\s+/);
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    if (!isWithinAfrica(lat, lon)) continue;

    const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Alerte GDACS';

    const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
    const description = descMatch ? descMatch[1].trim() : undefined;

    const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
    const sourceUrl = linkMatch ? linkMatch[1].trim() : 'https://www.gdacs.org';

    const eventTypeMatch = item.match(/<gdacs:eventtype>([\s\S]*?)<\/gdacs:eventtype>/);
    const rawType = eventTypeMatch ? eventTypeMatch[1].trim().toUpperCase() : '';
    let eventType: DisasterEventType = 'other';
    if (rawType === 'EQ') eventType = 'earthquake';
    else if (rawType === 'TC') eventType = 'cyclone';
    else if (rawType === 'FL') eventType = 'flood';
    else if (rawType === 'VO') eventType = 'volcano';
    else if (rawType === 'DR') eventType = 'drought';

    const alertLevelMatch = item.match(/<gdacs:alertlevel>([\s\S]*?)<\/gdacs:alertlevel>/);
    const rawLevel = alertLevelMatch ? alertLevelMatch[1].trim().toLowerCase() : '';
    const severity: AlertSeverity =
      rawLevel === 'red' ? 'red' : rawLevel === 'orange' ? 'orange' : 'green';

    const countryMatch = item.match(/<gdacs:country>([\s\S]*?)<\/gdacs:country>/);
    const countryName = countryMatch ? countryMatch[1].trim() : undefined;

    const iso3Match = item.match(/<gdacs:iso3>([\s\S]*?)<\/gdacs:iso3>/);
    const iso3 = iso3Match ? iso3Match[1].trim() : undefined;

    const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const eventDate = pubDateMatch
      ? new Date(pubDateMatch[1].trim()).toISOString()
      : new Date().toISOString();

    const idMatch = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);
    const id = idMatch ? `gdacs-${idMatch[1].trim()}` : `gdacs-${lat.toFixed(2)}-${lon.toFixed(2)}`;

    events.push({
      id,
      source: 'GDACS',
      eventType,
      title,
      description,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      severity,
      countryName,
      iso3,
      eventDate,
      sourceUrl,
    });
  }

  return events;
}

export function deduplicateEvents(events: DisasterEvent[]): DisasterEvent[] {
  // Sort most severe first, then newest first
  const severityScore: Record<AlertSeverity, number> = { red: 3, orange: 2, green: 1 };
  events.sort((a, b) => {
    const diff = severityScore[b.severity] - severityScore[a.severity];
    if (diff !== 0) return diff;
    if (a.source !== b.source) {
      if (a.source === 'USGS') return -1;
      if (b.source === 'USGS') return 1;
    }
    return Date.parse(b.eventDate) - Date.parse(a.eventDate);
  });

  const merged: DisasterEvent[] = [];

  for (const event of events) {
    // If it's an earthquake, check if we already have a nearby USGS earthquake within ~80km and 3 hours
    if (event.eventType === 'earthquake') {
      const isDuplicate = merged.some((existing) => {
        if (existing.eventType !== 'earthquake') return false;
        const dLat = Math.abs(existing.latitude - event.latitude);
        const dLon = Math.abs(existing.longitude - event.longitude);
        const dTime = Math.abs(Date.parse(existing.eventDate) - Date.parse(event.eventDate));
        return dLat < 0.7 && dLon < 0.7 && dTime < 3 * 3600_000;
      });
      if (isDuplicate) continue;
    }

    merged.push(event);
  }

  return merged;
}

export function convertToDisastersGeoJson(
  events: DisasterEvent[],
  earthquakesCount: number,
  gdacsAlertsCount: number,
  isStale: boolean,
): DisasterEventsSnapshot {
  const features: DisasterGeoJsonFeature[] = events.map((event) => {
    let color = '#eab308'; // default yellow
    let glowColor = 'rgba(234, 179, 8, 0.3)';
    let radius = 7;

    switch (event.eventType) {
      case 'earthquake': {
        const mag = event.magnitude ?? 4.0;
        if (mag >= 5.5 || event.severity === 'red') {
          color = '#ef4444'; // intense red
          glowColor = 'rgba(239, 68, 68, 0.45)';
          radius = 14;
        } else if (mag >= 4.5 || event.severity === 'orange') {
          color = '#f97316'; // vivid orange
          glowColor = 'rgba(249, 115, 22, 0.4)';
          radius = 10;
        } else {
          color = '#eab308'; // amber yellow
          glowColor = 'rgba(234, 179, 8, 0.3)';
          radius = 7;
        }
        break;
      }
      case 'cyclone':
        color = '#06b6d4'; // cyan / turquoise
        glowColor = 'rgba(6, 182, 212, 0.45)';
        radius = 13;
        break;
      case 'flood':
        color = '#3b82f6'; // vivid blue
        glowColor = 'rgba(59, 130, 246, 0.45)';
        radius = 11;
        break;
      case 'volcano':
        color = '#dc2626'; // volcanic crimson
        glowColor = 'rgba(220, 38, 38, 0.5)';
        radius = 12;
        break;
      case 'drought':
        color = '#d97706'; // desert amber
        glowColor = 'rgba(217, 119, 6, 0.35)';
        radius = 9;
        break;
      default:
        color = '#a855f7'; // purple
        glowColor = 'rgba(168, 85, 247, 0.35)';
        radius = 8;
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [event.longitude, event.latitude],
      },
      properties: {
        id: event.id,
        source: event.source,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        magnitude: event.magnitude,
        depthKm: event.depthKm,
        severity: event.severity,
        countryName: event.countryName,
        eventDate: event.eventDate,
        sourceUrl: event.sourceUrl,
        color,
        glowColor,
        radius,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'USGS Earthquake Hazards Program & GDACS (UN/EC-JRC)',
      attribution:
        'Données séismes et alertes : USGS Earthquake API (Public Domain) & GDACS (European Commission / United Nations, CC BY 4.0)',
      totalEvents: features.length,
      earthquakesCount,
      gdacsAlertsCount,
      updatedAt: new Date().toISOString(),
      stale: isStale,
      disclaimer:
        'Les alertes GDACS et détections sismiques USGS sont automatisées et issues de capteurs scientifiques ouverts. Elles sont fournies à titre informatif et ne remplacent pas les consignes des autorités de protection civile.',
    },
    features,
  };
}

async function fetchDisastersFromUpstream(): Promise<CacheEntry> {
  const [usgsRes, gdacsRes] = await Promise.allSettled([
    fetch(USGS_EARTHQUAKES_URL, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    }),
    fetch(GDACS_GEORSS_URL, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      headers: { Accept: 'application/xml, text/xml' },
    }),
  ]);

  let usgsEvents: DisasterEvent[] = [];
  let gdacsEvents: DisasterEvent[] = [];

  if (usgsRes.status === 'fulfilled' && usgsRes.value.ok) {
    try {
      const json: unknown = await usgsRes.value.json();
      usgsEvents = parseUsgsEarthquakes(json);
    } catch {
      // Ignore parse failure for partial resilience
    }
  }

  if (gdacsRes.status === 'fulfilled' && gdacsRes.value.ok) {
    try {
      const xml = await gdacsRes.value.text();
      gdacsEvents = parseGdacsRss(xml);
    } catch {
      // Ignore parse failure
    }
  }

  if (usgsEvents.length === 0 && gdacsEvents.length === 0) {
    throw new Error('Toutes les sources d’alertes amont sont inaccessibles.');
  }

  const merged = deduplicateEvents([...usgsEvents, ...gdacsEvents]);

  return {
    events: merged,
    earthquakesCount: usgsEvents.length,
    gdacsAlertsCount: gdacsEvents.length,
    timestamp: Date.now(),
  };
}

export async function getDisasterEventsSnapshot(
  options: DisasterQueryOptions = {},
): Promise<DisasterEventsSnapshot> {
  const now = Date.now();

  // Fresh cache hit
  if (cachedDisasters && now - cachedDisasters.timestamp < CACHE_TTL_MS) {
    const filtered = filterDisasters(cachedDisasters.events, options);
    return convertToDisastersGeoJson(
      filtered,
      cachedDisasters.earthquakesCount,
      cachedDisasters.gdacsAlertsCount,
      false,
    );
  }

  if (!inFlightFetch) {
    inFlightFetch = fetchDisastersFromUpstream()
      .then((entry) => {
        cachedDisasters = entry;
        inFlightFetch = null;
        return entry;
      })
      .catch(() => {
        inFlightFetch = null;
        if (cachedDisasters && now - cachedDisasters.timestamp < STALE_TTL_MS) {
          return cachedDisasters;
        }
        throw new ServiceUnavailableError(
          'Les flux d’alertes catastrophes et séismes sont momentanément inaccessibles.',
          'DISASTERS_UNAVAILABLE',
        );
      });
  }

  try {
    const entry = await inFlightFetch;
    const isStale = now - entry.timestamp >= CACHE_TTL_MS;
    const filtered = filterDisasters(entry.events, options);
    return convertToDisastersGeoJson(
      filtered,
      entry.earthquakesCount,
      entry.gdacsAlertsCount,
      isStale,
    );
  } catch (error) {
    if (cachedDisasters) {
      const filtered = filterDisasters(cachedDisasters.events, options);
      return convertToDisastersGeoJson(
        filtered,
        cachedDisasters.earthquakesCount,
        cachedDisasters.gdacsAlertsCount,
        true,
      );
    }
    throw error;
  }
}

function filterDisasters(
  events: DisasterEvent[],
  options: DisasterQueryOptions,
): DisasterEvent[] {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const minMag = options.minMagnitude;
  const eventType = options.eventType;

  const result: DisasterEvent[] = [];
  for (const e of events) {
    if (minMag !== undefined && (e.magnitude === undefined || e.magnitude < minMag)) {
      continue;
    }
    if (eventType !== undefined && e.eventType !== eventType) {
      continue;
    }
    result.push(e);
    if (result.length >= limit) break;
  }
  return result;
}
