import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearWeatherCacheForTesting,
  degToCompass,
  getRadarWeather,
  interpretWeatherCode,
  resolveWeatherTarget,
  QUICK_WEATHER_LOCATIONS,
} from './live-weather';

test('interpretWeatherCode maps WMO codes to French descriptions and semantic icons', () => {
  assert.deepEqual(interpretWeatherCode(0), { description: 'Ciel dégagé', icon: 'clear' });
  assert.deepEqual(interpretWeatherCode(2), { description: 'Partiellement nuageux', icon: 'partly-cloudy' });
  assert.deepEqual(interpretWeatherCode(3), { description: 'Couvert', icon: 'cloudy' });
  assert.deepEqual(interpretWeatherCode(48), { description: 'Brume sèche / Harmattan', icon: 'fog' });
  assert.deepEqual(interpretWeatherCode(63), { description: 'Pluie modérée', icon: 'rain' });
  assert.deepEqual(interpretWeatherCode(95), { description: 'Orage', icon: 'storm' });
  assert.deepEqual(interpretWeatherCode(999), { description: 'Conditions variables', icon: 'partly-cloudy' });
});

test('degToCompass correctly converts wind angles to 16 compass directions', () => {
  assert.equal(degToCompass(0), 'N');
  assert.equal(degToCompass(360), 'N');
  assert.equal(degToCompass(90), 'E');
  assert.equal(degToCompass(180), 'S');
  assert.equal(degToCompass(270), 'O');
  assert.equal(degToCompass(348), 'NNO');
  assert.equal(degToCompass(45), 'NE');
  assert.equal(degToCompass(225), 'SO');
});

test('resolveWeatherTarget defaults to Dakar when no parameter is given', () => {
  const target = resolveWeatherTarget();
  assert.equal(target.locationName, 'Dakar');
  assert.equal(target.countryCode, 'SN');
  assert.equal(target.countryName, 'Sénégal');
  assert.equal(target.region, 'Afrique de l’Ouest');
  assert.equal(target.latitude, QUICK_WEATHER_LOCATIONS[0].latitude);
  assert.equal(target.longitude, QUICK_WEATHER_LOCATIONS[0].longitude);
});

test('resolveWeatherTarget resolves known quick locations by country code', () => {
  const targetCI = resolveWeatherTarget({ code: 'ci' });
  assert.equal(targetCI.locationName, 'Abidjan');
  assert.equal(targetCI.countryCode, 'CI');
  assert.equal(targetCI.countryName, 'Côte d’Ivoire');

  const targetNG = resolveWeatherTarget({ code: 'NG' });
  assert.equal(targetNG.locationName, 'Lagos');
  assert.equal(targetNG.countryCode, 'NG');
});

test('resolveWeatherTarget resolves African countries outside quick list', () => {
  const targetDZ = resolveWeatherTarget({ code: 'DZ' });
  assert.equal(targetDZ.locationName, 'Algérie');
  assert.equal(targetDZ.countryCode, 'DZ');
  assert.equal(targetDZ.region, 'Afrique du Nord');
});

test('resolveWeatherTarget resolves by city name', () => {
  const target = resolveWeatherTarget({ city: 'bamako' });
  assert.equal(target.locationName, 'Bamako');
  assert.equal(target.countryCode, 'ML');
});

test('resolveWeatherTarget resolves by explicit coordinates', () => {
  const target = resolveWeatherTarget({ lat: 14.7, lon: -17.4 });
  assert.equal(target.locationName, 'Dakar');
  assert.equal(target.countryCode, 'SN');
});

