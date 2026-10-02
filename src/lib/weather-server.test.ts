import assert from 'node:assert/strict';
import test from 'node:test';
import { clearWeatherCacheForTesting, getRadarWeather } from './live-weather';

const NOW = Date.parse('2026-10-01T17:30:00Z');
const valid = { current_condition: [{ temp_C: '0', FeelsLikeC: '-5', humidity: '50', windspeedKmph: '0', winddirDegree: '0',
  precipMM: '0', weatherCode: '113', localObsDateTime: '2026-10-01 05:30 PM', isDayTime: 'yes' }] };
for (const failure of ['429', '500', 'timeout', 'payload', 'oversize']) test(`RW-003/RW-005 serveur: Open-Meteo ${failure} → wttr validé, mutualisé et conservé`, async t => {
  clearWeatherCacheForTesting(); let now = NOW, calls = 0, failWttr = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    calls++; assert.equal(init?.redirect, 'error'); assert.ok(init?.signal);
    if (String(url).includes('open-meteo')) {
      if (failure === 'timeout') throw new DOMException('Timeout', 'TimeoutError');
      return Response.json(failure === 'oversize' ? { large: 'x'.repeat(100001) } : {},
        { status: failure === '429' ? 429 : failure === '500' ? 500 : 200 });
    }
    return Response.json(failWttr ? { current_condition: [{}] } : valid);
  });
  try {
    const [first, duplicate] = await Promise.all([getRadarWeather({ code: 'SN' }), getRadarWeather({ code: 'SN' })]);
    assert.equal(calls, 2); assert.deepEqual(duplicate, first);
    assert.equal(first.current.source, 'wttr.in'); assert.equal(first.availability[0].status, 'available');
    now += 14 * 60_000; assert.deepEqual(await getRadarWeather({ code: 'SN' }), first); assert.equal(calls, 2);
    now += 2 * 60_000; failWttr = true;
    const stale = await getRadarWeather({ code: 'SN' }); assert.equal(calls, 4);
    assert.equal(stale.stale, true); assert.equal(stale.current.source, 'wttr.in');
    assert.equal(stale.fetchedAt, first.fetchedAt); assert.equal(stale.availability[0].fetchedAt, first.availability[0].fetchedAt);
    assert.equal(stale.availability[0].lastSuccessAt, first.availability[0].lastSuccessAt);
    assert.equal(stale.availability[0].cacheExpiresAt, first.availability[0].cacheExpiresAt);
    now += 44 * 60_000; await assert.rejects(getRadarWeather({ code: 'SN' }), { code: 'LIVE_WEATHER_UNAVAILABLE' });
  } finally { clearWeatherCacheForTesting(); }
});

test('RW-003: rejected provider responses never become a healthy cache success', async t => {
  clearWeatherCacheForTesting(); let calls = 0;
  t.mock.method(Date, 'now', () => NOW);
  t.mock.method(globalThis, 'fetch', async () => { calls++; return Response.json({ current_condition: [{}] }); });
  for (let attempt = 0; attempt < 2; attempt++) await assert.rejects(getRadarWeather({ code: 'SN' }), { code: 'LIVE_WEATHER_UNAVAILABLE' });
  assert.equal(calls, 4); clearWeatherCacheForTesting();
});
