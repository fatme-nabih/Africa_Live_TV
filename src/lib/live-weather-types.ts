export type WeatherIconType =
  | 'unknown'
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'storm';

export type LiveWeatherCondition = {
  locationName: string;
  countryCode: string;
  countryName: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string | null;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPercent: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCompass: string;
  weatherCode: number | null;
  weatherDescription: string;
  weatherIcon: WeatherIconType;
  isDay: boolean | null;
  precipitationMm: number;
  observedAt: string | null;
  fetchedAt: string;
  stale: boolean;
  source: 'Open-Meteo' | 'wttr.in';
  transport: 'server' | 'browser';
  timeAnomaly: 'future_skew' | null;
  attribution: string;
};

export type QuickWeatherLocation = {
  code: string;
  city: string;
  countryName: string;
  region: string;
  latitude: number;
  longitude: number;
};

export type LiveWeatherSnapshot = {
  availability: import('./radar-data').RadarSourceState[];
  validUntil: string;
  current: LiveWeatherCondition;
  quickLocations: QuickWeatherLocation[];
  fetchedAt: string;
  stale: boolean;
};
