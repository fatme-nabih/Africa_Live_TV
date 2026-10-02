import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeOpenMeteo, normalizeWttr, localWeatherDate } from './weather-adapters';
import { resolveWeatherTarget } from './weather-locations';
import { admissibleWeather, makeWeatherSnapshot, parseWeatherSnapshot } from './weather-contract';
import { readWeatherJson } from './weather-request';

const NOW = Date.parse('2026-10-01T17:30:00Z');
const target = resolveWeatherTarget({ code: 'SN' });
function wttr() { return { current_condition: [{ temp_C: '0', FeelsLikeC: '-5', humidity: '50', windspeedKmph: '0',
  winddirDegree: '360', precipMM: '0', weatherCode: '122', localObsDateTime: '2026-10-01 05:30 PM' }] }; }
function open() { return { latitude: target.latitude, longitude: target.longitude, timezone: 'Africa/Dakar',
  current_units: { time: 'unixtime', temperature_2m: '°C', apparent_temperature: '°C', relative_humidity_2m: '%',
    wind_speed_10m: 'km/h', wind_direction_10m: '°', precipitation: 'mm' },
  current: { time: NOW / 1000, temperature_2m: 0, apparent_temperature: -5, relative_humidity_2m: 50,
    wind_speed_10m: 0, wind_direction_10m: 360, precipitation: 0, weather_code: 0, is_day: 1 } }; }

test('RW-003: missing and malformed wttr observations never become invented measurements', () => {
  for (const payload of [{}, { current_condition: [] }, { current_condition: [null] }, { current_condition: [[]] }, { current_condition: [{}] }]) {
    assert.throws(() => normalizeWttr(payload, target, NOW));
  }
  for (const field of ['temp_C', 'FeelsLikeC', 'humidity', 'windspeedKmph', 'winddirDegree', 'precipMM']) {
    for (const value of [undefined, null, '', ' ', 'NaN', 'Infinity', '12abc', NaN, Infinity]) {
      const payload = wttr(); Object.assign(payload.current_condition[0], { [field]: value });
      assert.throws(() => normalizeWttr(payload, target, NOW), `${field}: ${value}`);
    }
  }
  for (const patch of [{ humidity: '101' }, { humidity: '-1' }, { precipMM: '-1' }, { windspeedKmph: '-1' }, { winddirDegree: '361' }]) {
    const payload = wttr(); Object.assign(payload.current_condition[0], patch);
    assert.throws(() => normalizeWttr(payload, target, NOW));
  }
  const c = normalizeWttr(wttr(), target, NOW);
  assert.equal(c.temperatureC, 0); assert.equal(c.apparentTemperatureC, -5); assert.equal(c.windSpeedKmh, 0);
  assert.equal(c.precipitationMm, 0); assert.equal(c.windDirectionCompass, 'N'); assert.equal(c.weatherIcon, 'cloudy');
});

test('RW-003: Open-Meteo shares strict measurements, units and location checks on both transports', () => {
  for (const field of ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'wind_speed_10m', 'wind_direction_10m', 'precipitation']) {
    const payload = open(); Object.assign(payload.current, { [field]: undefined });
    assert.throws(() => normalizeOpenMeteo(payload, target, 'server', NOW));
    assert.throws(() => normalizeOpenMeteo(payload, target, 'browser', NOW));
  }
  assert.throws(() => normalizeOpenMeteo({ ...open(), current: {} }, target, 'browser', NOW));
  assert.throws(() => normalizeOpenMeteo({ ...open(), latitude: 90 }, target, 'browser', NOW));
  assert.throws(() => normalizeOpenMeteo({ ...open(), current_units: {} }, target, 'server', NOW));
  assert.throws(() => resolveWeatherTarget({ code: 'XX' }));
  assert.throws(() => resolveWeatherTarget({ lat: Infinity, lon: 2 }));
  const server = normalizeOpenMeteo(open(), target, 'server', NOW);
  const browser = normalizeOpenMeteo(open(), target, 'browser', NOW);
  assert.deepEqual({ ...server, transport: 'browser' }, browser);
});