test('getRadarWeather fetches, normalizes Open-Meteo responses and caches them', async () => {
  clearWeatherCacheForTesting();

  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  const mockOpenMeteoResponse = {
    latitude: 14.69,
    longitude: -17.44,
    timezone: 'Africa/Dakar',
    current: {
      time: '2026-09-29T23:00:00Z',
      interval: 900,
      temperature_2m: 27.8,
      relative_humidity_2m: 84,
      apparent_temperature: 32.1,
      is_day: 0,
      precipitation: 0.0,
      weather_code: 1,
      wind_speed_10m: 14.7,
      wind_direction_10m: 348,
    },
  };

  globalThis.fetch = (async (url: string | URL | Request) => {
    fetchCallCount += 1;
    assert.equal(String(url).startsWith('https://api.open-meteo.com/v1/forecast'), true);
    return new Response(JSON.stringify(mockOpenMeteoResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result1 = await getRadarWeather({ code: 'SN' });
    assert.equal(fetchCallCount, 1);
    assert.equal(result1.current.locationName, 'Dakar');
    assert.equal(result1.current.temperatureC, 27.8);
    assert.equal(result1.current.apparentTemperatureC, 32.1);
    assert.equal(result1.current.relativeHumidityPercent, 84);
    assert.equal(result1.current.windSpeedKmh, 14.7);
    assert.equal(result1.current.windDirectionCompass, 'NNO');
    assert.equal(result1.current.weatherDescription, 'Principalement dégagé');
    assert.equal(result1.current.weatherIcon, 'clear');
    assert.equal(result1.current.isDay, false);
    assert.equal(result1.current.stale, false);
    assert.equal(result1.current.source, 'Open-Meteo');
    assert.equal(result1.current.attribution, 'Données météo : Open-Meteo (CC BY 4.0)');
    assert.equal(result1.quickLocations.length >= 6, true);

    // Second call for same target must hit cache and NOT invoke fetch again
    const result2 = await getRadarWeather({ code: 'SN' });
    assert.equal(fetchCallCount, 1);
    assert.equal(result2.current.temperatureC, 27.8);
  } finally {
    globalThis.fetch = originalFetch;
    clearWeatherCacheForTesting();
  }
});

test('getRadarWeather coalesces concurrent requests to the same target', async () => {
  clearWeatherCacheForTesting();

  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return new Response(
      JSON.stringify({
        latitude: 5.36,
        longitude: -4.01,
        timezone: 'Africa/Abidjan',
        current: {
          time: '2026-09-29T23:00:00Z',
          temperature_2m: 26.0,
          relative_humidity_2m: 90,
          apparent_temperature: 29.5,
          is_day: 0,
          precipitation: 0.2,
          weather_code: 80,
          wind_speed_10m: 8.5,
          wind_direction_10m: 220,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const [res1, res2, res3] = await Promise.all([
      getRadarWeather({ code: 'CI' }),
      getRadarWeather({ code: 'CI' }),
      getRadarWeather({ code: 'CI' }),
    ]);

    assert.equal(fetchCallCount, 1);
    assert.equal(res1.current.locationName, 'Abidjan');
    assert.equal(res2.current.temperatureC, 26.0);
    assert.equal(res3.current.weatherDescription, 'Averses de pluie faibles');
  } finally {
    globalThis.fetch = originalFetch;
    clearWeatherCacheForTesting();
  }
});

test('getRadarWeather serves stale cache if upstream fails within tolerance', async t => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  clearWeatherCacheForTesting();

  const originalFetch = globalThis.fetch;
  let shouldFail = false;

  globalThis.fetch = (async () => {
    if (shouldFail) {
      throw new Error('Network error to Open-Meteo');
    }
    return new Response(
      JSON.stringify({
        latitude: 12.64,
        longitude: -8.0,
        timezone: 'Africa/Bamako',
        current: {
          time: '2026-09-29T23:00:00Z',
          temperature_2m: 31.0,
          relative_humidity_2m: 55,
          apparent_temperature: 34.0,
          is_day: 0,
          precipitation: 0.0,
          weather_code: 48,
          wind_speed_10m: 10.0,
          wind_direction_10m: 60,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const fresh = await getRadarWeather({ code: 'ML' });
    assert.equal(fresh.stale, false);
    assert.equal(fresh.current.weatherDescription, 'Brume sèche / Harmattan');

    // Simulate upstream outage
    shouldFail = true;
    now += 16 * 60_000;
    const staleResult = await getRadarWeather({ code: 'ML' });
    assert.equal(staleResult.current.locationName, 'Bamako');
    assert.equal(staleResult.stale, true);
    assert.equal(staleResult.fetchedAt, fresh.fetchedAt);
    assert.equal(staleResult.current.observedAt, fresh.current.observedAt);
    now += 7 * 60 * 60_000;
    await assert.rejects(getRadarWeather({ code: 'ML' }));
  } finally {
    globalThis.fetch = originalFetch;
    clearWeatherCacheForTesting();
  }
});

test('getRadarWeather throws ServiceUnavailableError when upstream fails without cache', async () => {
  clearWeatherCacheForTesting();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error('Simulated upstream failure');
  }) as typeof fetch;

  try {
    await assert.rejects(
      async () => {
        await getRadarWeather({ code: 'CD' });
      },
      {
        name: 'ServiceUnavailableError',
        code: 'LIVE_WEATHER_UNAVAILABLE',
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
    clearWeatherCacheForTesting();
  }
});

test('getRadarWeather falls back to wttr.in when Open-Meteo returns 429', async () => {
  clearWeatherCacheForTesting();

  const originalFetch = globalThis.fetch;
  let openMeteoCalled = false;
  let wttrCalled = false;

  const mockWttrResponse = {
    current_condition: [
      {
        temp_C: '29',
        FeelsLikeC: '33',
        humidity: '75',
        windspeedKmph: '18',
        winddirDegree: '270',
        winddir16Point: 'W',
        precipMM: '0.0',
        lang_fr: [{ value: 'Ensoleillé' }],
      },
    ],
  };

  globalThis.fetch = (async (url: string | URL | Request) => {
    const urlStr = String(url);
    if (urlStr.includes('open-meteo.com')) {
      openMeteoCalled = true;
      return new Response(JSON.stringify({ error: true, reason: 'Daily API request limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (urlStr.includes('wttr.in')) {
      wttrCalled = true;
      return new Response(JSON.stringify(mockWttrResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw new Error(`Unexpected URL: ${urlStr}`);
  }) as typeof fetch;

  try {
    const result = await getRadarWeather({ code: 'SN' });
    assert.equal(openMeteoCalled, true);
    assert.equal(wttrCalled, true);
    assert.equal(result.current.locationName, 'Dakar');
    assert.equal(result.current.temperatureC, 29);
    assert.equal(result.current.apparentTemperatureC, 33);
    assert.equal(result.current.relativeHumidityPercent, 75);
    assert.equal(result.current.windSpeedKmh, 18);
    assert.equal(result.current.weatherDescription, 'Ensoleillé');
    assert.equal(result.current.weatherIcon, 'clear');
  } finally {
    globalThis.fetch = originalFetch;
    clearWeatherCacheForTesting();
  }
});
