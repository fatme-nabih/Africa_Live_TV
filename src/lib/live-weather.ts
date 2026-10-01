import { ServiceUnavailableError } from '@/lib/api-errors';
import { normalizeRadarDate, radarSource } from './radar-data';
import { getAfricanCountryByCode, AFRICAN_COUNTRIES } from '@/lib/live-osint';
import type {
  LiveWeatherCondition,
  LiveWeatherSnapshot,
  QuickWeatherLocation,
  WeatherIconType,
} from '@/lib/live-weather-types';

export const QUICK_WEATHER_LOCATIONS: QuickWeatherLocation[] = [
  { code: 'SN', city: 'Dakar', countryName: 'Sénégal', region: 'Afrique de l’Ouest', latitude: 14.6928, longitude: -17.4467 },
  { code: 'CI', city: 'Abidjan', countryName: 'Côte d’Ivoire', region: 'Afrique de l’Ouest', latitude: 5.3599, longitude: -4.0083 },
  { code: 'ML', city: 'Bamako', countryName: 'Mali', region: 'Afrique de l’Ouest', latitude: 12.6392, longitude: -8.0029 },
  { code: 'GN', city: 'Conakry', countryName: 'Guinée', region: 'Afrique de l’Ouest', latitude: 9.5370, longitude: -13.6785 },
  { code: 'NG', city: 'Lagos', countryName: 'Nigéria', region: 'Afrique de l’Ouest', latitude: 6.5244, longitude: 3.3792 },
  { code: 'CD', city: 'Kinshasa', countryName: 'RD Congo', region: 'Afrique centrale', latitude: -4.4419, longitude: 15.2663 },
  { code: 'KE', city: 'Nairobi', countryName: 'Kenya', region: 'Afrique de l’Est', latitude: -1.2921, longitude: 36.8219 },
  { code: 'MA', city: 'Casablanca', countryName: 'Maroc', region: 'Afrique du Nord', latitude: 33.5731, longitude: -7.5898 },
  { code: 'ZA', city: 'Johannesburg', countryName: 'Afrique du Sud', region: 'Afrique australe', latitude: -26.2041, longitude: 28.0473 },
];

const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO',
  'O', 'ONO', 'NO', 'NNO',
] as const;

export function degToCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_DIRECTIONS[index];
}

