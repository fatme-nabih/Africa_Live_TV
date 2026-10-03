import { memo } from 'react';
import { ExternalLink, MapPin, Play } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ShareArticleLink } from '@/components/tv/ChannelTile';
import { editorialKind, EDITORIAL_LABELS, type EditorialKind } from '@/lib/radar-editorial';
import { formatRadarDate } from '@/lib/radar-data';
import { isNewSince } from '@/lib/radar-visit';
import { formatAgo } from '@/lib/relative-time';
import type { RadarArticle, RadarCountry } from '@/lib/live-osint-types';

// Une couleur = un rôle : vert pour la presse nationale, or pour le panafricain, neutre pour l'international.
const KIND_STYLE: Record<EditorialKind, string> = {
  national: 'border-al-green/40 bg-al-green/10 text-al-green',
  panafrican: 'border-line-gold bg-al-gold/10 text-al-gold',
  international: 'border-line bg-surface-2 text-text-muted',
};

/** Mémoïsée : un tic d'horloge ailleurs dans le Radar ne refait pas le rendu de toutes les lignes. */
export default memo(function ArticleRow({
  article,
  country,
  channelCount,
  now,
  since,
  onWatchCountry,
  onSelectCountry,
}: {
  article: RadarArticle;
  country?: RadarCountry;
  /** Chaînes référencées pour le pays de la dépêche : le bouton « Direct » n'apparaît que s'il y en a. */
  channelCount?: number;
  now: number;
  since: number | null;
  onWatchCountry?: (code: string) => void;
  onSelectCountry?: (code: string) => void;
}) {
  const kind = editorialKind(article);
  const ago = formatAgo(article.indexedAt, now);
  const countryName = country?.name ?? 'Pays non précisé';
  return (
    <div className="group px-4 py-3.5 transition hover:bg-surface-2/60 sm:px-5">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <Badge variant="info" className={KIND_STYLE[kind]}>{article.sourceName ?? article.domain}</Badge>
        {article.category && <span className="rounded-pill border border-line px-2 py-0.5">{article.category}</span>}
        {isNewSince(article, since) && <Badge variant="live" className="py-0">Nouveau</Badge>}
        <span aria-hidden="true">·</span>
        {article.countryCode ? (
          <button
            type="button"
            onClick={() => onSelectCountry?.(article.countryCode!)}
            className="rounded px-1 transition hover:bg-al-gold/10 hover:text-al-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold"
            title={`Voir les dépêches : ${countryName}`}
          >
            {countryName}
          </button>
        ) : (
          <span>{countryName}</span>
        )}
        <time dateTime={article.indexedAt} title={formatRadarDate(article.indexedAt)} className="ml-auto tabular-nums">
          {ago || formatRadarDate(article.indexedAt)}
        </time>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-[13px] font-semibold leading-5 text-text transition focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold sm:text-sm"
      >
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-text-muted group-hover:text-al-gold" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          {country && <MapPin aria-hidden="true" className="h-3 w-3" />}
          {country ? country.region : EDITORIAL_LABELS[kind]}
        </span>
        <div className="flex items-center gap-1">
          {article.countryCode && channelCount !== undefined && channelCount > 0 && (
            <button
              type="button"
              onClick={() => onWatchCountry?.(article.countryCode!)}
              aria-label={`Regarder le direct : ${countryName}`}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line-gold bg-al-gold/10 px-2.5 text-xs font-semibold text-al-gold transition hover:bg-al-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
            >
              <Play aria-hidden="true" className="h-3 w-3 fill-current" />
              Direct
            </button>
          )}
          <ShareArticleLink title={article.title} sourceName={article.sourceName ?? undefined} url={article.url} />
        </div>
      </div>
    </div>
  );
});
