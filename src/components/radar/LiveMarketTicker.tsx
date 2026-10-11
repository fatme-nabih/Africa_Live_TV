'use client';

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
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { useLiveMarkets } from './useLiveMarkets';

const countryName = (code: string) => AFRICAN_COUNTRIES.find(country => country.code === code)?.name ?? code;
const severityClass = { critical: 'bg-al-red-soft', warning: 'bg-al-gold', info: 'bg-text-muted' };

function ItemContent({ item, interactive = false, onSelectCountry }: { item: MarketTickerItem; interactive?: boolean; onSelectCountry?: (code: string) => void }) {
  if (item.kind === 'alert') {
    const alert = item.value;
    return <>
      <span aria-hidden="true" className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', severityClass[alert.severity])} />
      {alert.countryCode ? (interactive && onSelectCountry
        ? <button type="button" aria-label={'Voir le pays : ' + countryName(alert.countryCode)} title={countryName(alert.countryCode)} onClick={() => onSelectCountry(alert.countryCode!)} className="-my-1 inline-flex shrink-0 rounded-md p-1 hover:bg-white/10"><CountryFlag code={alert.countryCode} /></button>
        : <span title={countryName(alert.countryCode)} className="inline-flex shrink-0"><CountryFlag code={alert.countryCode} /><span className="sr-only">{countryName(alert.countryCode)}</span></span>)
        : alert.scope === 'World' && <span title="Monde" className="inline-flex h-4 w-6 shrink-0 items-center justify-center rounded-[3px] bg-surface-2 text-sky-300 ring-1 ring-white/15"><Earth aria-hidden="true" className="size-3.5" /><span className="sr-only">Monde</span></span>}
      {interactive && alert.url
        ? <a href={alert.url} target="_blank" rel="noopener noreferrer" aria-label={'Source : ' + alert.title} className="min-w-0 font-medium text-text hover:text-al-gold">{alert.title}<ExternalLink aria-hidden="true" className="ml-1 inline size-3" /></a>
        : <span className="font-medium text-text">{alert.title}</span>}
      {alert.scope === 'World' && africanMentions(alert.title).touchesAfrica && <span className="shrink-0 rounded-pill border border-al-green/40 bg-al-green/10 px-1.5 text-xs text-al-green">Touche l’Afrique</span>}
    </>;
  }
  if (item.kind === 'forex') {
    const rate = item.value;
    return <><span className="font-semibold text-text">1 {rate.base} = {formatForexRate(rate.rate)} {rate.quote}</span><span className="text-xs text-text-muted">{rate.isPegged ? 'Parité fixe' : 'Taux indicatif'}</span></>;
  }
  const quote = item.value;
  return <>
    <span className="font-semibold text-text-muted">{quote.name}</span>
    <span className="font-semibold tabular-nums text-text">{formatMarketPrice(quote.price, quote.currency, quote.unit)}</span>
    <Variation value={quote.changePercent24h} />
  </>;
}

