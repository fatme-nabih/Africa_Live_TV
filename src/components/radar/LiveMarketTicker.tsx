'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, Pause, Play } from 'lucide-react';
import { cn } from '@/components/ui';
import { formatForexRate, formatMarketPrice, formatVariation } from '@/lib/market-format';
import { marketTickerItems, type MarketScope, type MarketTickerItem } from '@/lib/market-ticker';
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
      {alert.countryCode && (interactive && onSelectCountry
        ? <button type="button" aria-label={'Voir le pays : ' + countryName(alert.countryCode)} onClick={() => onSelectCountry(alert.countryCode!)} className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-text-muted hover:text-text">{alert.countryCode}</button>
        : <span className="shrink-0 rounded-md bg-white/10 px-1.5 text-xs font-semibold text-text-muted">{alert.countryCode}</span>)}
      {interactive && alert.url
        ? <a href={alert.url} target="_blank" rel="noopener noreferrer" aria-label={'Source : ' + alert.title} className="min-w-0 font-medium text-text hover:text-al-gold">{alert.title}<ExternalLink aria-hidden="true" className="ml-1 inline size-3" /></a>
        : <span className="font-medium text-text">{alert.title}</span>}
    </>;
  }
  if (item.kind === 'forex') {
    const rate = item.value;
    return <><span className="font-semibold text-text">1 {rate.base} = {formatForexRate(rate.rate)} {rate.quote}</span><span className="text-xs text-text-muted">{rate.isPegged ? 'Parité fixe' : 'Taux indicatif'}</span></>;
  }
  const quote = item.value;
  const variation = formatVariation(quote.changePercent24h);
  return <>
    <span className="font-semibold text-text-muted">{quote.name}</span>
    <span className="font-semibold tabular-nums text-text">{formatMarketPrice(quote.price, quote.currency, quote.unit)}</span>
    <span title="Variation depuis la séance précédente" className={cn('inline-flex items-center gap-0.5 font-semibold tabular-nums', variation.isNeutral ? 'text-text-muted' : variation.isPositive ? 'text-al-green' : 'text-al-red-soft')}>
      {!variation.isNeutral && (variation.isPositive ? <ArrowUpRight aria-hidden="true" className="size-3" /> : <ArrowDownRight aria-hidden="true" className="size-3" />)}
      {variation.text}
    </span>
  </>;
}

function ItemMetadata({ item }: { item: MarketTickerItem }) {
  if (item.kind === 'alert') return <>{item.value.source ?? 'Source non précisée'} · {item.value.timestamp ? formatRadarDate(item.value.timestamp) : 'Date inconnue'}{item.value.scope === 'unknown' && ' · Localisation à préciser'}</>;
  if (item.kind === 'forex') return <>{item.value.label} · {item.value.source}{!item.value.isPegged && ' · ' + formatRadarDate(item.value.updatedAt)}</>;
  return <>{item.value.source} · dernière cotation {formatRadarDate(item.value.updatedAt)}{item.value.previousCloseAt && ' · séance de référence ' + formatRadarDate(item.value.previousCloseAt).split(' ')[0]}</>;
}

