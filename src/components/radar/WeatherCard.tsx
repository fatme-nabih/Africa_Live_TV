import { ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Compass, Droplets, Moon, Sun, Wind } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { QUICK_WEATHER_LOCATIONS } from '@/lib/weather-locations';
import type { LiveWeatherSnapshot, WeatherIconType } from '@/lib/live-weather-types';

function WeatherIconDisplay({ icon, isDay }: { icon: WeatherIconType; isDay: boolean | null }) {
  const size = 'h-6 w-6';
  if (isDay === null || icon === 'unknown') return <Cloud aria-hidden="true" className={`${size} text-text`} />;
  switch (icon) {
    case 'clear':
      return isDay ? <Sun aria-hidden="true" className={`${size} text-al-gold`} /> : <Moon aria-hidden="true" className={`${size} text-text-muted`} />;
    case 'partly-cloudy':
      return <CloudSun aria-hidden="true" className={`${size} text-text`} />;
    case 'cloudy':
      return <Cloud aria-hidden="true" className={`${size} text-text`} />;
    case 'rain':
      return <CloudRain aria-hidden="true" className={`${size} text-text`} />;
    case 'storm':
      return <CloudLightning aria-hidden="true" className={`${size} text-al-red-soft`} />;
    case 'fog':
      return <CloudFog aria-hidden="true" className={`${size} text-text-muted`} />;
    default:
      return <CloudSun aria-hidden="true" className={`${size} text-text`} />;
  }
}

function Metric({ icon, label, value, unit, detail }: { icon: React.ReactNode; label: string; value: React.ReactNode; unit?: string; detail?: string }) {
  return (
    <div className="rounded-control border border-line bg-surface-2/60 p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
        <span aria-hidden="true" className="text-al-gold">{icon}</span>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums text-text">
        {value}{unit && <span className="ml-1 text-xs font-normal text-text-muted">{unit}</span>}
      </div>
      {detail && <div className="text-xs text-text-muted">{detail}</div>}
    </div>
  );
}

