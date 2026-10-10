import { useMemo, useState } from 'react';
import { Newspaper, Play, Search, X } from 'lucide-react';
import ArticleRow from '@/components/radar/ArticleRow';
import { Button, Chip, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { canonicalArticleUrl } from '@/lib/radar-data';
import { groupByTime, RADAR_TIME_GROUP_LABELS } from '@/lib/radar-time-groups';
import { articleTopics, matchesRadarQuery, RADAR_TOPICS, type RadarTopic } from '@/lib/radar-topics';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { RadarArticle, RadarCountry } from '@/lib/live-osint-types';
import type { ScopeCounts, ScopeTab } from '@/lib/radar-articles';
import type { RadarRssSnapshot } from '@/lib/rss-collector-types';
import { countLabel } from '@/lib/format';

const COUNTRY_NAMES = new Map(AFRICAN_COUNTRIES.map(country => [country.code, country.name]));

// Près de 170 dépêches sur 24 h : on en montre 12 à la fois, le reste à la demande (page courte, DOM léger sur mobile modeste).
const PAGE_SIZE = 12;

/** À monter avec `key` = pays + rubrique : la pagination repart de zéro quand la vue change. */
export default function NewsFeed({
  rss,
  newsError,
  activeCountry,
  channelsSummary,
  scopeTab,
  tabCounts,
  total,
  shown,
  rows,
  unknownDate,
  now,
  since,
  onScopeChange,
  onSelectCountry,
  onWatchCountry,
  onRetry,
}: {
  rss: RadarRssSnapshot | null;
  newsError: string | null;
  activeCountry: RadarCountry | null;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  scopeTab: ScopeTab;
  tabCounts: ScopeCounts;
  /** Dépêches de la vue courante, « À la une » comprises. */
  total: number;
  /** Toutes les dépêches de la vue, « À la une » comprises : base de la recherche et des rubriques. */
  shown: RadarArticle[];
  /** Suite du fil, sans les dépêches déjà à la une. */
  rows: RadarArticle[];
  unknownDate: RadarArticle[];
  now: number;
  since: number | null;
  onScopeChange: (scope: ScopeTab) => void;
  onSelectCountry: (code: string | null) => void;
  onWatchCountry: (code: string) => void;
  onRetry: () => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Recherche et rubrique (R4) : appliquées côté navigateur, sur toutes les dépêches de la vue (y compris celles à la une).
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<RadarTopic | null>(null);
  const filtering = query.trim() !== '' || topic !== null;
  const topicsByUrl = useMemo(
    () => new Map([...shown, ...unknownDate].map(article => [article.url, articleTopics(article)])),
    [shown, unknownDate],
  );
  const topicCounts = useMemo(() => {
    const counts = new Map<RadarTopic, number>();
    for (const article of shown) for (const id of topicsByUrl.get(article.url) ?? []) counts.set(id, (counts.get(id) ?? 0) + 1);
    return counts;
  }, [shown, topicsByUrl]);
  const matches = (article: RadarArticle) =>
    (!topic || (topicsByUrl.get(article.url) ?? []).includes(topic))
    && matchesRadarQuery(article, query, article.countryCode ? COUNTRY_NAMES.get(article.countryCode) : undefined);
  const listed = filtering ? shown.filter(matches) : rows;
  const listedUndated = filtering ? unknownDate.filter(matches) : unknownDate;
  const resetFilters = () => {
    setQuery('');
    setTopic(null);
    setLimit(PAGE_SIZE);
  };
  // Seul point d'entrée vers la TV depuis le fil : un pays choisi, une chaîne de ce pays (jamais présentée comme le direct d'un article).
  const countryChannelCount = activeCountry ? (channelsSummary?.countries[activeCountry.code]?.channelCount ?? 0) : 0;
  const liveEditorials = rss?.availability?.filter(source => source.status === 'available' || source.status === 'empty').length ?? rss?.sources.length;
  const row = (article: RadarArticle) => (
    <ArticleRow
      key={canonicalArticleUrl(article.url)}
      article={article}
      country={AFRICAN_COUNTRIES.find(country => country.code === article.countryCode)}
      now={now}
      since={since}
      onSelectCountry={onSelectCountry}
    />
  );
  return (
    <>
      <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-text">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-al-gold/10 text-al-gold">
                <Newspaper aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              Fil des dépêches
            </div>
            <p className="mt-0.5 text-xs text-text-muted">
              {activeCountry ? `Dépêches liées à : ${activeCountry.name}` : 'Afrique et international'} · dernières 24 h
            </p>
          </div>
          {rss && liveEditorials !== undefined && (
            <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border border-al-green/30 bg-al-green/10 px-2.5 py-0.5 text-xs font-semibold text-al-green sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-al-green" aria-hidden="true" />
              {liveEditorials} rédactions
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip selected={scopeTab === 'all'} onClick={() => onScopeChange('all')}>Toutes ({tabCounts.all})</Chip>
          <Chip selected={scopeTab === 'africa'} onClick={() => onScopeChange('africa')}>Afrique & National ({tabCounts.africa})</Chip>
          <Chip selected={scopeTab === 'international'} onClick={() => onScopeChange('international')}>International ({tabCounts.international})</Chip>
        </div>

        {rss && total > 0 && (
          <>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                type="search"
                value={query}
                onChange={event => {
                  setQuery(event.target.value);
                  setLimit(PAGE_SIZE);
                }}
                placeholder="Rechercher un mot, une source, un pays…"
                aria-label="Rechercher dans les dépêches"
                className="min-h-11 w-full rounded-control border border-line bg-surface-2 pl-9 pr-10 text-sm text-text placeholder:text-text-muted hover:border-line-gold focus:border-al-gold focus:outline-none focus:ring-1 focus:ring-al-gold/50 sm:min-h-9 sm:text-xs [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setLimit(PAGE_SIZE);
                  }}
                  aria-label="Effacer la recherche"
                  className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Rubriques déduites (libellé du flux ou mots du titre) : indicatives ; une dépêche non classée reste dans « Toutes ». */}
            <div role="group" aria-label="Rubriques" className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-5 sm:flex-wrap sm:px-5">
              {RADAR_TOPICS.filter(item => (topicCounts.get(item.id) ?? 0) > 0 || topic === item.id).map(item => (
                <Chip
                  key={item.id}
                  selected={topic === item.id}
                  onClick={() => {
                    setTopic(current => (current === item.id ? null : item.id));
                    setLimit(PAGE_SIZE);
                  }}
                  className="shrink-0"
                >
                  {item.label} ({topicCounts.get(item.id) ?? 0})
                </Chip>
              ))}
            </div>
          </>
        )}
      </div>

      {activeCountry && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-al-green/10 bg-al-green/[0.05] px-4 py-2 text-xs">
          <span className="text-text">Filtre pays : <strong>{activeCountry.name}</strong></span>
          <span className="flex flex-wrap items-center gap-1">
            {countryChannelCount > 0 && (
              <button
                type="button"
                onClick={() => onWatchCountry(activeCountry.code)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line-gold bg-al-gold/10 px-2.5 font-semibold text-al-gold transition hover:bg-al-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
              >
                <Play aria-hidden="true" className="h-3 w-3 fill-current" />
                Regarder une chaîne : {activeCountry.name}
              </button>
            )}
            <button type="button" onClick={() => onSelectCountry(null)} className="min-h-9 px-2 text-text-muted hover:text-text">Tout afficher</button>
          </span>
        </div>
      )}

      {newsError && rss && (
        <div role="status" className="border-b border-al-gold/10 bg-al-gold/[0.04] px-4 py-2 text-xs text-text/80 sm:px-5">
          {newsError} Les dernières dépêches chargées restent consultables.
        </div>
      )}

      <div aria-live="polite" className="flex-1 divide-y divide-line overflow-y-auto xl:max-h-[515px]">
        {newsError && !rss ? (
          <div className="p-4">
            <ErrorState title="Signal interrompu" description={newsError} onRetry={onRetry} />
          </div>
        ) : !rss ? (
          <div role="status" aria-label="Chargement des dépêches" className="space-y-3 p-4">
            {[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-20" />)}
          </div>
        ) : total === 0 ? (
          <EmptyState
            illustration="acacia"
            title={activeCountry ? `Aucune dépêche pour : ${activeCountry.name}` : 'Aucune dépêche dans ce filtre'}
            description={activeCountry
              ? scopeTab !== 'all' && tabCounts.all > 0
                ? `Ce pays a ${countLabel(tabCounts.all, 'dépêche', 'dépêches')} dans d’autres rubriques.`
                : 'Ce pays n’a pas de dépêche récente dans ce flux.'
              : 'Essayez une autre rubrique ou effacez la sélection.'}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {scopeTab !== 'all' && tabCounts.all > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => onScopeChange('all')}>Toutes les rubriques ({tabCounts.all})</Button>
                )}
                {activeCountry && (
                  <Button variant="secondary" size="sm" onClick={() => onSelectCountry(null)}>Effacer le filtre pays</Button>
                )}
              </div>
            }
          />
        ) : filtering && listed.length === 0 && listedUndated.length === 0 ? (
          <EmptyState
            illustration="acacia"
            title="Aucune dépêche ne correspond"
            description={`${query.trim() ? `Recherche « ${query.trim()} »` : 'Aucun titre'}${topic ? ` dans la rubrique ${RADAR_TOPICS.find(item => item.id === topic)?.label}` : ''}. Le classement par rubrique est indicatif.`}
            action={<Button variant="secondary" size="sm" onClick={resetFilters}>Effacer la recherche et la rubrique</Button>}
          />
        ) : !filtering && rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-text-muted">Toutes les dépêches de cette vue sont à la une, plus haut.</p>
        ) : (
          <>
            {/* Séparateurs horaires (R2) : collants dans la colonne défilante du bureau, simples intertitres sur mobile. */}
            {filtering && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 text-xs text-text-muted sm:px-5">
                <span>{countLabel(listed.length, 'dépêche trouvée', 'dépêches trouvées')}, « À la une » comprises</span>
                <button type="button" onClick={resetFilters} className="min-h-9 px-2 font-semibold text-al-gold hover:text-text">Tout effacer</button>
              </div>
            )}
            {groupByTime(listed.slice(0, limit), article => article.indexedAt, now).map((section, index) => (
              <section key={`${section.group ?? 'all'}-${index}`} aria-label={section.group ? RADAR_TIME_GROUP_LABELS[section.group] : undefined} className="divide-y divide-line">
                {section.group && (
                  <h3 className="bg-surface-1/95 px-4 pb-1.5 pt-3 text-xs font-bold uppercase tracking-wide text-al-gold backdrop-blur sm:px-5 xl:sticky xl:top-0 xl:z-10">
                    {RADAR_TIME_GROUP_LABELS[section.group]}
                  </h3>
                )}
                {section.items.map(row)}
              </section>
            ))}
            {listed.length > limit && (
              <div className="p-4 text-center">
                <Button variant="secondary" size="sm" onClick={() => setLimit(value => value + PAGE_SIZE)}>
                  Voir plus de dépêches ({listed.length - limit} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {listedUndated.length > 0 && (
        <section aria-label="Dépêches sans date" className="border-t border-line-gold">
          <h2 className="p-3 text-xs text-text">Sans date précise</h2>
          <div className="divide-y divide-line">{listedUndated.map(row)}</div>
        </section>
      )}
    </>
  );
}
