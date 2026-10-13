'use client';
import { editionMarkets } from '@/lib/edition-markets';
import { countryName } from '@/lib/country-names';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Earth, ExternalLink } from 'lucide-react';
import { cn } from '@/components/ui';
import CountryFlag from '@/components/radar/CountryFlag';
import { formatForexRate, formatMarketPrice, formatVariation } from '@/lib/market-format';
import { basketCommodities, basketName, indicativeUsdXof } from '@/lib/market-basket';
import { commodityFocus, type CommodityFocus } from '@/lib/market-geography';
import { africanMentions } from '@/lib/world-desk-data';
import { marketTickerItems, type MarketTickerItem } from '@/lib/market-ticker';
import { formatRadarDate, radarStatusLabel } from '@/lib/radar-data';
import { useLiveMarkets } from './useLiveMarkets';
import { useI18n } from '@/i18n/client';
import { format } from '@/i18n/message';

const severityClass = { critical: 'bg-al-red-soft', warning: 'bg-al-gold', info: 'bg-text-muted' };

function ItemContent({ item, interactive = false, onSelectCountry }: { item: MarketTickerItem; interactive?: boolean; onSelectCountry?: (code: string) => void }) {
  const { t, edition } = useI18n();
  if (item.kind === 'alert') {
    const alert = item.value;
    return <>
      <span aria-hidden="true" className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', severityClass[alert.severity])} />
      {alert.countryCode ? (interactive && onSelectCountry
        ? <button type="button" aria-label={format(t.world.seeCountry, { name: countryName(alert.countryCode, edition) })} title={countryName(alert.countryCode, edition)} onClick={() => onSelectCountry(alert.countryCode!)} className="-my-1 inline-flex shrink-0 rounded-md p-1 hover:bg-white/10"><CountryFlag code={alert.countryCode} /></button>
        : <span title={countryName(alert.countryCode)} className="inline-flex shrink-0"><CountryFlag code={alert.countryCode} /><span className="sr-only">{countryName(alert.countryCode)}</span></span>)
        : alert.scope === 'World' && <span title={t.world.world} className="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[3px] bg-surface-2 text-sky-300 ring-1 ring-white/15"><Earth aria-hidden="true" className="size-3.5" /><span className="sr-only">{t.world.world}</span></span>}
      {interactive && alert.url
        ? <a href={alert.url} target="_blank" rel="noopener noreferrer" aria-label={format(t.radar.ticker.sourceAria, { title: alert.title })} className="min-w-0 font-medium text-text hover:text-al-gold [unicode-bidi:plaintext]">{alert.title}<ExternalLink aria-hidden="true" className="rtl:-scale-x-100 ms-1 inline size-3" /></a>
        : <span className="font-medium text-text [unicode-bidi:plaintext]">{alert.title}</span>}
      {alert.scope === 'World' && africanMentions(alert.title).touchesAfrica && <span className="shrink-0 rounded-pill border border-al-green/40 bg-al-green/10 px-1.5 text-xs text-al-green">{t.world.touchesAfrica}</span>}
    </>;
  }
  if (item.kind === 'forex') {
    const rate = item.value;
    return <><span className="font-semibold text-text">1 {rate.base} = {formatForexRate(rate.rate, edition)} {rate.quote}</span><span className="text-xs text-text-muted">{rate.isPegged ? t.radar.ticker.pegged : t.radar.ticker.indicativeRate}</span></>;
  }
  const quote = item.value;
  return <>
    <span className="font-semibold text-text-muted">{quote.name}</span>
    <span className="font-semibold tabular-nums text-text">{formatMarketPrice(quote.price, quote.currency, quote.unit, edition, t.markets)}</span>
    <Variation value={quote.changePercent24h} />
  </>;
}

function Variation({ value }: { value: number | null }) {
  const { t, edition } = useI18n();
  const variation = formatVariation(value, edition, t.markets);
  return <span title={t.radar.ticker.variationTitle} className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', variation.isNeutral ? 'text-text-muted' : variation.isPositive ? 'text-al-green' : 'text-al-red-soft')}>
      {!variation.isNeutral && (variation.isPositive ? <ArrowUpRight aria-hidden="true" className="size-3" /> : <ArrowDownRight aria-hidden="true" className="size-3" />)}
      {variation.text}
    </span>;
}

