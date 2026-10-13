'use client';
import { countryName } from '@/lib/country-names';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Globe2 } from 'lucide-react';
import { cn } from '@/components/ui';
import { formatRadarDate } from '@/lib/radar-data';
import { WORLD_REGIONS, type WorldArticle, type WorldRegion } from '@/lib/world-desk-data';
import { useNow } from './useNow';
import { useWorldDesk } from './useWorldDesk';
import { useI18n } from '@/i18n/client';
import { format, formatPlural } from '@/i18n/message';
import { dateTimeFormat, intlLocale } from '@/i18n/format';
import type { Dictionary } from '@/i18n/dictionary';
import type { Edition } from '@/lib/editions';

type Filter = 'all' | WorldRegion | 'afrique';
const PAGE = 12;
type WorldLabels = Dictionary['world'];
const regionLabel = (id: WorldRegion | null, labels: WorldLabels) => (id ? labels.regions[id] : null) ?? labels.world;

function localTime(timeZone: string, now: number, edition: Edition) {
  if (!now) return null;
  const parts = dateTimeFormat(intlLocale(edition), { timeZone, hour: '2-digit', minute: '2-digit', timeZoneName: 'shortOffset' }).formatToParts(new Date(now));
  const hour = parts.filter(part => ['hour', 'literal', 'minute'].includes(part.type)).map(part => part.value).join('').trim();
  return { hour, offset: parts.find(part => part.type === 'timeZoneName')?.value.replace('UTC', 'GMT') ?? '' };
}

function Headline({ article, onSelectCountry, showRegion = false, compact = false }: { article: WorldArticle; onSelectCountry: (code: string) => void; showRegion?: boolean; compact?: boolean }) {
  const { t, edition } = useI18n();
  const labels = t.world;
  return <li className={cn('min-w-0', !compact && 'border-b border-line py-2.5 last:border-b-0')}>
    <a href={article.url} target="_blank" rel="noopener noreferrer" className={cn('font-semibold text-text hover:text-al-gold [overflow-wrap:anywhere] [unicode-bidi:plaintext]', compact ? 'text-[13px] leading-snug' : 'text-sm')}>
      {article.title}<ExternalLink aria-hidden="true" className="rtl:-scale-x-100 ms-1 inline size-3 text-text-muted" />
    </a>
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-text-muted">
      <span><bdi>{article.sourceName}</bdi>{article.origin !== 'France' && <>{' · '}<bdi>{(t.world.origins as Record<string, string>)[article.origin] ?? article.origin}</bdi></>}</span>
      <span aria-hidden="true">·</span><span>{formatRadarDate(article.publishedAt, edition, t.time)}</span>
      {showRegion && article.region && <><span aria-hidden="true">·</span><span>{regionLabel(article.region, labels)}</span></>}
      {article.touchesAfrica && !showRegion && <span className="rounded-pill border border-al-green/40 bg-al-green/10 px-1.5 text-al-green">{labels.touchesAfrica}</span>}
      {article.africanCountries.map(code => <button key={code} type="button" onClick={() => onSelectCountry(code)} aria-label={format(labels.seeCountry, { name: countryName(code, edition) })}
        className="rounded-pill bg-white/10 px-1.5 font-semibold text-text-muted hover:text-text">{code}</button>)}
    </p>
  </li>;
}