/** A decorative desktop marquee with a fully interactive static reader and source list. */
export default function LiveMarketTicker({ onSelectCountry, refreshToken = 0, className = '' }: { onSelectCountry?: (code: string) => void; refreshToken?: number; className?: string }) {
  const { data, loading, error } = useLiveMarkets(refreshToken);
  const [paused, setPaused] = useState(false);
  const [scope, setScope] = useState<MarketScope>('Africa');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const group = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const items = useMemo(() => marketTickerItems(data, scope), [data, scope]);
  const foundIndex = items.findIndex(item => item.id === selectedId);
  const index = foundIndex < 0 ? 0 : foundIndex;
  const current = items[index];
  const sources = data?.availability ?? [];
  const retained = Boolean(data) && (error || sources.some(source => source.status === 'stale'));
  const partial = sources.some(source => ['unavailable', 'partial', 'not_configured'].includes(source.status));

  useEffect(() => {
    const element = group.current;
    if (!element) return;
    const viewport = element.parentElement!.parentElement!;
    const measure = () => { setDistance(element.getBoundingClientRect().width); setViewportWidth(viewport.getBoundingClientRect().width); };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [items]);

  const move = (direction: number) => { if (items.length) setSelectedId(items[(index + direction + items.length) % items.length].id); };
  const style = { '--ticker-distance': distance + 'px', '--ticker-viewport': viewportWidth + 'px', '--ticker-duration': Math.max(distance / 40, 1) + 's' } as CSSProperties;

  return <section aria-label="Bandeau des marchés et événements" className={cn('market-ticker rounded-control border border-line bg-surface-1/80 text-[13px]', className)}>
    <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
      <div role="group" aria-label="Périmètre du bandeau" className="flex shrink-0 rounded-pill bg-black/50 p-0.5">
        {([['Africa', 'Afrique'], ['World', 'Monde']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={scope === value} onClick={() => { setScope(value); setSelectedId(null); }} className={cn('min-h-9 rounded-pill px-3 font-semibold transition-colors', scope === value ? 'bg-al-gold text-black' : 'text-text-muted hover:text-text')}>{label}</button>)}
      </div>
      {current ? <>
        <div className="ticker-marquee min-w-0 flex-1 overflow-hidden" aria-hidden="true">
          <div className="animate-ticker-scroll" data-paused={paused || distance === 0} style={style}>
            <div ref={group} className="ticker-group">{items.map(item => <div key={item.id} className="inline-flex shrink-0 items-center gap-2"><ItemContent item={item} /></div>)}</div>
            <div className="ticker-group" aria-hidden="true" inert>{items.map(item => <div key={item.id} className="inline-flex shrink-0 items-center gap-2"><ItemContent item={item} /></div>)}</div>
          </div>
        </div>
        <button type="button" aria-label={paused ? 'Reprendre le défilement' : 'Mettre en pause'} aria-pressed={paused} onClick={() => setPaused(value => !value)} className="ticker-pause inline-flex size-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-white/10 hover:text-text">{paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}</button>
        <div className="ticker-reader w-full min-w-0">
          <div className="flex items-start gap-2 px-1 py-2" aria-live="polite" aria-atomic="true">
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-2 gap-y-1 [overflow-wrap:anywhere]"><ItemContent item={current} interactive onSelectCountry={onSelectCountry} /></div>
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="min-w-0 text-xs text-text-muted">{current.kind === 'commodity' ? 'Marché mondial · dernière séance' : current.kind === 'alert' ? current.value.source ?? 'Dépêche' : current.value.label}</p>
            <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Parcourir le bandeau">
              <button type="button" aria-label="Information précédente" disabled={items.length < 2} onClick={() => move(-1)} className="inline-flex size-11 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronLeft aria-hidden="true" className="size-4" /></button>
              <span className="text-xs tabular-nums text-text-muted" aria-label={'Information ' + (index + 1) + ' sur ' + items.length}>{index + 1}/{items.length}</span>
              <button type="button" aria-label="Information suivante" disabled={items.length < 2} onClick={() => move(1)} className="inline-flex size-11 items-center justify-center rounded-full text-text-muted hover:bg-white/10 disabled:opacity-40"><ChevronRight aria-hidden="true" className="size-4" /></button>
            </div>
          </div>
        </div>
      </> : <p role="status" className="min-w-0 flex-1 px-2 py-2 text-text-muted">{loading ? 'Chargement des informations…' : error ? 'Les informations sont momentanément indisponibles.' : 'Aucune information pour ce périmètre.'}</p>}
    </div>
    <details className="ticker-details border-t border-line px-3 py-1.5">
      <summary className="cursor-pointer text-xs text-text-muted hover:text-text">Voir tout, sources et dates{retained ? ' · Données conservées' : partial ? ' · Certaines sources indisponibles' : loading && data ? ' · Actualisation…' : ''}</summary>
      <div className="mt-2 space-y-3 pb-2">
        <p className="text-xs text-text-muted">{scope === 'Africa' ? 'Dépêches africaines, devises CFA et marchés mondiaux utiles à l’Afrique.' : 'Dépêches internationales et marchés mondiaux. Les localisations inconnues sont signalées.'} Les variations comparent la cotation à la séance précédente.</p>
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