/** Mini-courbe des dernières séances : forme seule, couleur neutre (la variation colorée compare à la séance précédente, pas à la semaine). */
function Sparkline({ points }: { points: { price: number }[] }) {
  if (points.length < 2) return null;
  const prices = points.map(point => point.price), min = Math.min(...prices), span = Math.max(...prices) - min || 1;
  const path = prices.map((price, i) => `${(i / (prices.length - 1) * 30 + 1).toFixed(1)},${(11 - (price - min) / span * 10).toFixed(1)}`).join(' ');
  return <svg aria-hidden="true" data-testid="sparkline" viewBox="0 0 32 12" className="h-3 w-8 shrink-0 text-text-muted">
    <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function ItemMetadata({ item }: { item: MarketTickerItem }) {
  const { t, edition } = useI18n();
  const labels = t.radar.ticker;
  const date = (value: string | null | undefined) => formatRadarDate(value, edition, t.time);
  if (item.kind === 'alert') return <><bdi>{item.value.source ?? labels.unknownSource}</bdi> · {item.value.timestamp ? date(item.value.timestamp) : t.time.unknownDate}{item.value.scope === 'unknown' && labels.unknownLocation}</>;
  if (item.kind === 'forex') return <>{item.value.label} · <bdi>{item.value.source}</bdi>{!item.value.isPegged && ' · ' + date(item.value.updatedAt)}</>;
  return <><bdi>{item.value.source}</bdi>{format(labels.lastQuote, { date: date(item.value.updatedAt) })}{item.value.previousCloseAt && format(labels.referenceSession, { date: date(item.value.previousCloseAt).split(' ')[0] })}</>;
}

const ROTATE_MS = 7000;
const calmQuery = '(prefers-reduced-motion: reduce)';
const lineQuery = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';
function subscribeMotion(callback: () => void) {
  const medias = [window.matchMedia(calmQuery), window.matchMedia(lineQuery)];
  const observer = new MutationObserver(callback);
  medias.forEach(media => media.addEventListener('change', callback));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-eco'] });
  return () => { medias.forEach(media => media.removeEventListener('change', callback)); observer.disconnect(); };
}
const eco = () => document.documentElement.dataset.eco === 'true';
/** Mouvement réduit ou mode Éco : rien ne bouge de lui-même. */
const useCalm = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(calmQuery).matches || eco(), () => false);
/** Ordinateur sans restriction de mouvement : les deux lignes défilent (même condition que la feuille de style). */
const useScrollingLines = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(lineQuery).matches && !eco(), () => false);
const chip = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border border-line px-2 py-0.5';

/**
 * Ligne défilante à vitesse constante : le groupe réel (liste accessible, interactive) et sa copie inerte pour la boucle.
 * Pause au survol, au focus ou quand « Voir tout » est ouvert. Sur mobile, en mouvement réduit
 * ou en mode Éco, la feuille de style arrête l'animation : la ligne se fait glisser au doigt et la copie disparaît.
 */
