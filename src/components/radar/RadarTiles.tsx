import type { ReactNode } from 'react';
import { CloudSun, Newspaper, ShieldCheck, TriangleAlert, Tv } from 'lucide-react';
import { cn } from '@/components/ui';
import type { WeatherAlert } from '@/lib/weather-alert';

function Tile({
  icon,
  label,
  shortLabel,
  ariaLabel,
  value,
  sub,
  tone = 'default',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  ariaLabel: string;
  value: ReactNode;
  sub?: string;
  tone?: 'default' | 'alert';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'group flex min-w-0 flex-col items-start gap-1 rounded-card border bg-surface-1 p-2.5 text-left transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:p-3.5',
        tone === 'alert' ? 'border-al-red/50' : 'border-line hover:border-line-gold',
      )}
    >
      <span className="flex max-w-full items-start gap-1.5 text-xs font-semibold leading-tight text-text-muted">
        <span aria-hidden="true" className={cn('mt-px shrink-0', tone === 'alert' ? 'text-al-red-soft' : 'text-al-gold')}>{icon}</span>
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span className="min-h-7 max-w-full text-text">{value}</span>
      {sub && <span className="line-clamp-2 max-w-full text-xs leading-snug text-text-muted">{sub}</span>}
    </button>
  );
}

const NUMBER = 'font-display text-xl font-bold leading-tight tabular-nums sm:text-2xl';

export default function RadarTiles({
  countryName,
  news,
  channels,
  weather,
  onOpenNews,
  onOpenChannels,
  onOpenWeather,
}: {
  countryName: string | null;
  /** `count` : nouvelles depuis la visite, ou `null` à la première visite (on montre alors les 24 h). */
  news: { ready: boolean; count: number | null; total: number; sinceLabel: string | null };
  channels: { ready: boolean; count: number; inBrowser: number } | null;
  weather: { state: 'loading' | 'error' | 'ok'; alert: WeatherAlert | null; place: string; summary: string };
  onOpenNews: () => void;
  onOpenChannels: () => void;
  onOpenWeather: () => void;
}) {
  const scope = countryName ?? 'toute l’Afrique';
  const newsValue = !news.ready ? '—' : news.count ?? news.total;
  const newsLabel = news.count === null ? 'Dépêches des dernières 24 h' : 'Nouvelles depuis votre visite';
  const newsSub = !news.ready ? undefined : news.count === null ? 'Bienvenue sur le Radar' : news.sinceLabel ?? undefined;
  const channelsLabel = countryName ? 'Chaînes en direct du pays' : 'Chaînes en direct d’Afrique';
  return (
    <section aria-label="Repères du moment" className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      <Tile
        icon={<Newspaper className="h-4 w-4" />}
        label={newsLabel}
        shortLabel={news.count === null ? 'Dépêches 24 h' : 'Nouvelles'}
        ariaLabel={`${newsLabel} : ${newsValue}. Voir le fil des dépêches (${scope})`}
        value={<span className={NUMBER}>{newsValue}</span>}
        sub={newsSub}
        onClick={onOpenNews}
      />
      <Tile
        icon={<Tv className="h-4 w-4" />}
        label={channelsLabel}
        shortLabel="Chaînes en direct"
        ariaLabel={`${channelsLabel} : ${channels ? channels.count : 'en cours de chargement'}. Voir les chaînes (${scope})`}
        value={<span className={NUMBER}>{channels ? channels.count : '—'}</span>}
        sub={channels ? (channels.inBrowser > 0 ? `${channels.inBrowser} dans le navigateur` : countryName ?? undefined) : undefined}
        onClick={onOpenChannels}
      />
      {weather.state === 'ok' && weather.alert ? (
        <Tile
          tone="alert"
          icon={<TriangleAlert className="h-4 w-4" />}
          label="Alerte météo"
          shortLabel="Alerte météo"
          ariaLabel={`Alerte météo : ${weather.alert.label}, ${weather.place}. Observation automatisée, pas une alerte officielle. Voir la météo`}
          value={<span className="break-words text-base font-bold leading-tight sm:text-lg">{weather.alert.label}</span>}
          sub={`${weather.place} · ${weather.alert.detail}`}
          onClick={onOpenWeather}
        />
      ) : (
        <Tile
          icon={weather.state === 'ok' ? <ShieldCheck className="h-4 w-4" /> : <CloudSun className="h-4 w-4" />}
          label="Alerte météo"
          shortLabel="Alerte météo"
          ariaLabel={`Alerte météo : ${weather.state === 'ok' ? 'rien à signaler' : weather.state === 'error' ? 'météo indisponible' : 'chargement'}, ${weather.place}. Voir la météo`}
          value={<span className="break-words text-base font-bold leading-tight sm:text-lg">{weather.state === 'ok' ? 'Rien à signaler' : weather.state === 'error' ? 'Pas de relevé' : '—'}</span>}
          sub={weather.state === 'ok' ? `${weather.place} · ${weather.summary}` : weather.place}
          onClick={onOpenWeather}
        />
      )}
    </section>
  );
}
