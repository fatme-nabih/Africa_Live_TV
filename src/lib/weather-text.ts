import type { Edition } from './editions';
import type { Dictionary } from '@/i18n/dictionary';
import { fr } from '@/i18n/fr';
import type { LiveWeatherCondition } from './live-weather-types';
import { countryName } from './country-names';

/** Libellé choisi par le code fournisseur, sans traduire les textes libres reçus. FR garde sa sortie historique. */
export function weatherText(condition: Pick<LiveWeatherCondition, 'weatherCode' | 'weatherDescription' | 'source'>, edition: Edition, labels: Dictionary['weather']['conditions'] = fr.weather.conditions): string {
  if (edition === 'fr') return condition.weatherDescription;
  const code = condition.weatherCode;
  let key: keyof typeof labels = 'unknown';
  if (condition.source === 'wttr.in') {
    if (code === 113) key = 'clear';
    else if (code === 116) key = 'partlyCloudy';
    else if ([119, 122].includes(code ?? -1)) key = 'cloudy';
    else if ([143, 248, 260].includes(code ?? -1)) key = 'fog';
    else if ([200, 386, 389, 392, 395].includes(code ?? -1)) key = 'storm';
    else if ([179, 227, 230, 323, 326, 329, 332, 335, 338, 350, 368, 371, 374, 377].includes(code ?? -1)) key = 'wttrSnow';
    else if ([176, 182, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 317, 320, 353, 356, 359, 362, 365].includes(code ?? -1)) key = 'wttrRain';
  } else {
    const keys: Record<number, keyof typeof labels> = { 0: 'clear', 1: 'mostlyClear', 2: 'partlyCloudy', 3: 'cloudy', 45: 'fog', 48: 'haze',
      51: 'drizzle', 53: 'drizzle', 55: 'drizzle', 56: 'freezingDrizzle', 57: 'freezingDrizzle', 61: 'lightRain', 63: 'rain', 65: 'heavyRain',
      66: 'freezingRain', 67: 'freezingRain', 71: 'snow', 73: 'snow', 75: 'snow', 77: 'snow', 80: 'showers', 81: 'showers', 82: 'showers',
      85: 'snowShowers', 86: 'snowShowers', 95: 'storm', 96: 'stormHail', 99: 'stormHail' };
    key = keys[code ?? -1] ?? 'unknown';
  }
  return labels[key];
}

/** Nom de ville rapide traduit par le dictionnaire ; inconnu → nom reçu (EDI-403). */
export function weatherCity(city: string, labels: Dictionary['weather'] = fr.weather): string {
  return (labels.cities as Record<string, string>)[city] ?? city;
}

const REFERENCE_POINT = 'Point de référence · ';

/**
 * Lieu affiché pour la météo. Le contrat serveur reste en français (« Point de référence · Algérie ») ; une autre édition
 * affiche le pays dans sa langue suivi de son libellé de point de référence, ou la ville traduite. FR garde la sortie historique.
 */
export function weatherPlace(locationName: string, countryCode: string, edition: Edition, labels: Dictionary['weather'] = fr.weather): string {
  if (edition === 'fr') return locationName;
  if (locationName.startsWith(REFERENCE_POINT)) return countryName(countryCode, edition) + labels.card.referencePoint;
  return weatherCity(locationName, labels);
}
