import { ServiceUnavailableError } from '@/lib/api-errors';
import type { LiveWeatherCondition, LiveWeatherSnapshot } from './live-weather-types';
import { resolveWeatherTarget, type ResolvedTarget } from './weather-locations';
import { normalizeOpenMeteo, normalizeWttr, openMeteoUrl } from './weather-adapters';
import { makeWeatherSnapshot, admissibleWeather, WEATHER_TTL_MS } from './weather-contract';
import { readWeatherJson, weatherDeadline, WEATHER_DIRECT_TIMEOUT_MS } from './weather-request';

// Compatibility exports for existing server consumers; clients import the pure modules.
export { QUICK_WEATHER_LOCATIONS, degToCompass, interpretWeatherCode, resolveWeatherTarget } from './weather-locations';
const weatherCache = new Map<string, LiveWeatherCondition>();
const pendingWeatherRequests = new Map<string, Promise<LiveWeatherCondition>>();
export function clearWeatherCacheForTesting() { weatherCache.clear(); pendingWeatherRequests.clear(); }

async function fetchProvider(target: ResolvedTarget, provider: 'Open-Meteo' | 'wttr.in') {
  const url = provider === 'Open-Meteo' ? openMeteoUrl(target)
    : new URL(`https://wttr.in/${target.latitude.toFixed(4)},${target.longitude.toFixed(4)}?format=j1&lang=fr&m`);
  return weatherDeadline(new AbortController().signal, WEATHER_DIRECT_TIMEOUT_MS, async signal => {
    const response = await fetch(url, { cache: 'no-store', redirect: 'error', signal,
      headers: { Accept: 'application/json', 'User-Agent': 'AfricaLiveTV-Radar/1.0 (+https://africatv.sn; contact@africatv.sn)' } });
    if (!response.ok) throw new Error('Fournisseur météo indisponible.');
    const data = await readWeatherJson(response, signal);
    const condition = provider === 'Open-Meteo' ? normalizeOpenMeteo(data, target, 'server') : normalizeWttr(data, target);
    if (!admissibleWeather(makeWeatherSnapshot(condition))) throw new Error('Observation météo expirée.');
    return condition;
  });
}

export async function getRadarWeather(query?: { code?: string; city?: string; lat?: number; lon?: number }): Promise<LiveWeatherSnapshot> {
  const target = resolveWeatherTarget(query);
  const key = `${target.latitude.toFixed(4)},${target.longitude.toFixed(4)}`;
  const cached = weatherCache.get(key);
  const now = Date.now();
  if (cached && now < Date.parse(cached.fetchedAt) + WEATHER_TTL_MS && admissibleWeather(makeWeatherSnapshot(cached, now), now)) {
    return makeWeatherSnapshot(cached, now);
  }
  let pending = pendingWeatherRequests.get(key);
  if (!pending) {
    pending = (async () => {
      try { return await fetchProvider(target, 'Open-Meteo'); }
      catch { return await fetchProvider(target, 'wttr.in'); }
    })().then(condition => {
      weatherCache.set(key, condition);
      return condition;
    }).finally(() => pendingWeatherRequests.delete(key));
    pendingWeatherRequests.set(key, pending);
  }
  try { return makeWeatherSnapshot(await pending); }
  catch {
    // Use completion time: a slow outage must not extend a previously valid cache.
    if (cached) {
      const snapshot = makeWeatherSnapshot(cached, Date.now(), true);
      if (admissibleWeather(snapshot)) return snapshot;
    }
    throw new ServiceUnavailableError('Les données météo sont temporairement indisponibles.', 'LIVE_WEATHER_UNAVAILABLE');
  }
}
