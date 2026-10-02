import { AFRICAN_COUNTRIES, getAfricanCountryByCode } from './radar-countries';
import type { QuickWeatherLocation, WeatherIconType } from './live-weather-types';

export const QUICK_WEATHER_LOCATIONS: QuickWeatherLocation[] = [
  { code: 'SN', city: 'Dakar', countryName: 'Sénégal', region: 'Afrique de l’Ouest', latitude: 14.6928, longitude: -17.4467 },
  { code: 'CI', city: 'Abidjan', countryName: 'Côte d’Ivoire', region: 'Afrique de l’Ouest', latitude: 5.3599, longitude: -4.0083 },
  { code: 'ML', city: 'Bamako', countryName: 'Mali', region: 'Afrique de l’Ouest', latitude: 12.6392, longitude: -8.0029 },
  { code: 'GN', city: 'Conakry', countryName: 'Guinée', region: 'Afrique de l’Ouest', latitude: 9.5370, longitude: -13.6785 },
  { code: 'NG', city: 'Lagos', countryName: 'Nigéria', region: 'Afrique de l’Ouest', latitude: 6.5244, longitude: 3.3792 },
  { code: 'CD', city: 'Kinshasa', countryName: 'RD Congo', region: 'Afrique centrale', latitude: -4.4419, longitude: 15.2663 },
  { code: 'KE', city: 'Nairobi', countryName: 'Kenya', region: 'Afrique de l’Est', latitude: -1.2921, longitude: 36.8219 },
  { code: 'MA', city: 'Casablanca', countryName: 'Maroc', region: 'Afrique du Nord', latitude: 33.5731, longitude: -7.5898 },
  { code: 'ZA', city: 'Johannesburg', countryName: 'Afrique du Sud', region: 'Afrique australe', latitude: -26.2041, longitude: 28.0473 },
];

const COMPASS_DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSO', 'SO', 'OSO',
  'O', 'ONO', 'NO', 'NNO',
] as const;

export function degToCompass(degrees: number): string {
  const normalized = ((degrees % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return COMPASS_DIRECTIONS[index];
}

export function interpretWeatherCode(code: number): {
  description: string;
  icon: WeatherIconType;
} {
  switch (code) {
    case 0:
      return { description: 'Ciel dégagé', icon: 'clear' };
    case 1:
      return { description: 'Principalement dégagé', icon: 'clear' };
    case 2:
      return { description: 'Partiellement nuageux', icon: 'partly-cloudy' };
    case 3:
      return { description: 'Couvert', icon: 'cloudy' };
    case 45:
      return { description: 'Brouillard', icon: 'fog' };
    case 48:
      return { description: 'Brume sèche / Harmattan', icon: 'fog' };
    case 51:
    case 53:
    case 55:
      return { description: 'Bruine', icon: 'rain' };
    case 56:
    case 57:
      return { description: 'Bruine verglaçante', icon: 'rain' };
    case 61:
      return { description: 'Pluie faible', icon: 'rain' };
    case 63:
      return { description: 'Pluie modérée', icon: 'rain' };
    case 65:
      return { description: 'Forte pluie', icon: 'rain' };
    case 66:
    case 67:
      return { description: 'Pluie verglaçante', icon: 'rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { description: 'Chutes de neige', icon: 'cloudy' };
    case 80:
      return { description: 'Averses de pluie faibles', icon: 'rain' };
    case 81:
      return { description: 'Averses de pluie modérées', icon: 'rain' };
    case 82:
      return { description: 'Violentes averses de pluie', icon: 'rain' };
    case 85:
    case 86:
      return { description: 'Averses de neige', icon: 'cloudy' };
    case 95:
      return { description: 'Orage', icon: 'storm' };
    case 96:
    case 99:
      return { description: 'Orage avec grêle', icon: 'storm' };
    default:
      return { description: 'Condition inconnue', icon: 'unknown' };
  }
}

export type ResolvedTarget = {
  locationName: string;
  countryCode: string;
  countryName: string;
  region: string;
  latitude: number;
  longitude: number;
};

function normalizeText(text: string) {
  return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function resolveWeatherTarget(query?: {
  code?: string;
  city?: string;
  lat?: number;
  lon?: number;
}): ResolvedTarget {
  if ((query?.lat === undefined) !== (query?.lon === undefined)) throw new Error('Coordonnées incomplètes.');
  if (query?.lat !== undefined && query?.lon !== undefined) {
    if (!Number.isFinite(query.lat) || !Number.isFinite(query.lon) || Math.abs(query.lat) > 90 || Math.abs(query.lon) > 180) throw new Error('Coordonnées invalides.');
    const lat = query.lat;
    const lon = query.lon;
    const quickMatch = QUICK_WEATHER_LOCATIONS.find(
      (loc) => Math.abs(loc.latitude - lat) < 0.25 && Math.abs(loc.longitude - lon) < 0.25,
    );
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
    const countryMatch = AFRICAN_COUNTRIES.find(
      (c) => Math.abs(c.latitude - lat) < 1.0 && Math.abs(c.longitude - lon) < 1.0,
    );
    if (countryMatch) {
      return {
        locationName: `Point de référence · ${countryMatch.name}`,
        countryCode: countryMatch.code,
        countryName: countryMatch.name,
        region: countryMatch.region,
        latitude: lat,
        longitude: lon,
      };
    }
    return {
      locationName: 'Position sélectionnée',
      countryCode: 'AFR',
      countryName: 'Afrique',
      region: 'Continent africain',
      latitude: lat,
      longitude: lon,
    };
  }

  if (query?.code) {
    const code = query.code.trim().toUpperCase();
    const quickMatch = QUICK_WEATHER_LOCATIONS.find((loc) => loc.code === code);
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
    const country = getAfricanCountryByCode(code);
    if (country) {
      return {
        locationName: `Point de référence · ${country.name}`,
        countryCode: country.code,
        countryName: country.name,
        region: country.region,
        latitude: country.latitude,
        longitude: country.longitude,
      };
    }
  }

  if (query?.code) throw new Error('Pays météo invalide.');

  if (query?.city) {
    const search = normalizeText(query.city);
    const quickMatch = QUICK_WEATHER_LOCATIONS.find(
      (loc) => normalizeText(loc.city) === search || normalizeText(loc.countryName) === search,
    );
    if (quickMatch) {
      return {
        locationName: quickMatch.city,
        countryCode: quickMatch.code,
        countryName: quickMatch.countryName,
        region: quickMatch.region,
        latitude: quickMatch.latitude,
        longitude: quickMatch.longitude,
      };
    }
  }

  const defaultLocation = QUICK_WEATHER_LOCATIONS[0];
  return {
    locationName: defaultLocation.city,
    countryCode: defaultLocation.code,
    countryName: defaultLocation.countryName,
    region: defaultLocation.region,
    latitude: defaultLocation.latitude,
    longitude: defaultLocation.longitude,
  };
}
