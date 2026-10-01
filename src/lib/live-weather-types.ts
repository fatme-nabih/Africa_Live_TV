export type WeatherIconType =
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
  timezone: string;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidityPercent: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windDirectionCompass: string;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: WeatherIconType;
  isDay: boolean;
  precipitationMm: number;
  observedAt: string;
  fetchedAt: string;
  stale: boolean;
  source: 'Open-Meteo';
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
  availability?: import('./radar-data').RadarSourceState[];
  current: LiveWeatherCondition;
  quickLocations: QuickWeatherLocation[];
  fetchedAt: string;
  stale: boolean;
};
