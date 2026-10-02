import { z } from 'zod';
import { normalizeRadarDate } from './radar-data';
import { degToCompass, interpretWeatherCode, type ResolvedTarget, QUICK_WEATHER_LOCATIONS } from './weather-locations';
import { weatherConditionSchema, timezoneSchema, WEATHER_FUTURE_TOLERANCE_MS } from './weather-contract';
import type { LiveWeatherCondition, WeatherIconType } from './live-weather-types';

const record = z.record(z.string(), z.unknown());
const numeric = z.union([z.number(), z.string().regex(/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/).transform(Number)]).pipe(z.number());
const dayValue = z.union([z.literal(0), z.literal(1), z.boolean()]).optional().transform(v => v === undefined ? null : v === 1 || v === true);
const openPayload = z.object({ latitude: z.number(), longitude: z.number(), timezone: z.string().optional(),
  current_units: z.object({ temperature_2m: z.literal('°C'), apparent_temperature: z.literal('°C'),
    relative_humidity_2m: z.literal('%'), wind_speed_10m: z.literal('km/h'), wind_direction_10m: z.literal('°'),
    precipitation: z.literal('mm'), time: z.literal('unixtime') }),
  current: z.object({ temperature_2m: z.number(), apparent_temperature: z.number(), relative_humidity_2m: z.number().min(0).max(100),
    wind_speed_10m: z.number().nonnegative(), wind_direction_10m: z.number().min(0).max(360), precipitation: z.number().nonnegative(),
    weather_code: z.number().int().nonnegative().optional(), is_day: dayValue, time: z.number().optional() }),
});

export function openMeteoUrl(target: ResolvedTarget) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude: target.latitude.toFixed(4), longitude: target.longitude.toFixed(4),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
    timezone: 'auto', timeformat: 'unixtime', temperature_unit: 'celsius', wind_speed_unit: 'kmh', precipitation_unit: 'mm' }).toString();
  return url;
}

function observation(date: string | null, now: number) {
  if (date && Date.parse(date) > now + WEATHER_FUTURE_TOLERANCE_MS) throw new Error('Observation météo future.');
  return { observedAt: date, timeAnomaly: date && Date.parse(date) > now ? 'future_skew' as const : null };
}
function coordinates(target: ResolvedTarget, lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180
    || Math.abs(lat - target.latitude) > 1 || Math.abs(lon - target.longitude) > 1) throw new Error('Lieu fournisseur incorrect.');
}
export function normalizeOpenMeteo(payload: unknown, target: ResolvedTarget, transport: 'server' | 'browser', now = Date.now()): LiveWeatherCondition {
  const data = openPayload.parse(payload), c = data.current;
  coordinates(target, data.latitude, data.longitude);
  const info = interpretWeatherCode(c.weather_code ?? -1);
  const code = info.icon === 'unknown' ? null : c.weather_code ?? null;
  const date = c.time === undefined ? null : new Date(c.time * 1000).toISOString();
  return weatherConditionSchema.parse({ ...target, timezone: timezoneSchema.safeParse(data.timezone).success ? data.timezone : null,
    temperatureC: c.temperature_2m, apparentTemperatureC: c.apparent_temperature, relativeHumidityPercent: c.relative_humidity_2m,
    windSpeedKmh: c.wind_speed_10m, windDirectionDeg: c.wind_direction_10m, windDirectionCompass: degToCompass(c.wind_direction_10m),
    weatherCode: code, weatherDescription: info.description, weatherIcon: info.icon, isDay: c.is_day,
    precipitationMm: c.precipitation, ...observation(date, now), fetchedAt: new Date(now).toISOString(), stale: false,
    source: 'Open-Meteo', transport, attribution: 'Données météo : Open-Meteo (CC BY 4.0)' });
}

// WorldWeatherOnline enumeration used by wttr.in (not WMO).
const wttrGroups: Array<{ codes: number[]; icon: WeatherIconType; description: string }> = [
  { codes: [113], icon: 'clear', description: 'Ciel dégagé' },
  { codes: [116], icon: 'partly-cloudy', description: 'Partiellement nuageux' },
  { codes: [119, 122], icon: 'cloudy', description: 'Couvert' },
  { codes: [143, 248, 260], icon: 'fog', description: 'Brouillard' },
  { codes: [200, 386, 389, 392, 395], icon: 'storm', description: 'Orage' },
  { codes: [176, 182, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365], icon: 'rain', description: 'Pluie ou précipitations verglaçantes' },
  { codes: [179, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377], icon: 'cloudy', description: 'Neige ou grésil' },
];
export function interpretWttrCode(code: number | null) {
  return wttrGroups.find(g => code !== null && g.codes.includes(code)) ?? { icon: 'unknown' as const, description: 'Condition inconnue' };
}
const quickZones: Record<string, string> = { SN: 'Africa/Dakar', CI: 'Africa/Abidjan', ML: 'Africa/Bamako', GN: 'Africa/Conakry',
  NG: 'Africa/Lagos', CD: 'Africa/Kinshasa', KE: 'Africa/Nairobi', MA: 'Africa/Casablanca', ZA: 'Africa/Johannesburg' };