function Marquee({ label, paused, render, className = '' }: { label: string; paused: boolean; render: (interactive: boolean) => ReactNode; className?: string }) {
  const group = useRef<HTMLUListElement>(null);
  const [distance, setDistance] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const element = group.current, viewport = element?.parentElement?.parentElement;
    if (!element || !viewport) return;
    const measure = () => { setDistance(element.getBoundingClientRect().width); setViewportWidth(viewport.getBoundingClientRect().width); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return <div className={cn('marquee', className)}>
    <div className="animate-marquee" data-paused={paused || distance === 0}
      style={{ '--ticker-distance': distance + 'px', '--ticker-viewport': viewportWidth + 'px', '--ticker-duration': Math.max(distance / 40, 1) + 's' } as CSSProperties}>
      <ul ref={group} aria-label={label} className="marquee-group">{render(true)}</ul>
      <div className="marquee-group marquee-clone" aria-hidden="true" inert>{render(false)}</div>
    </div>
  </div>;
}

/** Deux lignes défilantes : les dépêches (le fil), puis le panier des cours mondiaux et du franc CFA. */
export default function LiveMarketTicker({ onSelectCountry, onSelectCommodity, activeCommodity = null, refreshToken = 0, className = '' }: {
  onSelectCountry?: (code: string) => void; onSelectCommodity?: (focus: CommodityFocus | null) => void; activeCommodity?: string | null; refreshToken?: number; className?: string;
}) {
  const { t, edition } = useI18n();
  const labels = t.radar.ticker;
  const date = (value: string | null | undefined) => formatRadarDate(value, edition, t.time);
  const { data: rawData, loading, error } = useLiveMarkets(refreshToken);
  const data = useMemo(() => editionMarkets(rawData, edition), [rawData, edition]);
  const calm = useCalm();
  const scrolling = useScrollingLines();
  const [held, setHeld] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [announce, setAnnounce] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const items = useMemo(() => marketTickerItems(data), [data]);
  const headlines = useMemo(() => items.filter(item => item.kind === 'alert'), [items]);
  const basket = useMemo(() => basketCommodities(data), [data]);
  const usdXof = indicativeUsdXof(data);
  const euroPeg = data?.forex.find(rate => rate.base === 'EUR' && rate.quote === 'XOF');
  const foundIndex = headlines.findIndex(item => item.id === selectedId);
  const index = foundIndex < 0 ? 0 : foundIndex;
  const current = headlines[index];
  const sources = data?.availability ?? [];
  const retained = Boolean(data) && (error || sources.some(source => source.status === 'stale'));
  const partial = sources.some(source => ['unavailable', 'partial', 'not_configured'].includes(source.status));
  // Le lecteur une-dépêche-à-la-fois ne tourne que là où il est affiché (mobile), jamais en mouvement réduit ou Éco.
  const rotating = !calm && !scrolling && !detailsOpen && headlines.length > 1;

  useEffect(() => {
    if (!rotating || held) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setAnnounce(false);
      setSelectedId(id => headlines[(Math.max(headlines.findIndex(item => item.id === id), 0) + 1) % headlines.length].id);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [rotating, held, headlines]);

  const headlineItems = (interactive: boolean) => headlines.map(item => {
    const content = <>
      <ItemContent item={item} interactive={interactive} onSelectCountry={onSelectCountry} />
      {item.kind === 'alert' && <span className="text-xs text-text-muted"><bdi>{item.value.source ?? labels.wire}</bdi>{item.value.timestamp && ' · ' + date(item.value.timestamp)}</span>}
    </>;
    return interactive ? <li key={item.id} className="inline-flex shrink-0 items-center gap-2">{content}</li> : <span key={item.id} className="inline-flex shrink-0 items-center gap-2">{content}</span>;
  });

  const basketChips = (interactive: boolean) => <>
    {basket.map(quote => {
      const focus = interactive && onSelectCommodity ? commodityFocus(edition === 'fr' ? quote : { ...quote, name: (t.markets.products as Record<string, string>)[quote.symbol] ?? quote.name }) : null, active = activeCommodity === quote.symbol;
      const content = <>
        <span className="text-text-muted">{edition === 'fr' ? basketName(quote) : (t.markets.products as Record<string, string>)[quote.symbol] ?? quote.name}</span>
        <span className="font-semibold tabular-nums text-text">{formatMarketPrice(quote.price, quote.currency, quote.unit, edition, t.markets)}</span>
        <Sparkline points={quote.history ?? []} />
        {quote.changePercent24h !== null && <Variation value={quote.changePercent24h} />}
      </>;
      const style = cn(chip, active ? 'border-al-gold bg-al-gold/15' : 'bg-black/30');
      const Item = interactive ? 'li' : 'span';
      return <Item key={quote.symbol} className="shrink-0">{focus
        ? <button type="button" aria-pressed={active} title={quote.label + ' · ' + quote.source + ' · ' + labels.seeOnMap[focus.role === 'producteurs' ? 'producers' : 'importers']}
            onClick={() => onSelectCommodity!(active ? null : focus)} className={cn(style, 'transition-colors hover:border-line-gold')}>
            {content}<span className="sr-only">{', ' + labels.seeOnMap[focus.role === 'producteurs' ? 'producers' : 'importers']}</span>
          </button>
        : <span title={quote.label + ' · ' + quote.source} className={style}>{content}</span>}</Item>;
    })}
    {edition !== 'fr' && data?.forex.map(rate => <li key={rate.pair} className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-black/30 px-2 py-0.5"><span className="font-semibold tabular-nums">{format(t.markets.exchange.generic, { rate: formatForexRate(rate.rate, edition), currency: rate.quote })}</span><span className="text-xs text-text-muted">{t.markets.exchange.indicative}</span></li>)}
    {[usdXof !== null && <><span className="font-semibold tabular-nums text-text">{format(labels.usdXof, { rate: formatForexRate(usdXof, edition) })}</span><span className="text-xs text-text-muted">{labels.indicative}</span></>,
      euroPeg && <><span className="font-semibold tabular-nums text-text">{format(labels.eurXof, { rate: formatForexRate(euroPeg.rate, edition) })}</span><span className="text-xs text-text-muted">{labels.fixed}</span></>]
      .map((content, i) => content && (interactive ? <li key={i} className={chip}>{content}</li> : <span key={i} className={chip}>{content}</span>))}
  </>;

  const move = (direction: number) => { setAnnounce(true); setSelectedId(headlines[(index + direction + headlines.length) % headlines.length].id); };
  const status = data ? null : loading ? labels.loading : error ? labels.unavailable : null;

  return <section aria-label={labels.region} className={cn('market-ticker rounded-control border border-line bg-surface-1/80 text-[13px]', className)}>
    <div className="flex flex-wrap items-center gap-2 px-2 py-1.5" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}>
      {status ? <p role="status" className="min-w-0 flex-1 px-2 py-2 text-text-muted">{status}</p> : current ? <>
        <Marquee label={labels.wireLine} paused={detailsOpen} render={headlineItems} className="ticker-wire min-w-0 flex-1" />
        <div className="ticker-reader w-full min-w-0">
          <div key={current.id} className="ticker-headline px-1 py-1" aria-live={announce ? 'polite' : 'off'} aria-atomic="true">
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 [overflow-wrap:anywhere]">
              <ItemContent item={current} interactive onSelectCountry={onSelectCountry} />
              {current.kind === 'alert' && <span className="text-xs text-text-muted"><bdi>{current.value.source ?? labels.wire}</bdi>{current.value.timestamp && ' · ' + date(current.value.timestamp)}</span>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1" role="group" aria-label={labels.browse}>
            <button type="button" aria-label={labels.previous} disabled={headlines.length < 2} onClick={() => move(-1)} className="inline-flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronLeft aria-hidden="true" className="rtl:-scale-x-100 size-4" /></button>
            <span className="text-xs tabular-nums text-text-muted" aria-label={format(labels.position, { index: index + 1, total: headlines.length })}>{index + 1}/{headlines.length}</span>
            <button type="button" aria-label={labels.next} disabled={headlines.length < 2} onClick={() => move(1)} className="inline-flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronRight aria-hidden="true" className="rtl:-scale-x-100 size-4" /></button>
          </div>
        </div>
      </> : <p className="min-w-0 flex-1 px-2 py-2 text-text-muted">{labels.empty}</p>}
    </div>
    {basket.length > 0 && <Marquee label={labels.basketLine} paused={detailsOpen} render={basketChips} className="border-t border-line px-2 py-1.5" />}
    <details className="ticker-details border-t border-line px-3 py-1.5" onToggle={event => setDetailsOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-xs text-text-muted hover:text-text">{labels.details}{retained ? labels.retained : partial ? labels.partial : loading && data ? labels.refreshing : ''}</summary>
      <div className="mt-2 space-y-3 pb-2">
        <p className="text-xs text-text-muted">{labels.explanation}</p>
        {data && <p role="status" className="text-xs text-text-muted">{format(t.world.collected, { date: date(data.updatedAt) })}{retained && labels.retainedNotice}{partial && labels.partialNotice}</p>}
        <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-control border border-line p-2">
          <div className="flex flex-wrap items-start gap-2 [overflow-wrap:anywhere]"><ItemContent item={item} interactive onSelectCountry={onSelectCountry} /></div>
          <p className="mt-1 text-xs text-text-muted [overflow-wrap:anywhere]"><ItemMetadata item={item} /></p>
        </li>)}</ul>
        {sources.length > 0 && <ul aria-label={labels.sources} className="space-y-1 text-xs text-text-muted">{sources.map((source, i) => <li key={source.provider + ':' + i}>{format(labels.sourceLine, { provider: source.provider, status: radarStatusLabel(source.status, t.radar.sourceStatus), success: date(source.lastSuccessAt), data: date(source.dataAt) })}</li>)}</ul>}
        <p className="text-xs text-text-muted">{data?.disclaimer || labels.disclaimer}</p>
        {data?.forex.some(rate => !rate.isPegged) && <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-text-muted underline">{labels.exchangeSource}</a>}
      </div>
    </details>
  </section>;
}
