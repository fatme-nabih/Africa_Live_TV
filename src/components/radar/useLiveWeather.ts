'use client';
import { useEffect, useRef, useState } from 'react';
import type { LiveWeatherSnapshot } from '@/lib/live-weather-types';
import { loadClientWeather } from '@/lib/weather-client';
import { admissibleWeather, makeWeatherSnapshot, WEATHER_TTL_MS } from '@/lib/weather-contract';
import { WeatherRequestError } from '@/lib/weather-request';
import { useI18n } from '@/i18n/client';

// Messages propres au navigateur (le texte vient du dictionnaire) ; les autres erreurs gardent le message reçu.
const WEATHER_FAILED = 'WEATHER_FAILED';
const WEATHER_THROTTLED = 'WEATHER_THROTTLED';

const CLOCK_TICK_MS = 15_000;

export function useLiveWeather(code: string, refreshToken: number) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<LiveWeatherSnapshot | null>(null);
  const [weatherError, setError] = useState<string | null>(null);
  const [weatherLoading, setLoading] = useState(true);
  const [now, setNow] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  // Quota deadline survives country changes and manual refreshes.
  const retryDeadline = useRef(0);
  useEffect(() => {
    let active = true, running = false, denied = false;
    const controller = new AbortController();
    const load = async () => {
      if (running || denied || Date.now() < retryDeadline.current) return;
      running = true;
      setLoading(true); setError(null);
      setSnapshot(previous => previous?.current.countryCode === code && admissibleWeather(previous) ? previous : null);
      try {
        const result = await loadClientWeather(code, controller.signal);
        if (!active) return;
        setSnapshot(result); setError(null);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        const refused = error instanceof WeatherRequestError && (error.status === 401 || error.status === 403);
        denied = refused;
        if (error instanceof WeatherRequestError && error.status === 429) {
          retryDeadline.current = error.retryAt; setRetryAt(error.retryAt);
        }
        setSnapshot(previous => !refused && previous?.current.countryCode === code && admissibleWeather(previous)
          ? makeWeatherSnapshot(previous.current, Date.now(), true) : null);
        setError(error instanceof Error ? error.message : WEATHER_FAILED);
      } finally {
        running = false;
        if (active) { setLoading(false); setNow(Date.now()); }
      }
    };
    const tick = () => { if (active) setNow(Date.now()); };
    tick(); void load();
    // No immediate retry when Retry-After elapses: the regular cadence/manual action applies.
    if (Date.now() < retryDeadline.current) { setLoading(false); setError(WEATHER_THROTTLED); }
    const interval = window.setInterval(() => void load(), WEATHER_TTL_MS);
    // L'horloge ne sert qu'à constater l'expiration d'un relevé (quinze minutes de validité) : inutile de refaire le rendu de tout le Radar chaque seconde.
    const clock = window.setInterval(tick, CLOCK_TICK_MS);
    return () => { active = false; controller.abort(); window.clearInterval(interval); window.clearInterval(clock); };
  }, [code, refreshToken]);
  const weather = now > 0 && snapshot?.current.countryCode === code && admissibleWeather(snapshot, now)
    ? makeWeatherSnapshot(snapshot.current, now, snapshot.stale) : null;
  const messages = t.weather.errors;
  const shownError = weatherError === WEATHER_FAILED ? messages.failed : weatherError === WEATHER_THROTTLED ? messages.throttled : weatherError;
  return { weather, weatherError: shownError ?? (snapshot?.current.countryCode === code && !weather ? messages.expired : null),
    weatherLoading, retryBlocked: retryAt > now };
}
