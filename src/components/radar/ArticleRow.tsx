import { memo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge, cn } from '@/components/ui';
import { ShareArticleLink } from '@/components/tv/ChannelTile';
import { editorialKind, type EditorialKind } from '@/lib/radar-editorial';
import { formatRadarDate } from '@/lib/radar-data';
import { formatRadarClock } from '@/lib/radar-time-groups';
import { isNewSince } from '@/lib/radar-visit';
import { formatAgo } from '@/lib/relative-time';
import type { RadarArticle, RadarCountry } from '@/lib/live-osint-types';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

// Une couleur = un rôle : vert pour la presse nationale, or pour le panafricain, neutre pour l'international (simple point, R2).
const KIND_DOT: Record<EditorialKind, string> = {
  national: 'bg-al-green',
  panafrican: 'bg-al-gold',
  international: 'bg-text-muted',
};

/**
 * Ligne de fil au format agence (lot R2) : heure à gauche, titre, puis une seule ligne source · rubrique · pays.
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
  const { t, edition } = useI18n();
  const kind = editorialKind(article);
  const clock = formatRadarClock(article.indexedAt, now, edition);
  const ago = formatAgo(article.indexedAt, now, t.time.ago);
  return (
    <div className="group flex gap-3 px-4 py-3 transition hover:bg-surface-2/60 sm:gap-4 sm:px-5">
      <time
        dateTime={article.indexedAt}
        title={`${ago ? `${ago} · ` : ''}${formatRadarDate(article.indexedAt, edition, t.time)}`}
        className="w-10 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-text-muted"
      >
        {clock}
        {ago && <span className="sr-only"> ({ago})</span>}
      </time>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block min-w-0 flex-1 [unicode-bidi:plaintext] text-[13px] font-semibold leading-5 text-text transition group-hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold sm:text-sm"
          >
            {article.title}
            <ExternalLink aria-hidden="true" className="rtl:-scale-x-100 ms-1.5 inline h-3 w-3 text-text-muted opacity-60 group-hover:text-al-gold group-hover:opacity-100" />
          </a>
          <span className="-me-2 -mt-2">
            <ShareArticleLink compact title={article.title} sourceName={article.sourceName ?? undefined} url={article.url} />
          </span>
        </div>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-muted">
          <span className="inline-flex min-w-0 items-center gap-1.5" title={t.radar.editorial[kind]}>
            <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', KIND_DOT[kind])} />
            <span className="truncate font-medium text-text/80"><bdi>{article.sourceName ?? article.domain}</bdi></span>
          </span>
          {article.category && (
            <>
              <span aria-hidden="true">·</span>
              <span className="max-w-[12rem] truncate">{article.category}</span>
            </>
          )}
          {article.countryCode && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => onSelectCountry?.(article.countryCode!)}
                className="rounded px-0.5 transition hover:text-al-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold"
                title={format(t.radar.row.countryNews, { name: country?.name ?? article.countryCode })}
              >
                {country?.name ?? article.countryCode}
              </button>
            </>
          )}
          {isNewSince(article, since) && <Badge variant="live" className="ms-0.5 py-0">{t.radar.row.new}</Badge>}
        </div>
      </div>
    </div>
  );
});