export function interpretWeatherCode(code: number): {
  description: string;
  icon: WeatherIconType;
} {
  switch (code) {
    case 0:
      return { description: 'Ciel dégagé', icon: 'clear' };
    case 1:
      return { description: 'Principalement dégagé', icon: 'clear' };
    case 2:
      return { description: 'Partiellement nuageux', icon: 'partly-cloudy' };
    case 3:
      return { description: 'Couvert', icon: 'cloudy' };
    case 45:
      return { description: 'Brouillard', icon: 'fog' };
    case 48:
      return { description: 'Brume sèche / Harmattan', icon: 'fog' };
    case 51:
    case 53:
    case 55:
      return { description: 'Bruine', icon: 'rain' };
    case 56:
    case 57:
      return { description: 'Bruine verglaçante', icon: 'rain' };
    case 61:
      return { description: 'Pluie faible', icon: 'rain' };
    case 63:
      return { description: 'Pluie modérée', icon: 'rain' };
    case 65:
      return { description: 'Forte pluie', icon: 'rain' };
    case 66:
    case 67:
      return { description: 'Pluie verglaçante', icon: 'rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { description: 'Chutes de neige', icon: 'cloudy' };
    case 80:
      return { description: 'Averses de pluie faibles', icon: 'rain' };
    case 81:
      return { description: 'Averses de pluie modérées', icon: 'rain' };
    case 82:
      return { description: 'Violentes averses de pluie', icon: 'rain' };
    case 85:
    case 86:
      return { description: 'Averses de neige', icon: 'cloudy' };
    case 95:
      return { description: 'Orage', icon: 'storm' };
    case 96:
    case 99:
      return { description: 'Orage avec grêle', icon: 'storm' };
    default:
      return { description: 'Conditions variables', icon: 'partly-cloudy' };
  }
}

type ResolvedTarget = {
  locationName: string;
  countryCode: string;
  countryName: string;
  region: string;
  latitude: number;
  longitude: number;
};

function normalizeText(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function resolveWeatherTarget(query?: {
  code?: string;
  city?: string;
  lat?: number;
  lon?: number;
}): ResolvedTarget {
  if (query?.lat !== undefined && query?.lon !== undefined) {
    const lat = query.lat;
    const lon = query.lon;
    const quickMatch = QUICK_WEATHER_LOCATIONS.find(
      (loc) => Math.abs(loc.latitude - lat) < 0.25 && Math.abs(loc.longitude - lon) < 0.25,
    );
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
    const countryMatch = AFRICAN_COUNTRIES.find(
      (c) => Math.abs(c.latitude - lat) < 1.0 && Math.abs(c.longitude - lon) < 1.0,
    );
    if (countryMatch) {
      return {
        locationName: countryMatch.name,
        countryCode: countryMatch.code,
        countryName: countryMatch.name,
        region: countryMatch.region,
        latitude: lat,
        longitude: lon,
      };
    }
    return {
      locationName: 'Position sélectionnée',
      countryCode: 'AFR',
      countryName: 'Afrique',
      region: 'Continent africain',
      latitude: lat,
      longitude: lon,
    };
  }

  if (query?.code) {
    const code = query.code.trim().toUpperCase();
    const quickMatch = QUICK_WEATHER_LOCATIONS.find((loc) => loc.code === code);
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
    const country = getAfricanCountryByCode(code);
    if (country) {
      return {
        locationName: country.name,
        countryCode: country.code,
        countryName: country.name,
        region: country.region,
        latitude: country.latitude,
        longitude: country.longitude,
      };
    }
  }

  if (query?.city) {
    const search = normalizeText(query.city);
    const quickMatch = QUICK_WEATHER_LOCATIONS.find(
      (loc) => normalizeText(loc.city) === search || normalizeText(loc.countryName) === search,
    );
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
  }

  const defaultLocation = QUICK_WEATHER_LOCATIONS[0];
  return {
    locationName: defaultLocation.city,
    countryCode: defaultLocation.code,
    countryName: defaultLocation.countryName,
    region: defaultLocation.region,
    latitude: defaultLocation.latitude,
    longitude: defaultLocation.longitude,
  };
}

const WEATHER_TTL_MS = 15 * 60_000;
const WEATHER_MAX_STALE_MS = 60 * 60_000;
const MAX_WEATHER_BYTES = 100_000;

type CacheEntry = {
  value: LiveWeatherCondition;
  savedAt: number;
  expiresAt: number;
};

const weatherCache = new Map<string, CacheEntry>();
const pendingWeatherRequests = new Map<string, Promise<LiveWeatherCondition>>();

export function clearWeatherCacheForTesting() {
  weatherCache.clear();
  pendingWeatherRequests.clear();
}

async function readBoundedText(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Upstream response exceeded the allowed size.');
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  let byteCount = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maxBytes) {
        await reader.cancel();
        throw new Error('Upstream response exceeded the allowed size.');
      }
      result += decoder.decode(value, { stream: true });
    }
    result += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function fetchFromOpenMeteo(target: ResolvedTarget): Promise<LiveWeatherCondition> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', target.latitude.toFixed(4));
  url.searchParams.set('longitude', target.longitude.toFixed(4));
  url.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('timeformat', 'unixtime');

  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AfricaLiveTV-Radar/1.0 (+https://africatv.sn; contact@africatv.sn)',
    },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo returned status ${response.status}`);
  }

  const rawText = await readBoundedText(response, MAX_WEATHER_BYTES);
  const data: unknown = JSON.parse(rawText);

  if (!isRecord(data) || !isRecord(data.current)) {
    throw new Error('Open-Meteo response format was invalid.');
  }

  const current = data.current;
  if (![0, 1, true, false].includes(current.is_day as number | boolean)) throw new Error('Weather day indicator missing');
  for (const field of ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'weather_code', 'precipitation']) {
    if (typeof current[field] !== 'number' || !Number.isFinite(current[field])) throw new Error('Weather measurement missing');
  }
  const temp = typeof current.temperature_2m === 'number' ? Math.round(current.temperature_2m * 10) / 10 : 0;
  const apparent = typeof current.apparent_temperature === 'number' ? Math.round(current.apparent_temperature * 10) / 10 : temp;
  const humidity = typeof current.relative_humidity_2m === 'number' ? Math.round(current.relative_humidity_2m) : 0;
  const windSpeed = typeof current.wind_speed_10m === 'number' ? Math.round(current.wind_speed_10m * 10) / 10 : 0;
  const windDir = typeof current.wind_direction_10m === 'number' ? Math.round(current.wind_direction_10m) : 0;
  const weatherCode = typeof current.weather_code === 'number' ? current.weather_code : 0;
  const isDay = current.is_day === 1 || current.is_day === true;
  const precipitation = typeof current.precipitation === 'number' ? Math.round(current.precipitation * 10) / 10 : 0;
  const timeStr = typeof current.time === 'number' && Number.isFinite(current.time)
    ? new Date(current.time * 1000).toISOString()
    : normalizeRadarDate(current.time);
  if (!timeStr) throw new Error('Weather observation date missing');
  const timezone = typeof data.timezone === 'string' ? data.timezone : 'Africa/Dakar';

  const { description, icon } = interpretWeatherCode(weatherCode);

  const nowIso = new Date().toISOString();

  return {
    locationName: target.locationName,
    countryCode: target.countryCode,
    countryName: target.countryName,
    region: target.region,
    latitude: target.latitude,
    longitude: target.longitude,
    timezone,
    temperatureC: temp,
    apparentTemperatureC: apparent,
    relativeHumidityPercent: humidity,
    windSpeedKmh: windSpeed,
    windDirectionDeg: windDir,
    windDirectionCompass: degToCompass(windDir),
    weatherCode,
    weatherDescription: description,
    weatherIcon: icon,
    isDay,
    precipitationMm: precipitation,
    observedAt: timeStr,
    fetchedAt: nowIso,
    stale: false,
    source: 'Open-Meteo',
    attribution: 'Données météo : Open-Meteo (CC BY 4.0)',
  };
}

async function fetchFromWttr(target: ResolvedTarget): Promise<LiveWeatherCondition> {
  const url = new URL(`https://wttr.in/${target.latitude.toFixed(4)},${target.longitude.toFixed(4)}`);
  url.searchParams.set('format', 'j1');
  url.searchParams.set('lang', 'fr');

  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AfricaLiveTV-Radar/1.0 (+https://africatv.sn; contact@africatv.sn)',
    },
  });

  if (!response.ok) {
    throw new Error(`wttr.in returned status ${response.status}`);
  }

  const rawText = await readBoundedText(response, MAX_WEATHER_BYTES);
  const data: unknown = JSON.parse(rawText);

  if (!isRecord(data) || !Array.isArray(data.current_condition) || data.current_condition.length === 0) {
    throw new Error('wttr.in response format was invalid.');
  }

  const current = data.current_condition[0] as Record<string, unknown>;
  const temp = typeof current.temp_C === 'string' ? parseFloat(current.temp_C) : Number(current.temp_C) || 0;
  const apparent = typeof current.FeelsLikeC === 'string' ? parseFloat(current.FeelsLikeC) : Number(current.FeelsLikeC) || temp;
  const humidity = typeof current.humidity === 'string' ? parseFloat(current.humidity) : Number(current.humidity) || 0;
  const windSpeed = typeof current.windspeedKmph === 'string' ? parseFloat(current.windspeedKmph) : Number(current.windspeedKmph) || 0;
  const windDir = typeof current.winddirDegree === 'string' ? parseFloat(current.winddirDegree) : Number(current.winddirDegree) || 0;
  const windCompass = typeof current.winddir16Point === 'string' ? current.winddir16Point : degToCompass(windDir);
  const precipitation = typeof current.precipMM === 'string' ? parseFloat(current.precipMM) : Number(current.precipMM) || 0;

  let description = 'Conditions variables';
  if (Array.isArray(current.lang_fr) && current.lang_fr.length > 0 && isRecord(current.lang_fr[0]) && typeof current.lang_fr[0].value === 'string') {
    description = current.lang_fr[0].value;
  } else if (Array.isArray(current.weatherDesc) && current.weatherDesc.length > 0 && isRecord(current.weatherDesc[0]) && typeof current.weatherDesc[0].value === 'string') {
    description = current.weatherDesc[0].value;
  }

  const descLower = description.toLowerCase();
  let icon: WeatherIconType = 'partly-cloudy';
  if (descLower.includes('soleil') || descLower.includes('dégagé') || descLower.includes('clear') || descLower.includes('sunny')) {
    icon = 'clear';
  } else if (descLower.includes('orage') || descLower.includes('thunder') || descLower.includes('éclair')) {
    icon = 'storm';
  } else if (descLower.includes('pluie') || descLower.includes('averse') || descLower.includes('rain') || descLower.includes('bruine')) {
    icon = 'rain';
  } else if (descLower.includes('brume') || descLower.includes('brouillard') || descLower.includes('fog') || descLower.includes('mist') || descLower.includes('haze') || descLower.includes('harmattan')) {
    icon = 'fog';
  } else if (descLower.includes('nuag') || descLower.includes('couvert') || descLower.includes('cloud') || descLower.includes('overcast')) {
    icon = 'cloudy';
  }

  const currentHour = new Date().getUTCHours();
  const isDay = currentHour >= 6 && currentHour <= 19;
  const nowIso = new Date().toISOString();

  return {
    locationName: target.locationName,
    countryCode: target.countryCode,
    countryName: target.countryName,
    region: target.region,
    latitude: target.latitude,
    longitude: target.longitude,
    timezone: 'Africa/Dakar',
    temperatureC: Math.round(temp * 10) / 10,
    apparentTemperatureC: Math.round(apparent * 10) / 10,
    relativeHumidityPercent: Math.round(humidity),
    windSpeedKmh: Math.round(windSpeed * 10) / 10,
    windDirectionDeg: Math.round(windDir),
    windDirectionCompass: windCompass,
    weatherCode: 0,
    weatherDescription: description,
    weatherIcon: icon,
    isDay,
    precipitationMm: Math.round(precipitation * 10) / 10,
    observedAt: nowIso,
    fetchedAt: nowIso,
    stale: false,
    source: 'Open-Meteo',
    attribution: 'Données météo : Observation temps réel (CC BY 4.0)',
  };
}