function localParts(at: number, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
  return [get('year'), get('month'), get('day'), get('hour'), get('minute'), get('second')];
}
// Interpret a calendar time only with a verified IANA zone, rejecting DST ambiguity/gaps.
export function localWeatherDate(raw: unknown, timezone: string | null): string | null {
  if (typeof raw !== 'string') return null;
  if (/T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) return normalizeRadarDate(raw);
  if (!timezone) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (?:(AM|PM))$/i);
  if (!match) return null;
  const y = Number(match[1]), m = Number(match[2]), d = Number(match[3]), hour12 = Number(match[4]), min = Number(match[5]);
  if (hour12 < 1 || hour12 > 12 || min > 59) return null;
  const h = hour12 % 12 + (match[6].toUpperCase() === 'PM' ? 12 : 0);
  const naive = Date.UTC(y, m - 1, d, h, min);
  const candidates = new Set<number>();
  for (const probe of [naive - 86400_000, naive, naive + 86400_000]) {
    const [py, pm, pd, ph, pmin, ps] = localParts(probe, timezone);
    const offset = Date.UTC(py, pm - 1, pd, ph, pmin, ps) - probe;
    const candidate = naive - offset;
    if (localParts(candidate, timezone).join() === [y, m, d, h, min, 0].join()) candidates.add(candidate);
  }
  return candidates.size === 1 ? new Date([...candidates][0]).toISOString() : null;
}

function wttrDay(data: Record<string, unknown>, c: Record<string, unknown>, observedAt: string | null, timezone: string | null) {
  if (c.isDayTime === 'yes' || c.isDayTime === 'no') return c.isDayTime === 'yes';
  if (!observedAt || !timezone || !Array.isArray(data.weather)) return null;
  const [y, m, d] = localParts(Date.parse(observedAt), timezone);
  const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const day = data.weather.find(value => record.safeParse(value).success && value.date === date);
  const parsed = record.safeParse(day);
  if (!parsed.success || !Array.isArray(parsed.data.astronomy)) return null;
  const astronomy = record.safeParse(parsed.data.astronomy[0]);
  if (!astronomy.success) return null;
  const sunrise = localWeatherDate(`${date} ${astronomy.data.sunrise}`, timezone);
  const sunset = localWeatherDate(`${date} ${astronomy.data.sunset}`, timezone);
  if (!sunrise || !sunset || Date.parse(sunrise) >= Date.parse(sunset)) return null;
  return Date.parse(observedAt) >= Date.parse(sunrise) && Date.parse(observedAt) < Date.parse(sunset);
}
export function normalizeWttr(payload: unknown, target: ResolvedTarget, now = Date.now()): LiveWeatherCondition {
  const data = record.parse(payload);
  if (!Array.isArray(data.current_condition)) throw new Error('Observation wttr.in absente.');
  const c = record.parse(data.current_condition[0]);
  if (Array.isArray(data.nearest_area)) {
    const area = record.parse(data.nearest_area[0]);
    coordinates(target, numeric.parse(area.latitude), numeric.parse(area.longitude));
  }
  const quick = QUICK_WEATHER_LOCATIONS.find(loc => loc.code === target.countryCode && loc.latitude === target.latitude && loc.longitude === target.longitude);
  const timezone = quick ? quickZones[quick.code] ?? null : null;
  const observedAt = localWeatherDate(c.localObsDateTime, timezone);
  const rawCode = c.weatherCode === undefined ? null : numeric.pipe(z.number().int().nonnegative()).parse(c.weatherCode);
  const info = interpretWttrCode(rawCode);
  const weatherCode = info.icon === 'unknown' ? null : rawCode;
  const direction = numeric.pipe(z.number().min(0).max(360)).parse(c.winddirDegree);
  return weatherConditionSchema.parse({ ...target, timezone,
    temperatureC: numeric.parse(c.temp_C), apparentTemperatureC: numeric.parse(c.FeelsLikeC),
    relativeHumidityPercent: numeric.pipe(z.number().min(0).max(100)).parse(c.humidity),
    windSpeedKmh: numeric.pipe(z.number().nonnegative()).parse(c.windspeedKmph), windDirectionDeg: direction, windDirectionCompass: degToCompass(direction),
    precipitationMm: numeric.pipe(z.number().nonnegative()).parse(c.precipMM), weatherCode,
    weatherDescription: info.description, weatherIcon: info.icon, isDay: wttrDay(data, c, observedAt, timezone),
    ...observation(observedAt, now), fetchedAt: new Date(now).toISOString(), stale: false, source: 'wttr.in', transport: 'server',
    attribution: 'Données météo : wttr.in (codes WorldWeatherOnline)' });
}