function Variation({ value }: { value: number | null }) {
  const variation = formatVariation(value);
  return <span title="Variation depuis la séance précédente" className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', variation.isNeutral ? 'text-text-muted' : variation.isPositive ? 'text-al-green' : 'text-al-red-soft')}>
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
  if (item.kind === 'alert') return <>{item.value.source ?? 'Source non précisée'} · {item.value.timestamp ? formatRadarDate(item.value.timestamp) : 'Date inconnue'}{item.value.scope === 'unknown' && ' · Localisation à préciser'}</>;
  if (item.kind === 'forex') return <>{item.value.label} · {item.value.source}{!item.value.isPegged && ' · ' + formatRadarDate(item.value.updatedAt)}</>;
  return <>{item.value.source} · dernière cotation {formatRadarDate(item.value.updatedAt)}{item.value.previousCloseAt && ' · séance de référence ' + formatRadarDate(item.value.previousCloseAt).split(' ')[0]}</>;
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
  const { data, loading, error } = useLiveMarkets(refreshToken);
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
      {item.kind === 'alert' && <span className="text-xs text-text-muted">{item.value.source ?? 'Dépêche'}{item.value.timestamp && ' · ' + formatRadarDate(item.value.timestamp)}</span>}
    </>;
    return interactive ? <li key={item.id} className="inline-flex shrink-0 items-center gap-2">{content}</li> : <span key={item.id} className="inline-flex shrink-0 items-center gap-2">{content}</span>;
  });

  const basketChips = (interactive: boolean) => <>
    {basket.map(quote => {
      const focus = interactive && onSelectCommodity ? commodityFocus(quote) : null, active = activeCommodity === quote.symbol;
      const content = <>
        <span className="text-text-muted">{basketName(quote)}</span>
        <span className="font-semibold tabular-nums text-text">{formatMarketPrice(quote.price, quote.currency, quote.unit)}</span>
        <Sparkline points={quote.history ?? []} />
        {quote.changePercent24h !== null && <Variation value={quote.changePercent24h} />}
      </>;
      const style = cn(chip, active ? 'border-al-gold bg-al-gold/15' : 'bg-black/30');
      const Item = interactive ? 'li' : 'span';
      return <Item key={quote.symbol} className="shrink-0">{focus
        ? <button type="button" aria-pressed={active} title={quote.label + ' · ' + quote.source + ' · voir les principaux ' + focus.role + ' sur la carte'}
            onClick={() => onSelectCommodity!(active ? null : focus)} className={cn(style, 'transition-colors hover:border-line-gold')}>
            {content}<span className="sr-only">, voir les principaux {focus.role} sur la carte</span>
          </button>
        : <span title={quote.label + ' · ' + quote.source} className={style}>{content}</span>}</Item>;
    })}
    {[usdXof !== null && <><span className="font-semibold tabular-nums text-text">1 USD = {formatForexRate(usdXof)} FCFA</span><span className="text-xs text-text-muted">indicatif</span></>,
      euroPeg && <><span className="font-semibold tabular-nums text-text">1 EUR = {formatForexRate(euroPeg.rate)} FCFA</span><span className="text-xs text-text-muted">fixe</span></>]
      .map((content, i) => content && (interactive ? <li key={i} className={chip}>{content}</li> : <span key={i} className={chip}>{content}</span>))}
  </>;

  const move = (direction: number) => { setAnnounce(true); setSelectedId(headlines[(index + direction + headlines.length) % headlines.length].id); };
  const status = data ? null : loading ? 'Chargement des informations…' : error ? 'Les informations sont momentanément indisponibles.' : null;

  return <section aria-label="Bandeau des marchés et événements" className={cn('market-ticker rounded-control border border-line bg-surface-1/80 text-[13px]', className)}>
    <div className="flex flex-wrap items-center gap-2 px-2 py-1.5" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}>
      {status ? <p role="status" className="min-w-0 flex-1 px-2 py-2 text-text-muted">{status}</p> : current ? <>
        <Marquee label="Le fil : dépêches économiques" paused={detailsOpen} render={headlineItems} className="ticker-wire min-w-0 flex-1" />
        <div className="ticker-reader w-full min-w-0">
          <div key={current.id} className="ticker-headline px-1 py-1" aria-live={announce ? 'polite' : 'off'} aria-atomic="true">
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5 [overflow-wrap:anywhere]">
              <ItemContent item={current} interactive onSelectCountry={onSelectCountry} />
              {current.kind === 'alert' && <span className="text-xs text-text-muted">{current.value.source ?? 'Dépêche'}{current.value.timestamp && ' · ' + formatRadarDate(current.value.timestamp)}</span>}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1" role="group" aria-label="Parcourir le fil">
            <button type="button" aria-label="Dépêche précédente" disabled={headlines.length < 2} onClick={() => move(-1)} className="inline-flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronLeft aria-hidden="true" className="size-4" /></button>
            <span className="text-xs tabular-nums text-text-muted" aria-label={'Dépêche ' + (index + 1) + ' sur ' + headlines.length}>{index + 1}/{headlines.length}</span>
            <button type="button" aria-label="Dépêche suivante" disabled={headlines.length < 2} onClick={() => move(1)} className="inline-flex size-9 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronRight aria-hidden="true" className="size-4" /></button>
          </div>
        </div>
      </> : <p className="min-w-0 flex-1 px-2 py-2 text-text-muted">Aucune dépêche économique récente.</p>}
    </div>
    {basket.length > 0 && <Marquee label="Le panier : cours mondiaux et franc CFA" paused={detailsOpen} render={basketChips} className="border-t border-line px-2 py-1.5" />}
    <details className="ticker-details border-t border-line px-3 py-1.5" onToggle={event => setDetailsOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-xs text-text-muted hover:text-text">Voir tout, sources et dates{retained ? ' · Données conservées' : partial ? ' · Certaines sources indisponibles' : loading && data ? ' · Actualisation…' : ''}</summary>
      <div className="mt-2 space-y-3 pb-2">
        <p className="text-xs text-text-muted">Dépêches économiques africaines (drapeau du pays) et internationales (planète), devises CFA et marchés mondiaux utiles à l’Afrique. Les localisations inconnues sont signalées. Les cours sont affichés dans leur devise de cotation d’origine ; ce ne sont pas des prix de détail. Les variations comparent la cotation à la séance précédente.</p>
        {data && <p role="status" className="text-xs text-text-muted">Collecte : {formatRadarDate(data.updatedAt)}.{retained && ' Une source est en panne : les dernières données disponibles sont conservées.'}{partial && ' Certaines sources ne sont pas disponibles.'}</p>}
        <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-control border border-line p-2">
          <div className="flex flex-wrap items-start gap-2 [overflow-wrap:anywhere]"><ItemContent item={item} interactive onSelectCountry={onSelectCountry} /></div>
          <p className="mt-1 text-xs text-text-muted [overflow-wrap:anywhere]"><ItemMetadata item={item} /></p>
        </li>)}</ul>
        {sources.length > 0 && <ul aria-label="Disponibilité des sources" className="space-y-1 text-xs text-text-muted">{sources.map((source, i) => <li key={source.provider + ':' + i}>{source.provider} : {radarStatusLabel(source.status)} · dernier succès {formatRadarDate(source.lastSuccessAt)} · données {formatRadarDate(source.dataAt)}</li>)}</ul>}
        <p className="text-xs text-text-muted">{data?.disclaimer || 'À titre informatif. Les dates de cotation et de collecte peuvent différer.'}</p>
        {data?.forex.some(rate => !rate.isPegged) && <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-text-muted underline">Taux de change : ExchangeRate-API</a>}
      </div>
    </details>
  </section>;
}