export async function getRadarWeather(query?: {
  code?: string;
  city?: string;
  lat?: number;
  lon?: number;
}): Promise<LiveWeatherSnapshot> {
  const target = resolveWeatherTarget(query);
  const cacheKey = `${target.latitude.toFixed(2)},${target.longitude.toFixed(2)}`;
  const now = Date.now();
  const snapshot = (condition: LiveWeatherCondition, savedAt: number, stale: boolean): LiveWeatherSnapshot => ({
    current: { ...condition, stale }, quickLocations: QUICK_WEATHER_LOCATIONS,
    fetchedAt: new Date(savedAt).toISOString(), stale,
    availability: [radarSource('Open-Meteo', condition.locationName, stale ? now : savedAt, WEATHER_TTL_MS, 1,
      { status: stale ? 'stale' : undefined, lastSuccessAt: new Date(savedAt).toISOString(), dataAt: condition.observedAt })],
  });

  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return snapshot(cached.value, cached.savedAt, false);
  }

  let requestPromise = pendingWeatherRequests.get(cacheKey);
  if (!requestPromise) {
    requestPromise = (async () => {
      try {
        return await fetchFromOpenMeteo(target);
      } catch (openMeteoError) {
        try {
          return await fetchFromWttr(target);
        } catch {
          throw openMeteoError;
        }
      }
    })()
      .then((condition) => {
        const savedAt = Date.now();
        weatherCache.set(cacheKey, {
          value: condition,
          savedAt,
          expiresAt: savedAt + WEATHER_TTL_MS,
        });
        return condition;
      })
      .finally(() => {
        pendingWeatherRequests.delete(cacheKey);
      });
    pendingWeatherRequests.set(cacheKey, requestPromise);
  }

  try {
    const condition = await requestPromise;
    return snapshot(condition, weatherCache.get(cacheKey)?.savedAt ?? Date.parse(condition.fetchedAt), false);
  } catch {
    if (cached && now - cached.savedAt <= WEATHER_MAX_STALE_MS) {
      return snapshot(cached.value, cached.savedAt, true);
    }
    throw new ServiceUnavailableError(
      'Les données météo sont temporairement indisponibles.',
      'LIVE_WEATHER_UNAVAILABLE',
    );
  }
}
