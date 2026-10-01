import { readRadarText } from './radar-upstream';
import { ServiceUnavailableError } from '@/lib/api-errors';
import { radarSource } from './radar-data';
import type {
  FirmsGeoJsonFeature,
  FirmsHotspot,
  FirmsQueryOptions,
  FirmsSnapshot,
} from '@/lib/live-firms-types';

const FIRMS_MODIS_24H_URL =
  'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv';

// Bounding box strictly encompassing the African continent and surrounding islands
const AFRICA_BBOX = {
  minLat: -36.0,
  maxLat: 38.0,
  minLon: -26.0,
  maxLon: 52.0,
};

const CACHE_TTL_MS = 30 * 60_000; // 30 minutes cache for satellite NRT data
const STALE_TTL_MS = 6 * 60 * 60_000; // Up to 6 hours stale retention
const DEFAULT_LIMIT = 2000;
const DEFAULT_MIN_CONFIDENCE = 40;

interface CacheEntry {
  hotspots: FirmsHotspot[];
  totalAfricaCount: number;
  timestamp: number;
}

let cachedFirms: CacheEntry | null = null;
let inFlightFetch: Promise<CacheEntry> | null = null;

export function clearFirmsCacheForTests(): void {
  cachedFirms = null;
  inFlightFetch = null;
}

export function parseFirmsCsv(
  csvText: string,
  options: FirmsQueryOptions = {},
): { hotspots: FirmsHotspot[]; totalAfricaCount: number } {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const lines = csvText.split('\n');
  if (lines.length < 2) {
    return { hotspots: [], totalAfricaCount: 0 };
  }

  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');
  const brightIdx = headers.indexOf('brightness');
  const dateIdx = headers.indexOf('acq_date');
  const timeIdx = headers.indexOf('acq_time');
  const confIdx = headers.indexOf('confidence');
  const frpIdx = headers.indexOf('frp');
  const dayNightIdx = headers.indexOf('daynight');

  if (latIdx === -1 || lonIdx === -1) {
    return { hotspots: [], totalAfricaCount: 0 };
  }

  const africaHotspots: FirmsHotspot[] = [];
  let idCounter = 1;
  let totalAfricaCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.split(',');
    if (cols.length <= Math.max(latIdx, lonIdx)) continue;

    const lat = parseFloat(cols[latIdx]);
    const lon = parseFloat(cols[lonIdx]);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    // Filter within the African continent boundary
    if (
      lat < AFRICA_BBOX.minLat ||
      lat > AFRICA_BBOX.maxLat ||
      lon < AFRICA_BBOX.minLon ||
      lon > AFRICA_BBOX.maxLon
    ) {
      continue;
    }

    totalAfricaCount++;

    const conf = confIdx !== -1 ? parseInt(cols[confIdx], 10) : 50;
    const confidence = Number.isFinite(conf) ? conf : 0;

    if (confidence < minConfidence) continue;

    const brightness = brightIdx !== -1 ? parseFloat(cols[brightIdx]) : 300;
    const frp = frpIdx !== -1 ? parseFloat(cols[frpIdx]) : 0;
    const acqDate = dateIdx !== -1 ? cols[dateIdx] : '';
    const rawTime = timeIdx !== -1 ? cols[timeIdx] : '';

    // Format HHMM to HH:MM UTC
    const formattedTime =
      rawTime.length === 4
        ? `${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)} UTC`
        : rawTime;

    const dayNight =
      dayNightIdx !== -1 && cols[dayNightIdx].toUpperCase() === 'D' ? 'D' : 'N';

    africaHotspots.push({
      id: idCounter++,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      brightness: Number.isFinite(brightness) ? brightness : 300,
      frp: Number.isFinite(frp) ? frp : 0,
      confidence,
      acqDate,
      acqTime: formattedTime,
      dayNight,
    });
  }

  // Sort by Fire Radiative Power (intensity) descending
  africaHotspots.sort((a, b) => b.frp - a.frp);

  return {
    hotspots: africaHotspots.slice(0, limit),
    totalAfricaCount,
  };
}