test('RW-003: actual and declared byte limits apply on all weather paths', async () => {
  const signal = new AbortController().signal;
  for (const response of [new Response('{}', { headers: { 'Content-Length': '100001' } }), new Response(' '.repeat(100001)), new Response('é'.repeat(50001))]) {
    await assert.rejects(readWeatherJson(response, signal), /volumineuse/);
  }
  assert.deepEqual(await readWeatherJson(Response.json({ temperature: 0 }), signal), { temperature: 0 });
});

test('RW-003: wttr enumeration stays distinct from WMO; unknown condition remains neutral', () => {
  for (const [code, icon] of [['113', 'clear'], ['122', 'cloudy'], ['248', 'fog'], ['296', 'rain'], ['200', 'storm'], ['999', 'unknown']]) {
    const payload = wttr(); payload.current_condition[0].weatherCode = code;
    const c = normalizeWttr(payload, target, NOW);
    assert.equal(c.weatherIcon, icon); assert.equal(c.weatherCode, code === '999' ? null : Number(code));
  }
});

test('RW-004: upstream dates remain stable; old/unknown/future observations are honest', () => {
  const old = wttr(); old.current_condition[0].localObsDateTime = '2026-09-29 05:30 PM';
  const condition = normalizeWttr(old, target, NOW);
  assert.equal(condition.observedAt, '2026-09-29T17:30:00.000Z');
  const snapshot = makeWeatherSnapshot(condition, NOW);
  assert.equal(snapshot.stale, true); assert.equal(admissibleWeather(snapshot, NOW), false);
  assert.throws(() => parseWeatherSnapshot(snapshot, 'SN', NOW));
  const unknown = wttr(); Object.assign(unknown.current_condition[0], { localObsDateTime: undefined, observation_time: '05:30 PM' });
  assert.equal(normalizeWttr(unknown, target, NOW).observedAt, null);
  assert.equal(localWeatherDate('2026-10-01 05:30 PM', null), null);
  const future = open(); future.current.time += 301;
  assert.throws(() => normalizeOpenMeteo(future, target, 'server', NOW));
  future.current.time -= 181;
  const skew = normalizeOpenMeteo(future, target, 'server', NOW);
  assert.equal(skew.timeAnomaly, 'future_skew'); assert.equal(skew.observedAt, '2026-10-01T17:32:00.000Z');
  assert.equal(makeWeatherSnapshot(skew, NOW).availability[0].status, 'partial');
});

test('RW-004: Nairobi 20:30, local midnight and unresolved point never inherit UTC daytime/Dakar', () => {
  const payload = wttr(); payload.current_condition[0].localObsDateTime = '2026-10-01 08:30 PM';
  Object.assign(payload, { weather: [{ date: '2026-10-01', astronomy: [{ sunrise: '06:15 AM', sunset: '06:30 PM' }] }] });
  const c = normalizeWttr(payload, resolveWeatherTarget({ code: 'KE' }), NOW);
  assert.equal(c.timezone, 'Africa/Nairobi'); assert.equal(c.observedAt, '2026-10-01T17:30:00.000Z'); assert.equal(c.isDay, false);
  assert.equal(localWeatherDate('2026-10-02 12:00 AM', 'Africa/Nairobi'), '2026-10-01T21:00:00.000Z');
  assert.equal(localWeatherDate('2026-02-30 12:00 AM', 'Africa/Nairobi'), null);
  const arbitrary = normalizeWttr(wttr(), resolveWeatherTarget({ lat: 0, lon: 0 }), NOW);
  assert.equal(arbitrary.timezone, null); assert.equal(arbitrary.observedAt, null); assert.equal(arbitrary.isDay, null);
});

test('RW-005: snapshots retain collection, observation, provider, success and expiry across cache boundaries', () => {
  const condition = normalizeOpenMeteo(open(), target, 'browser', NOW);
  const first = makeWeatherSnapshot(condition, NOW);
  const stale = makeWeatherSnapshot(condition, NOW + 16 * 60_000, true);
  assert.equal(stale.stale, true); assert.equal(stale.fetchedAt, first.fetchedAt);
  assert.equal(stale.availability[0].lastSuccessAt, first.availability[0].lastSuccessAt);
  assert.equal(stale.availability[0].cacheExpiresAt, first.availability[0].cacheExpiresAt);
  assert.equal(stale.current.transport, 'browser'); assert.equal(stale.availability[0].provider, 'Open-Meteo');
  assert.equal(admissibleWeather(stale, NOW + 60 * 60_000), false);
});
