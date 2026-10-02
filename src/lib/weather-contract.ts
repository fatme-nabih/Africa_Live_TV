import { z } from 'zod';
import type { LiveWeatherCondition, LiveWeatherSnapshot } from './live-weather-types';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { QUICK_WEATHER_LOCATIONS } from './weather-locations';
import { radarSource } from './radar-data';

export const WEATHER_TTL_MS = 15 * 60_000;
export const WEATHER_MAX_STALE_MS = 60 * 60_000;
export const WEATHER_FUTURE_TOLERANCE_MS = 5 * 60_000;
const date = z.iso.datetime({ offset: true });
const text = z.string().min(1).max(200);
export const weatherCountrySchema = z.string().refine(code => code === 'AFR' || AFRICAN_COUNTRIES.some(c => c.code === code));
export const timezoneSchema = z.string().refine(value => {
  try { new Intl.DateTimeFormat('fr', { timeZone: value }); return true; } catch { return false; }
}).nullable();
export const weatherConditionSchema: z.ZodType<LiveWeatherCondition> = z.object({
  locationName: text, countryCode: weatherCountrySchema, countryName: text, region: text,
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), timezone: timezoneSchema,
  temperatureC: z.number(), apparentTemperatureC: z.number(), relativeHumidityPercent: z.number().min(0).max(100),
  windSpeedKmh: z.number().nonnegative(), windDirectionDeg: z.number().min(0).max(360), windDirectionCompass: text,
  weatherCode: z.number().int().nonnegative().nullable(), weatherDescription: text,
  weatherIcon: z.enum(['clear', 'partly-cloudy', 'cloudy', 'fog', 'rain', 'storm', 'unknown']),
  isDay: z.boolean().nullable(), precipitationMm: z.number().nonnegative(), observedAt: date.nullable(), fetchedAt: date,
  stale: z.boolean(), source: z.enum(['Open-Meteo', 'wttr.in']), transport: z.enum(['server', 'browser']),
  timeAnomaly: z.literal('future_skew').nullable(), attribution: z.string().min(1).max(500),
}).strict();
export const weatherSnapshotSchema: z.ZodType<LiveWeatherSnapshot> = z.object({
  current: weatherConditionSchema,
  quickLocations: z.array(z.object({ code: weatherCountrySchema, city: text, countryName: text, region: text,
    latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict()).min(1),
  fetchedAt: date, validUntil: date, stale: z.boolean(),
  availability: z.array(z.object({ provider: text, scope: text,
    status: z.enum(['available', 'empty', 'partial', 'stale', 'unavailable', 'not_configured']),
    fetchedAt: date, lastSuccessAt: date.nullable(), dataAt: date.nullable(), cacheExpiresAt: date.nullable(),
    count: z.number().int().nonnegative(), limit: z.number().optional(),
  }).strict()).length(1),
}).strict().superRefine((snapshot, ctx) => {
  const c = snapshot.current, row = snapshot.availability[0];
  const fetched = Date.parse(c.fetchedAt);
  const observed = c.observedAt ? Date.parse(c.observedAt) : null;
  const expiry = Math.min(fetched + WEATHER_MAX_STALE_MS, observed === null ? Infinity : observed + WEATHER_MAX_STALE_MS);
  const freshExpiry = Math.min(fetched + WEATHER_TTL_MS, observed === null ? Infinity : observed + WEATHER_MAX_STALE_MS);
  if (snapshot.fetchedAt !== c.fetchedAt || snapshot.stale !== c.stale || Date.parse(snapshot.validUntil) !== expiry
    || row.provider !== c.source || row.scope !== c.locationName || row.fetchedAt !== c.fetchedAt
    || row.lastSuccessAt !== c.fetchedAt || row.dataAt !== c.observedAt || row.count !== 1
    || Date.parse(row.cacheExpiresAt ?? '') !== freshExpiry
    || row.status !== (c.stale ? 'stale' : c.observedAt === null || c.timezone === null || c.isDay === null || c.weatherCode === null || c.timeAnomaly ? 'partial' : 'available')) {
    ctx.addIssue({ code: 'custom', message: 'Snapshot météo incohérent.' });
  }
});

export function makeWeatherSnapshot(condition: LiveWeatherCondition, now = Date.now(), retained = false): LiveWeatherSnapshot {
  const fetched = Date.parse(condition.fetchedAt);
  const observed = condition.observedAt ? Date.parse(condition.observedAt) : null;
  const stale = retained || now >= fetched + WEATHER_TTL_MS || (observed !== null && now >= observed + WEATHER_MAX_STALE_MS);
  const current = { ...condition, stale };
  const status = stale ? 'stale' : observed === null || !condition.timezone || condition.isDay === null || condition.weatherCode === null || condition.timeAnomaly ? 'partial' : 'available';
  const row = radarSource(condition.source, condition.locationName, fetched, WEATHER_TTL_MS, 1,
    { status, dataAt: condition.observedAt });
  row.cacheExpiresAt = new Date(Math.min(fetched + WEATHER_TTL_MS, observed === null ? Infinity : observed + WEATHER_MAX_STALE_MS)).toISOString();
  return weatherSnapshotSchema.parse({ current, quickLocations: QUICK_WEATHER_LOCATIONS, fetchedAt: condition.fetchedAt, stale,
    validUntil: new Date(Math.min(fetched + WEATHER_MAX_STALE_MS, observed === null ? Infinity : observed + WEATHER_MAX_STALE_MS)).toISOString(), availability: [row] });
}

export function admissibleWeather(snapshot: LiveWeatherSnapshot, now = Date.now()) {
  return now < Date.parse(snapshot.validUntil) && Date.parse(snapshot.fetchedAt) <= now + WEATHER_FUTURE_TOLERANCE_MS
    && (!snapshot.current.observedAt || Date.parse(snapshot.current.observedAt) <= now + WEATHER_FUTURE_TOLERANCE_MS);
}

export function parseWeatherSnapshot(value: unknown, country: string, now = Date.now()) {
  const snapshot = weatherSnapshotSchema.parse(value);
  if (snapshot.current.countryCode !== country || !admissibleWeather(snapshot, now)) throw new Error('Relevé météo expiré ou lieu incorrect.');
  return makeWeatherSnapshot(snapshot.current, now, snapshot.stale);
}