export function convertToFirmsGeoJson(
  hotspots: FirmsHotspot[],
  totalDetections: number,
  isStale: boolean,
): FirmsSnapshot {
  const features: FirmsGeoJsonFeature[] = hotspots.map((h) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [h.longitude, h.latitude],
    },
    properties: {
      id: h.id,
      brightness: h.brightness,
      frp: h.frp,
      confidence: h.confidence,
      date: h.acqDate,
      time: h.acqTime,
      dayNight: h.dayNight,
    },
  }));

  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'NASA FIRMS (MODIS C6.1 NRT)',
      attribution:
        'Données feux actifs : NASA LANCE / EOSDIS Fire Information for Resource Management System (FIRMS)',
      totalDetections,
      returnedFeatures: features.length,
      updatedAt: new Date().toISOString(),
      stale: isStale,
    },
    features,
  };
}

async function fetchFirmsFromNasa(): Promise<CacheEntry> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(FIRMS_MODIS_24H_URL, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: 'text/csv, text/plain',
        'User-Agent': 'AfricaLiveRadar/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`NASA FIRMS upstream HTTP error ${response.status}`);
    }

    const csvText = await readRadarText(response);
    if (!/^latitude,longitude,/i.test(csvText.trim())) throw new Error('Invalid FIRMS payload');
    // Parse with high limit for in-memory cache storage
    const parsed = parseFirmsCsv(csvText, { minConfidence: 20, limit: 10000 });

    return {
      hotspots: parsed.hotspots,
      totalAfricaCount: parsed.totalAfricaCount,
      timestamp: Date.now(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getFirmsSnapshot(
  options: FirmsQueryOptions = {},
): Promise<FirmsSnapshot> {
  const now = Date.now();
  const snapshot = (entry: CacheEntry, stale: boolean) => {
    const result = convertToFirmsGeoJson(filterCachedHotspots(entry.hotspots, options), entry.totalAfricaCount, stale);
    result.metadata.updatedAt = new Date(entry.timestamp).toISOString();
    result.metadata.availability = [radarSource('NASA FIRMS', 'Afrique · détections satellitaires', stale ? now : entry.timestamp, CACHE_TTL_MS, result.features.length,
      { status: stale ? 'stale' : undefined, lastSuccessAt: new Date(entry.timestamp).toISOString(), limit: options.limit ?? DEFAULT_LIMIT,
        dataAt: result.features[0] ? result.features[0].properties.date + 'T' + result.features[0].properties.time.replace(' UTC', '') + ':00Z' : null })];
    return result;
  };

  // Fresh cache hit
  if (cachedFirms && now - cachedFirms.timestamp < CACHE_TTL_MS) {
    return snapshot(cachedFirms, false);
  }

  // Fetch or reuse in-flight request
  if (!inFlightFetch) {
    inFlightFetch = fetchFirmsFromNasa()
      .then((entry) => {
        cachedFirms = entry;
        inFlightFetch = null;
        return entry;
      })
      .catch(() => {
        inFlightFetch = null;
        if (cachedFirms && now - cachedFirms.timestamp < STALE_TTL_MS) {
          return cachedFirms;
        }
        throw new ServiceUnavailableError(
          'Les données thermiques satellitaires NASA FIRMS sont momentanément inaccessibles.',
          'FIRMS_UNAVAILABLE',
        );
      });
  }

  try {
    const entry = await inFlightFetch;
    const isStale = now - entry.timestamp >= CACHE_TTL_MS;
    return snapshot(entry, isStale);
  } catch (error) {
    throw error;
  }
}

function filterCachedHotspots(
  hotspots: FirmsHotspot[],
  options: FirmsQueryOptions,
): FirmsHotspot[] {
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const result: FirmsHotspot[] = [];
  for (const h of hotspots) {
    if (h.confidence >= minConfidence) {
      result.push(h);
      if (result.length >= limit) break;
    }
  }
  return result;
}
