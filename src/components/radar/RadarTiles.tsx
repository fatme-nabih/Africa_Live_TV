import type { CSSProperties, ReactNode } from 'react';
import { CloudSun, Newspaper, ShieldCheck, TriangleAlert, Tv } from 'lucide-react';
import { cn } from '@/components/ui';
import type { WeatherAlert } from '@/lib/weather-alert';

/**
 * Tuile cliquable. Son nom accessible est son texte visible (libellé, valeur, sous-texte), dans cet ordre, complété par du
 * texte réservé aux lecteurs d'écran (`.sr-after`, sans espace parasite) : ponctuation, `srValue` quand la valeur visible est un tiret, puis `srExtra` (périmètre,
 * réserve, destination). Le nom commence donc toujours par le texte affiché (règle label-content-name-mismatch, UX-605).
 */
/** Texte ajouté au nom accessible juste après le contenu de l'élément (classe .sr-after de globals.css). */
const srAfter = (text: string) => ({ '--sr-after': JSON.stringify(text) }) as CSSProperties;

function Tile({
  icon,
  label,
  shortLabel,
  value,
  srValue,
  sub,
  srExtra,
  tone = 'default',
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  value: ReactNode;
  srValue?: string;
  srExtra: string;
  sub?: string;
  tone?: 'default' | 'alert';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-w-0 flex-col items-start gap-1 rounded-card border bg-surface-1 p-2.5 text-left transition-colors duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:p-3.5',
        tone === 'alert' ? 'border-al-red/50' : 'border-line hover:border-line-gold',
      )}
    >
      <span className="sr-after flex max-w-full items-start gap-1.5 text-xs font-semibold leading-tight text-text-muted" style={srAfter(' :')}>
        <span aria-hidden="true" className={cn('mt-px shrink-0', tone === 'alert' ? 'text-al-red-soft' : 'text-al-gold')}>{icon}</span>
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </span>
      <span className="sr-after min-h-7 max-w-full text-text max-sm:min-h-[2lh]" style={srAfter(srValue ? `${srValue}.` : '.')}>
        {srValue ? <span aria-hidden="true">{value}</span> : value}
      </span>
      {/* Toujours présent et haut de 2 lignes sur mobile : l'arrivée des données ne décale plus la page (CLS). */}
      <span className="sr-after line-clamp-2 min-h-[2lh] max-w-full text-xs leading-snug text-text-muted sm:min-h-[1lh]" style={srAfter(sub ? '.' : '')}>
        {sub}
      </span>
      <span className="sr-only">{srExtra}</span>
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
        value={<span className={NUMBER}>{newsValue}</span>}
        srValue={news.ready ? undefined : 'chargement'}
        sub={newsSub}
        srExtra={`Voir le fil des dépêches (${scope})`}
        onClick={onOpenNews}
      />
      <Tile
        icon={<Tv className="h-4 w-4" />}
        label={channelsLabel}
        shortLabel="Chaînes en direct"
        value={<span className={NUMBER}>{channels ? channels.count : '—'}</span>}
        srValue={channels ? undefined : 'en cours de chargement'}
        sub={channels ? (channels.inBrowser > 0 ? `${channels.inBrowser} à regarder ici` : countryName ?? undefined) : undefined}
        srExtra={`Voir les chaînes (${scope})`}
        onClick={onOpenChannels}
      />
      {weather.state === 'ok' && weather.alert ? (
        <Tile
          tone="alert"
          icon={<TriangleAlert className="h-4 w-4" />}
          label="Alerte météo"
          shortLabel="Alerte météo"
          value={<span className="break-words text-base font-bold leading-tight sm:text-lg">{weather.alert.label}</span>}
          sub={`${weather.place} · ${weather.alert.detail}`}
          srExtra="Observation automatisée, pas une alerte officielle. Voir la météo"
          onClick={onOpenWeather}
        />
      ) : (
        <Tile
          icon={weather.state === 'ok' ? <ShieldCheck className="h-4 w-4" /> : <CloudSun className="h-4 w-4" />}
          label="Alerte météo"
          shortLabel="Alerte météo"
          value={<span className="break-words text-base font-bold leading-tight sm:text-lg">{weather.state === 'ok' ? 'Rien à signaler' : weather.state === 'error' ? 'Pas de relevé' : '—'}</span>}
          srValue={weather.state === 'loading' ? 'chargement' : undefined}
          sub={weather.state === 'ok' ? `${weather.place} · ${weather.summary}` : weather.place}
          srExtra={`${weather.state === 'error' ? 'Météo indisponible. ' : ''}Voir la météo`}
          onClick={onOpenWeather}
        />
      )}
    </section>
  );
}
