'use client';
import { weatherCity, weatherPlace, weatherText } from '@/lib/weather-text';
import { countryName } from '@/lib/country-names';
import { ChevronDown, Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, Moon, Sun, Wind } from 'lucide-react';
import { Button, cn } from '@/components/ui';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { QUICK_WEATHER_LOCATIONS } from '@/lib/weather-locations';
import type { LiveWeatherSnapshot, WeatherIconType } from '@/lib/live-weather-types';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';
import { collator, dateTimeFormat, intlLanguage, intlLocale } from '@/i18n/format';

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
        {value}{unit && <span className="ms-1 text-xs font-normal text-text-muted">{unit}</span>}
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
  const { t, edition } = useI18n();
  const labels = t.weather.card;
  const place = weather ? weatherPlace(weather.current.locationName, weather.current.countryCode, edition, t.weather) : (countryName(activeWeatherCode, edition) ?? labels.defaultPlace);
  return (
    <article id="radar-meteo" className="relative scroll-mt-20 overflow-hidden rounded-card border border-line bg-surface-1">
      <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 inset-x-0 opacity-80" />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-gold bg-al-gold/10 text-al-gold">
            <CloudSun className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold text-text">
              {labels.title}
              <span className="font-normal text-text-faint" aria-hidden="true">·</span>
              <span className="truncate">{place}</span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {open
                ? labels.current
                : weather ? format(labels.summary, { temperature: weather.current.temperatureC, description: weatherText(weather.current, edition, t.weather.conditions).toLocaleLowerCase(intlLocale(edition)) }) : labels.folded}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {open && weather?.stale && (
            <span className="rounded-pill border border-line-gold bg-al-gold/10 px-2.5 py-0.5 text-xs font-semibold text-text">{labels.stale}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            aria-controls="radar-meteo-corps"
            aria-label={open ? labels.foldAria : labels.unfoldAria}
            onClick={() => onOpenChange(!open)}
            icon={<ChevronDown aria-hidden="true" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />}
          >
            {open ? labels.fold : labels.unfold}
          </Button>
        </div>
      </div>

      <div id="radar-meteo-corps" hidden={!open}>
        {/* Un seul bandeau de choix (R3) : la liste de tous les pays, puis les villes rapides qui défilent à côté. */}
        <div className="flex items-center gap-2 border-t border-line bg-black/40 py-2 ps-4 sm:ps-5">
          <select
            id="weather-country-select"
            aria-label={labels.selectAria}
            value={activeWeatherCode}
            onChange={event => onSelectCountry(event.target.value)}
            className="min-h-11 w-32 shrink-0 rounded-control border border-line bg-surface-2 px-2 text-xs font-medium text-text hover:border-line-gold focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold/50 sm:w-40"
          >
            <optgroup label={format(labels.group, { count: AFRICAN_COUNTRIES.length })}>
              {[...AFRICAN_COUNTRIES].sort((a, b) => collator(intlLanguage(edition)).compare(a.name, b.name)).map(country => {
                const city = QUICK_WEATHER_LOCATIONS.find(location => location.code === country.code);
                return (
                  <option key={country.code} value={country.code} className="bg-surface-2 text-text">
                    {countryName(country.code, edition)} ({country.code}){city ? ` · ${weatherCity(city.city, t.weather)}` : labels.referencePoint}
                  </option>
                );
              })}
            </optgroup>
          </select>
          <div aria-label={labels.quickCities} className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto pe-4 text-xs sm:pe-5">
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
                <span>{weatherCity(location.city, t.weather)}</span>
                <span className="font-mono text-xs text-text-muted">{location.code}</span>
              </button>
            );
          })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {weatherError && weather && <p role="status" className="mb-3 text-xs text-text-muted">{labels.lastKnown}</p>}
          {weatherError && !weather ? (
            <div className="rounded-control border border-line-gold bg-al-gold/[0.05] p-4 text-xs text-text/90">
              <p>{weatherError}</p>
              <button type="button" onClick={() => onRetry()} className="mt-2 min-h-9 font-bold text-text underline underline-offset-4">
                {retryBlocked ? labels.retryLater : labels.retry}
              </button>
            </div>
          ) : weatherLoading && !weather ? (
            <div className="space-y-3" aria-label={labels.loading}>
              <div className="skeleton h-16 rounded-control" />
              <div className="skeleton h-12 rounded-control" />
            </div>
          ) : weather ? (
            <div className="space-y-3">
              <div className="rounded-control border border-line bg-surface-2/60 p-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-1">
                    <WeatherIconDisplay icon={weather.current.weatherIcon} isDay={weather.current.isDay} />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-3xl font-bold tracking-tight text-text tabular-nums">{weather.current.temperatureC}°C</span>
                      <span className="text-xs font-semibold text-text-muted">{format(labels.feelsLike, { temperature: weather.current.apparentTemperatureC })}</span>
                    </div>
                    {/* La ville est déjà dans le titre : seuls le pays et la région la situent ici. */}
                    <p className="mt-0.5 text-xs text-text-muted">
                      <span className="font-semibold text-text">{weatherText(weather.current, edition, t.weather.conditions)}</span> · {countryName(weather.current.countryCode, edition)}
                      {weather.current.observedAt && <> · {dateTimeFormat(intlLocale(edition), { timeZone: weather.current.timezone ?? 'UTC', hour: '2-digit', minute: '2-digit' }).format(new Date(weather.current.observedAt))}</>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Metric icon={<Wind className="h-3 w-3" />} label={labels.wind} value={weather.current.windSpeedKmh} unit={labels.kmh} detail={weather.current.windDirectionCompass} />
                <Metric icon={<Droplets className="h-3 w-3" />} label={labels.humidity} value={weather.current.relativeHumidityPercent} unit="%" />
                <Metric icon={<CloudRain className="h-3 w-3" />} label={labels.rain} value={weather.current.precipitationMm} unit={labels.mm} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line px-4 py-2.5 text-xs leading-4 text-text-muted sm:px-5">
          <a
            href={weather?.current.source === 'wttr.in' ? 'https://wttr.in/' : 'https://open-meteo.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-text"
          >
            {format(labels.source, { source: weather?.current.source === 'wttr.in' ? 'wttr.in' : 'Open-Meteo' })}
          </a>{' '}
          {labels.disclaimer}
        </div>
      </div>
    </article>
  );
}
