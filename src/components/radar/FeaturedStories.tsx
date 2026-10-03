'use client';

import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { Badge, Button, cn, Skeleton } from '@/components/ui';
import { ShareArticleLink } from '@/components/tv/ChannelTile';
import { useEcoMode } from '@/components/tv/hooks';
import { fallbackTone } from '@/lib/channel-fallback';
import { editorialKind, EDITORIAL_LABELS } from '@/lib/radar-editorial';
import { isNewSince } from '@/lib/radar-visit';
import { formatAgo } from '@/lib/relative-time';
import { formatRadarDate } from '@/lib/radar-data';
import type { RadarArticle, RadarCountry } from '@/lib/live-osint-types';

/**
 * Illustration de l'éditeur. Elle est chargée directement par le navigateur depuis l'adresse publiée dans le flux :
 * Africa Live ne la télécharge, ne la convertit ni ne la stocke. Sans image (ou en mode Éco data, ou si elle ne
 * charge pas), le repli typographique prend la place : aucune carte vide.
 */
function StoryArt({ article, className }: { article: RadarArticle; className: string }) {
  const eco = useEcoMode();
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(article.imageUrl) && !failed && !eco;
  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br', fallbackTone(article.countryCode), className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- image de l'éditeur : chargée par le navigateur, jamais relayée ni stockée
        <img
          src={article.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-display text-5xl font-bold uppercase tracking-tight text-text/10">
          {(article.sourceName || article.domain).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3)}
        </span>
      )}
    </div>
  );
}

function StoryMeta({ article, now, since }: { article: RadarArticle; now: number; since: number | null }) {
  const ago = formatAgo(article.indexedAt, now);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
      <span className="font-semibold text-text">{article.sourceName ?? article.domain}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={article.indexedAt} title={formatRadarDate(article.indexedAt)}>{ago || formatRadarDate(article.indexedAt)}</time>
      {isNewSince(article, since) && <Badge variant="live" className="py-0">Nouveau</Badge>}
    </div>
  );
}

export default function FeaturedStories({
  className = '',
  loading,
  stories,
  countryName,
  countries,
  channelCounts,
  now,
  since,
  onWatchCountry,
}: {
  className?: string;
  /** Dépêches pas encore arrivées : un gabarit de même taille évite le saut de mise en page. */
  loading: boolean;
  stories: RadarArticle[];
  /** Pays affiché (filtre), ou `null` pour toute l'Afrique. */
  countryName: string | null;
  countries: RadarCountry[];
  channelCounts: Record<string, number>;
  now: number;
  since: number | null;
  onWatchCountry: (code: string) => void;
}) {
  if (stories.length === 0) {
    return (
      <section aria-labelledby="radar-une" className={className}>
        <h2 id="radar-une" className="mb-2.5 font-display text-lg font-bold text-text sm:text-xl">À la une</h2>
        {loading ? (
          <div role="status" aria-label="Chargement des dépêches à la une" className="space-y-3">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
        ) : (
          <p className="rounded-card border border-line bg-surface-1 p-5 text-sm text-text-muted">
            Pas de dépêche récente pour {countryName ?? 'cette vue'}. Essayez une autre rubrique ou un autre pays.
          </p>
        )}
      </section>
    );
  }
  const [lead, ...others] = stories;
  const leadCountry = countries.find(country => country.code === lead.countryCode);
  const canWatchLead = Boolean(lead.countryCode && (channelCounts[lead.countryCode] ?? 0) > 0);
  return (
    <section aria-labelledby="radar-une" className={className}>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="radar-une" className="font-display text-lg font-bold text-text sm:text-xl">À la une</h2>
        <p className="text-xs text-text-muted">{countryName ?? 'Toute l’Afrique'} · les plus récentes</p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 xl:grid-cols-1">
        <article className="relative flex flex-col overflow-hidden rounded-card border border-line-gold bg-surface-1 lg:col-span-3 xl:col-span-1">
          <StoryArt article={lead} className="aspect-video max-h-56 w-full sm:max-h-64" />
          <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
            <StoryMeta article={lead} now={now} since={since} />
            <h3 className="text-base font-bold leading-snug text-text sm:text-lg">
              <a
                href={lead.url}
                target="_blank"
                rel="noopener noreferrer"
                className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-al-gold focus-visible:after:rounded-card"
              >
                {lead.title}
                <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3.5 w-3.5 text-text-muted" />
              </a>
            </h3>
            <p className="text-xs text-text-muted">
              {EDITORIAL_LABELS[editorialKind(lead)]}{leadCountry ? ` · ${leadCountry.name}` : ''}
            </p>
            <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
              {canWatchLead && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onWatchCountry(lead.countryCode!)}
                  aria-label={`Regarder le direct du pays : ${leadCountry?.name ?? lead.countryCode}`}
                  icon={<Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />}
                >
                  Regarder le direct du pays
                </Button>
              )}
              <ShareArticleLink title={lead.title} sourceName={lead.sourceName ?? undefined} url={lead.url} />
            </div>
          </div>
        </article>
        <div className="flex flex-col gap-3 lg:col-span-2 xl:col-span-1">
          {others.map(story => {
            const country = countries.find(item => item.code === story.countryCode);
            return (
              <article key={story.url} className="relative flex flex-1 gap-3 overflow-hidden rounded-card border border-line bg-surface-1 p-3 transition hover:border-line-gold">
                {story.imageUrl && (
                  <StoryArt article={story} className="hidden size-20 shrink-0 rounded-control sm:block sm:size-24" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <StoryMeta article={story} now={now} since={since} />
                  <h3 className="line-clamp-4 text-base font-semibold leading-snug text-text">
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-al-gold focus-visible:after:rounded-card"
                    >
                      {story.title}
                      <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-text-muted" />
                    </a>
                  </h3>
                  <div className="relative z-10 mt-auto flex flex-wrap items-center gap-1 pt-0.5">
                    <span className="text-xs text-text-muted">{country?.name ?? EDITORIAL_LABELS[editorialKind(story)]}</span>
                    <span className="ml-auto flex items-center gap-1">
                      {story.countryCode && (channelCounts[story.countryCode] ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => onWatchCountry(story.countryCode!)}
                          aria-label={`Regarder le direct : ${country?.name ?? story.countryCode}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line-gold bg-al-gold/10 px-2.5 text-xs font-semibold text-al-gold transition hover:bg-al-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                        >
                          <Play aria-hidden="true" className="h-3 w-3 fill-current" />
                          Direct
                        </button>
                      )}
                      <ShareArticleLink title={story.title} sourceName={story.sourceName ?? undefined} url={story.url} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