/** « Regards sur le monde » : l'actualité internationale par région, et ce qui, dans le monde, concerne l'Afrique. */
export default function WorldDesk({ refreshToken = 0, onSelectCountry, className = '' }: { refreshToken?: number; onSelectCountry: (code: string) => void; className?: string }) {
  const { t, edition } = useI18n();
  const labels = t.world;
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  const { data, loading, error, retry } = useWorldDesk(visible, refreshToken);
  const now = useNow();

  // Économie de données : rien n'est demandé tant que la rubrique n'approche pas de l'écran.
  useEffect(() => {
    const element = root.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setVisible(true); }, { rootMargin: '400px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  const articles = useMemo(() => data?.articles ?? [], [data]);
  const byRegion = useMemo(() => new Map(WORLD_REGIONS.map(region => [region.id, articles.filter(article => article.region === region.id)])), [articles]);
  const africa = useMemo(() => articles.filter(article => article.touchesAfrica), [articles]);
  const list = filter === 'all' ? [] : filter === 'afrique' ? africa : byRegion.get(filter) ?? [];
  const choose = (next: Filter) => { setFilter(next); setShown(PAGE); };
  const unavailable = data?.availability.filter(source => source.status === 'unavailable').length ?? 0;

  const chips: [Filter, string, number][] = [['all', labels.all, articles.length], ...WORLD_REGIONS.map(region => [region.id, labels.regions[region.id], byRegion.get(region.id)?.length ?? 0] as [Filter, string, number]), ['afrique', labels.africaInWorld, africa.length]];

  return <section ref={root} id="regards-monde" aria-labelledby="regards-monde-titre" className={cn('relative overflow-hidden rounded-card border border-line bg-surface-1', className)}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
      <h2 id="regards-monde-titre" className="flex items-center gap-2 text-sm font-bold text-text">
        <span className="flex size-7 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/10 text-al-gold"><Globe2 aria-hidden="true" className="size-4" /></span>
        {labels.title}
      </h2>
      <p className="text-xs text-text-muted">{labels.subtitle}</p>
    </div>
    <div className="px-4 py-3 sm:px-5">
      <div role="group" aria-label={labels.regionGroup} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {chips.map(([id, label, count]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => choose(id)}
          className={cn('min-h-9 shrink-0 whitespace-nowrap rounded-pill border px-3 text-xs font-semibold transition-colors', filter === id ? 'border-al-gold bg-al-gold/15 text-text' : 'border-line text-text-muted hover:text-text', id === 'afrique' && filter !== id && 'text-al-green')}>
          {label}{data && <span className="ms-1.5 tabular-nums text-text-muted">{count}</span>}
        </button>)}
      </div>

      {!data ? <p role="status" className="py-6 text-center text-sm text-text-muted">
        {error ? <>{labels.unreachable} <button type="button" onClick={retry} className="font-semibold text-al-gold underline">{labels.retry}</button></> : visible || loading ? labels.loading : labels.lazy}
      </p> : filter === 'all' ? <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {WORLD_REGIONS.map(region => {
          const items = byRegion.get(region.id) ?? [], time = localTime(region.timeZone, now, edition);
          const city = labels.cities[region.id];
          const outlets = [...new Set(items.map(article => article.sourceName))];
          return <article key={region.id} aria-labelledby={'region-' + region.id} className="flex min-w-0 flex-col rounded-control border border-line bg-black/30 p-3">
            <header className="flex items-baseline justify-between gap-2">
              <h3 id={'region-' + region.id} className="text-sm font-bold text-text">{labels.regions[region.id]}</h3>
              {time && <span className="text-xs tabular-nums text-text-muted" title={format(labels.localTime, { city })}>{city} {time.hour} <span className="text-text-muted/80">{time.offset}</span></span>}
            </header>
            {items.length ? <ul className="mt-2 flex-1 space-y-2.5">{items.slice(0, 3).map(article => <Headline key={article.id} article={article} onSelectCountry={onSelectCountry} compact />)}</ul>
              : <p className="mt-2 flex-1 text-xs text-text-muted">{labels.emptyRegion}</p>}
            {items.length > 0 && <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-xs text-text-muted">
              <span className="min-w-0">{outlets.join(labels.separator)}</span>
              <button type="button" onClick={() => choose(region.id)} className="min-h-8 font-semibold text-al-gold hover:text-text">{format(labels.wholeRegion, { count: items.length })}</button>
            </footer>}
          </article>;
        })}
      </div> : <>
        {filter === 'afrique' && <p className="mt-3 text-xs text-text-muted">{labels.africaHelp}</p>}
        {list.length ? <ul aria-label={filter === 'afrique' ? labels.africaInWorld : regionLabel(filter, labels)} className="mt-2">{list.slice(0, shown).map(article => <Headline key={article.id} article={article} onSelectCountry={onSelectCountry} showRegion={filter === 'afrique'} />)}</ul>
          : <p className="py-6 text-center text-sm text-text-muted">{labels.emptySelection}</p>}
        {list.length > shown && <button type="button" onClick={() => setShown(value => value + PAGE)} className="mt-2 min-h-9 w-full rounded-control border border-line text-xs font-semibold text-text-muted hover:text-text">{format(labels.more, { count: list.length - shown })}</button>}
      </>}
    </div>
    {data && <p className="border-t border-line px-4 py-2 text-xs text-text-muted sm:px-5">
      {labels.sources}
      {error ? labels.refreshFailed : unavailable > 0 ? formatPlural(labels.unavailable, unavailable, {}, edition) : ''}
      {' '}{format(labels.collected, { date: formatRadarDate(data.updatedAt, edition, t.time) })}
    </p>}
  </section>;
}