export default function WeatherCard({
  weather,
  weatherError,
  weatherLoading,
  retryBlocked,
  activeWeatherCode,
  open,
  onOpenChange,
  onSelectCountry,
  onRetry,
}: {
  weather: LiveWeatherSnapshot | null;
  weatherError: string | null;
  weatherLoading: boolean;
  retryBlocked: boolean;
  activeWeatherCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCountry: (code: string | null) => void;
  onRetry: () => void;
}) {
  const place = weather?.current.locationName ?? (AFRICAN_COUNTRIES.find(country => country.code === activeWeatherCode)?.name ?? 'Dakar');
  return (
    <article id="radar-meteo" className="relative scroll-mt-20 overflow-hidden rounded-card border border-line bg-surface-1">
      <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-gold bg-al-gold/10 text-al-gold">
            <CloudSun className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-text">
              Météo locale
              <span className="font-normal text-text-faint" aria-hidden="true">·</span>
              <span className="truncate">{place}</span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {open
                ? (weather ? `Observation · ${weather.current.source} · ${weather.current.transport === 'browser' ? 'navigateur' : 'serveur'}` : 'Observation au lieu sélectionné')
                : weather ? `${weather.current.temperatureC} °C, ${weather.current.weatherDescription.toLowerCase()}` : 'Météo repliée'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {open && (weather?.stale ? (
            <span className="rounded-pill border border-line-gold bg-al-gold/10 px-2.5 py-0.5 text-xs font-semibold text-text">Relevé conservé · périmé</span>
          ) : weather ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill border border-al-green/30 bg-al-green/10 px-2.5 py-0.5 text-xs font-semibold text-al-green">
              <span className="live-dot" aria-hidden="true" />
              {weather.availability[0].status === 'partial' ? 'Données partielles' : 'Relevé récent'}
            </span>
          ) : null)}
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls="radar-meteo-corps"
            aria-label={open ? 'Replier la météo' : 'Déplier la météo'}
            onClick={() => onOpenChange(!open)}
            icon={<ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />}
          >
            {open ? 'Replier' : 'Déplier'}
          </Button>
        </div>
      </div>

      <div id="radar-meteo-corps" hidden={!open}>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-2.5 sm:px-5">
          <select
            id="weather-country-select"
            aria-label="Choisir le pays ou la ville pour la météo"
            value={activeWeatherCode}
            onChange={event => onSelectCountry(event.target.value)}
            className="min-h-11 rounded-control border border-line bg-surface-2 px-2.5 text-xs font-medium text-text hover:border-line-gold focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold/50"
          >
            <optgroup label={`Pays et territoires africains (${AFRICAN_COUNTRIES.length})`}>
              {[...AFRICAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map(country => {
                const city = QUICK_WEATHER_LOCATIONS.find(location => location.code === country.code);
                return (
                  <option key={country.code} value={country.code} className="bg-surface-2 text-text">
                    {country.name} ({country.code}){city ? ` · ${city.city}` : ' · point de référence'}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </div>

        <div aria-label="Villes rapides" className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line bg-black/40 px-4 py-2 text-xs sm:px-5">
          {(weather?.quickLocations && weather.quickLocations.length > 0 ? weather.quickLocations : QUICK_WEATHER_LOCATIONS).map(location => {
            const isActive = activeWeatherCode === location.code;
            return (
              <button
                key={location.code}
                type="button"
                onClick={() => onSelectCountry(location.code)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold transition-colors',
                  isActive ? 'border-al-gold bg-al-gold/10 text-text' : 'border-transparent bg-surface-2 text-text-muted hover:border-line hover:text-text',
                )}
              >
                <span>{location.city}</span>
                <span className="font-mono text-xs text-text-muted">{location.code}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-5">
          {weatherError && weather && <p role="status" className="mb-3 text-xs text-text">{weatherError} · Relevé conservé jusqu’à expiration.</p>}
          {weather?.current.timeAnomaly && <p className="mb-3 text-xs text-text">Horodatage amont légèrement futur.</p>}
          {weatherError && !weather ? (
            <div className="rounded-control border border-line-gold bg-al-gold/[0.05] p-4 text-xs text-text/90">
              <p>{weatherError}</p>
              <button type="button" onClick={() => onRetry()} className="mt-2 min-h-9 font-bold text-text underline underline-offset-4">
                {retryBlocked ? 'Réessayer après le délai' : 'Réessayer'}
              </button>
            </div>
          ) : weatherLoading && !weather ? (
            <div className="space-y-3" aria-label="Chargement de la météo">
              <div className="skeleton h-16 rounded-control" />
              <div className="skeleton h-12 rounded-control" />
            </div>
          ) : weather ? (
            <div className="space-y-3">
              <div className="flex flex-col justify-between gap-3 rounded-control border border-line bg-surface-2/60 p-3.5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-1">
                    <WeatherIconDisplay icon={weather.current.weatherIcon} isDay={weather.current.isDay} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold tracking-tight text-text tabular-nums">{weather.current.temperatureC}°C</span>
                      <span className="text-xs font-semibold text-text-muted">Ressenti {weather.current.apparentTemperatureC}°C</span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-text">{weather.current.weatherDescription}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-sm font-bold text-text">{weather.current.locationName}</div>
                  <div className="text-xs text-text-muted">{weather.current.countryName} · {weather.current.region}</div>
                  <div className="mt-1 font-mono text-xs text-text-muted">{weather.current.timezone ?? 'Fuseau inconnu'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric icon={<Wind className="h-3 w-3" />} label="Vent" value={weather.current.windSpeedKmh} unit="km/h" detail={`${weather.current.windDirectionCompass} (${weather.current.windDirectionDeg}°)`} />
                <Metric icon={<Droplets className="h-3 w-3" />} label="Humidité" value={weather.current.relativeHumidityPercent} unit="%" detail="Hygrométrie" />
                <Metric icon={<CloudRain className="h-3 w-3" />} label="Pluie" value={weather.current.precipitationMm} unit="mm" detail="Précipitations" />
                <Metric
                  icon={<Compass className="h-3 w-3" />}
                  label="Relevé"
                  value={<span className="font-mono text-xs">{weather.current.observedAt ? new Intl.DateTimeFormat('fr-FR', { timeZone: weather.current.timezone ?? 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(weather.current.observedAt)) : 'Date d’observation inconnue'}</span>}
                  detail={weather.current.timezone ? 'Heure locale' : 'UTC · fuseau du lieu inconnu'}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line bg-black/40 px-4 py-2.5 text-xs leading-4 text-text-muted sm:px-5">
          <a
            href={weather?.current.source === 'wttr.in' ? 'https://wttr.in/' : 'https://open-meteo.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-al-gold underline underline-offset-2 hover:text-text"
          >
            {weather?.current.attribution ?? 'Fournisseurs météo'}
          </a>{' '}
          · Relevé d’observation automatisé, sans valeur d’alerte officielle de protection civile.
        </div>
      </div>
    </article>
  );
}
