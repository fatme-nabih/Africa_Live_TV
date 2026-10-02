'use client';
import { useEffect, useRef, useState } from 'react';
import type { LiveWeatherSnapshot } from '@/lib/live-weather-types';
import { loadClientWeather } from '@/lib/weather-client';
import { admissibleWeather, makeWeatherSnapshot, WEATHER_TTL_MS } from '@/lib/weather-contract';
import { WeatherRequestError } from '@/lib/weather-request';

export function useLiveWeather(code: string, refreshToken: number) {
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
        setError(error instanceof Error ? error.message : 'Erreur de chargement météo.');
      } finally {
        running = false;
        if (active) { setLoading(false); setNow(Date.now()); }
      }
    };
    const tick = () => { if (active) setNow(Date.now()); };
    tick(); void load();
    // No immediate retry when Retry-After elapses: the regular cadence/manual action applies.
    if (Date.now() < retryDeadline.current) { setLoading(false); setError('Trop de demandes météo. Réessayez après le délai indiqué.'); }
    const interval = window.setInterval(() => void load(), WEATHER_TTL_MS);
    const clock = window.setInterval(tick, 1_000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); window.clearInterval(clock); };
  }, [code, refreshToken]);
  const weather = now > 0 && snapshot?.current.countryCode === code && admissibleWeather(snapshot, now)
    ? makeWeatherSnapshot(snapshot.current, now, snapshot.stale) : null;
  return { weather, weatherError: weatherError ?? (snapshot?.current.countryCode === code && !weather ? 'Le relevé météo a expiré. Actualisez pour réessayer.' : null),
    weatherLoading, retryBlocked: retryAt > now };
}
