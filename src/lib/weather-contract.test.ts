import assert from 'node:assert/strict';
import test from 'node:test';
import { weatherConditionSchema, weatherSnapshotSchema, makeWeatherSnapshot, parseWeatherSnapshot, weatherCountrySchema } from './weather-contract';
import { AFRICAN_COUNTRIES } from './radar-countries';
import { QUICK_WEATHER_LOCATIONS, resolveWeatherTarget } from './weather-locations';

test('RW-008: every inventory code is unique and selects the same validated point via all paths', () => {
  assert.equal(new Set(AFRICAN_COUNTRIES.map(c => c.code)).size, AFRICAN_COUNTRIES.length);
  for (const country of AFRICAN_COUNTRIES) {
    const point = resolveWeatherTarget({ code: country.code });
    assert.equal(point.countryCode, country.code);
    assert.equal(weatherCountrySchema.safeParse(point.countryCode).success, true);
    const quick = QUICK_WEATHER_LOCATIONS.find(c => c.code === country.code);
    if (quick) assert.deepEqual(resolveWeatherTarget({ city: quick.city }), point);
    else assert.match(point.locationName, /Point de référence/);
  }
});

test('RW-002: complete snapshot, actual provider and nullable unknowns are required', () => {
  const now = Date.now();
  const condition = weatherConditionSchema.parse({ locationName: 'Dakar', countryCode: 'SN', countryName: 'Sénégal', region: 'Ouest',
    latitude: 14.6928, longitude: -17.4467, timezone: null, temperatureC: 0, apparentTemperatureC: -1,
    relativeHumidityPercent: 50, windSpeedKmh: 0, windDirectionDeg: 0, windDirectionCompass: 'N',
    weatherCode: null, weatherDescription: 'Condition inconnue', weatherIcon: 'unknown', isDay: null, precipitationMm: 0,
    observedAt: null, fetchedAt: new Date(now).toISOString(), stale: false, source: 'wttr.in', transport: 'server', timeAnomaly: null, attribution: 'wttr.in' });
  const snapshot = makeWeatherSnapshot(condition, now);
  assert.equal(snapshot.availability[0].status, 'partial');
  assert.equal(parseWeatherSnapshot(snapshot, 'SN', now).current.temperatureC, 0);
  assert.throws(() => parseWeatherSnapshot(snapshot, 'CI', now));
  for (const field of ['current', 'availability', 'quickLocations', 'validUntil', 'fetchedAt']) {
    const broken: Record<string, unknown> = { ...snapshot }; delete broken[field];
    assert.equal(weatherSnapshotSchema.safeParse(broken).success, false);
  }
  assert.equal(weatherSnapshotSchema.safeParse({ ...snapshot, availability: [{ ...snapshot.availability[0], provider: 'Open-Meteo' }] }).success, false);
  assert.equal(weatherConditionSchema.safeParse({ ...condition, transport: 'wttr.in' }).success, false);
});
