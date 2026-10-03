import type { LiveWeatherCondition } from './live-weather-types';

export type WeatherAlert = { label: string; detail: string };

// Codes WMO : 95-99 orage ; 65, 67, 82 pluies fortes à violentes.
const STORM_CODES = new Set([95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 67, 82]);
const HEAVY_RAIN_MM = 8;
const STRONG_WIND_KMH = 60;
const EXTREME_HEAT_C = 45;

/**
 * Phénomène marquant dans la dernière observation d'un lieu, sinon `null`.
 * C'est un repère tiré d'un relevé automatisé, jamais une alerte officielle de protection civile.
 */
export function weatherAlert(current: Pick<LiveWeatherCondition, 'weatherCode' | 'weatherIcon' | 'windSpeedKmh' | 'precipitationMm' | 'temperatureC'>): WeatherAlert | null {
  if (current.weatherIcon === 'storm' || (current.weatherCode !== null && STORM_CODES.has(current.weatherCode))) {
    return { label: 'Orage', detail: 'Orage en cours' };
  }
  if ((current.weatherCode !== null && HEAVY_RAIN_CODES.has(current.weatherCode)) || current.precipitationMm >= HEAVY_RAIN_MM) {
    return { label: 'Fortes pluies', detail: `${current.precipitationMm} mm` };
  }
  if (current.windSpeedKmh >= STRONG_WIND_KMH) {
    return { label: 'Vent fort', detail: `${Math.round(current.windSpeedKmh)} km/h` };
  }
  if (current.temperatureC >= EXTREME_HEAT_C) {
    return { label: 'Chaleur extrême', detail: `${current.temperatureC} °C` };
  }
  return null;
}
