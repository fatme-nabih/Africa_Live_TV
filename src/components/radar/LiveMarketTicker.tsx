'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RefreshCw, ExternalLink } from 'lucide-react';
import type { LiveMarketsSnapshot } from '@/lib/live-markets-types';
import { formatMarketPrice, formatVariation } from '@/lib/market-format';
import { sourcePlaceholder, type RadarSourceRow } from '@/lib/radar-workspace';
import { canonicalArticleUrl, formatRadarDate, radarStatusLabel } from '@/lib/radar-data';

export default function LiveMarketTicker({ onSelectCountry, onSourcesChange, refreshToken = 0, className = '' }: { onSelectCountry?: (code: string) => void; onSourcesChange?: (sources: RadarSourceRow[]) => void; refreshToken?: number; className?: string }) {
  const [data, setData] = useState<LiveMarketsSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [scope, setScope] = useState<'Africa' | 'World'>('Africa');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/live/markets' + (refresh ? '?refresh=true' : ''), { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Unavailable');
        const snapshot = await response.json() as LiveMarketsSnapshot;
        if (!Array.isArray(snapshot.alerts) || !Array.isArray(snapshot.commodities) || !Array.isArray(snapshot.forex)) throw new Error('Invalid payload');
        if (active) { setData(snapshot); setError(false); }
      } catch { if (active && !controller.signal.aborted) { setError(true); setData(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 6 * 60 * 60_000 ? previous : null); } }
      finally { if (active) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => void load(), 5 * 60_000);
    return () => { active = false; controller.abort(); window.clearInterval(interval); };
  }, [refresh, refreshToken]);

  useEffect(() => {
    onSourcesChange?.(error ? [sourcePlaceholder('Marchés et événements', 'Cotations et événements', 'unavailable')]
      : data?.availability?.map(source => ({ ...source, scope: `Bandeau · ${source.scope}` })) ?? [sourcePlaceholder('Marchés et événements', 'Cotations et événements', loading ? 'loading' : 'empty')]);
  }, [data, error, loading, onSourcesChange]);

  const items = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const result: Array<{ id: string; content: React.ReactNode }> = [];
    for (const alert of data.alerts) {
      if (scope === 'Africa' && alert.scope !== 'Africa') continue;
      const id = `alert:${canonicalArticleUrl(alert.url ?? '') || alert.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawUrl = canonicalArticleUrl(alert.url ?? '');
      const safeUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
      result.push({ id, content: <span className="inline-flex items-center gap-2 text-xs text-text">
        <strong>{alert.title}</strong>
        {alert.countryCode && alert.scope === 'Africa' && <button type="button" onClick={() => onSelectCountry?.(alert.countryCode!)} className="rounded bg-white/10 px-1">{alert.countryCode}</button>}
        <span className="text-xs text-text-muted">{alert.source ?? 'Source inconnue'} · {alert.dateKind === 'event' ? 'Événement' : 'Publication'} {formatRadarDate(alert.timestamp)} · {alert.scope === 'Africa' ? 'Afrique' : 'Monde / lieu non classé'}</span>
        {safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Source : ${alert.title}`}><ExternalLink className="h-3 w-3" /></a>}
      </span> });
    }
    for (const quote of data.commodities) {
      const id = `quote:${quote.symbol}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({ id, content: <span className="inline-flex items-center gap-2 text-xs text-text"><strong>{quote.label}</strong><span>{formatMarketPrice(quote.price, quote.currency, quote.unit)}</span><span>{formatVariation(quote.changePercent24h).text}</span><span className="text-xs text-text-muted">Monde · {quote.source} · Dernière séance {formatRadarDate(quote.updatedAt)}</span></span> });
    }
    for (const rate of data.forex) {
      const id = `forex:${rate.pair}`;
      if (seen.has(id)) continue;
      seen.add(id);
      result.push({ id, content: <span className="inline-flex items-center gap-2 text-xs text-text"><strong>{rate.pair}</strong><span>{rate.rate.toFixed(3)}</span><span className="text-xs text-text-muted">{rate.isPegged ? 'Parité fixe · ' + rate.source : 'Monde · ' + rate.source + ' · ' + formatRadarDate(rate.updatedAt)}</span></span> });
    }
    return result;
  }, [data, scope, onSelectCountry]);
  const degraded = error || data?.availability?.some(source => ['stale', 'unavailable', 'partial'].includes(source.status));

  return <section aria-label="Bandeau des marchés et événements" className={`border-t border-line bg-black/40 ${className}`}>
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs text-text">
      <label>Périmètre du bandeau <select aria-label="Périmètre du bandeau" value={scope} onChange={event => setScope(event.target.value as 'Africa' | 'World')} className="rounded bg-surface-2 px-2 py-1"><option value="Africa">Afrique</option><option value="World">Monde</option></select></label>
      <span className="text-text-muted">Cotations mondiales identifiées séparément</span>
      <span role="status" className={degraded ? 'text-text' : 'text-text-muted'}>{loading ? 'Chargement du bandeau…' : degraded ? 'Bandeau partiel · sources indisponibles ou données anciennes' : items.length ? 'Dates et sources affichées' : 'Aucun résultat fourni par les sources consultées'}</span>
      <button type="button" aria-label={paused ? 'Reprendre le défilement' : 'Mettre en pause'} onClick={() => setPaused(value => !value)} className="ml-auto rounded p-2 hover:bg-white/10">{paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}</button>
      <button type="button" aria-label="Actualiser les cotations" disabled={loading} onClick={() => setRefresh(value => value + 1)} className="rounded p-2 hover:bg-white/10"><RefreshCw className="h-3 w-3" /></button>
    </div>
    {items.length > 0 && <div className="overflow-hidden py-2">
      <div className={`animate-ticker-scroll motion-reduce:animate-none flex w-max gap-8 px-4 hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] ${paused ? '[animation-play-state:paused]' : ''}`}>
        {items.map(item => <div key={`original:${item.id}`} className="shrink-0">{item.content}</div>)}
        <div aria-hidden="true" inert className="flex gap-8 motion-reduce:hidden">{items.map(item => <div key={`copy:${item.id}`} className="shrink-0">{item.content}</div>)}</div>
      </div>
    </div>}
    {data?.availability && <details className="px-3 pb-2 text-xs text-text-muted"><summary>Sources du bandeau</summary><ul>{data.availability.map((source, index) => <li key={`${source.provider}:${index}`}>{source.provider} : {radarStatusLabel(source.status)} · dernier succès {formatRadarDate(source.lastSuccessAt)} · données {formatRadarDate(source.dataAt)}</li>)}</ul></details>}
  </section>;
}
