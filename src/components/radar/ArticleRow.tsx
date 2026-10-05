import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ShareArticleLink } from '@/components/tv/ChannelTile';
import { editorialKind, type EditorialKind } from '@/lib/radar-editorial';
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

/**
 * Mémoïsée : un tic d'horloge ailleurs dans le Radar ne refait pas le rendu de toutes les lignes.
 * Pas de bouton « Direct » par dépêche : il lançait une chaîne quelconque du pays, sans lien avec l'article (R1).
 */
export default memo(function ArticleRow({
  article,
  country,
  now,
  since,
  onSelectCountry,
}: {
  article: RadarArticle;
  country?: RadarCountry;
  now: number;
  since: number | null;
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
      {/* Le pays est déjà dans la ligne d'en-tête : plus de ligne « région », le partage rejoint le titre. */}
      <div className="flex items-start justify-between gap-2">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block min-w-0 flex-1 text-[13px] font-semibold leading-5 text-text transition focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold sm:text-sm"
        >
          {article.title}
          <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-text-muted group-hover:text-al-gold" />
        </a>
        <span className="-mr-2 -mt-2 shrink-0">
          <ShareArticleLink title={article.title} sourceName={article.sourceName ?? undefined} url={article.url} />
        </span>
      </div>
    </div>
  );
});
