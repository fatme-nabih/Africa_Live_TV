import { requestAuthorizedWeather, readWeatherJson } from './weather-request';
import { resolveWeatherTarget } from './weather-locations';
import { normalizeOpenMeteo, openMeteoUrl } from './weather-adapters';
import { makeWeatherSnapshot, parseWeatherSnapshot } from './weather-contract';
import { ZodError } from 'zod';

function validWeather<T>(validate: () => T): T {
  try { return validate(); }
  catch (error) {
    // Keep schema internals out of the public widget while retaining access errors.
    if (error instanceof ZodError) throw new Error('Réponse météo invalide. Réessayez plus tard.');
    throw error;
  }
}

export function loadClientWeather(code: string, signal: AbortSignal) {
  return requestAuthorizedWeather(code, signal, value => validWeather(() => parseWeatherSnapshot(value, code)), async directSignal => {
    const target = resolveWeatherTarget({ code });
    const response = await fetch(openMeteoUrl(target), { signal: directSignal, redirect: 'error', cache: 'no-store' });
    if (!response.ok) throw new Error('Le secours météo est indisponible.');
    const payload = await readWeatherJson(response, directSignal);
    return validWeather(() => {
      const condition = normalizeOpenMeteo(payload, target, 'browser');
      return parseWeatherSnapshot(makeWeatherSnapshot(condition), code);
    });
  });
}
