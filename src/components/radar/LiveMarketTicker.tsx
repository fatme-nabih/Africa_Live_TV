'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Pause,
  Play,
} from 'lucide-react';
import type {
  LiveMarketsSnapshot,
  MarketCommodity,
  MarketForex,
} from '@/lib/live-markets-types';
import { formatMarketPrice, formatVariation } from '@/lib/live-markets';

interface LiveMarketTickerProps {
  onSelectCountry?: (code: string) => void;
  className?: string;
}

const REFRESH_INTERVAL_MS = 5 * 60_000;

function sanitizeExternalUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return null;
  }
  try {
    return encodeURI(trimmed);
  } catch {
    return null;
  }
}

export default function LiveMarketTicker({
  onSelectCountry,
  className = '',
}: LiveMarketTickerProps) {
  const [data, setData] = useState<LiveMarketsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch('/api/live/markets', { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: LiveMarketsSnapshot = await res.json();
        if (active) setData(json);
      } catch {
        // Silencieux
      }
    }

    void load();
    const timer = setInterval(() => {
      void load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, []);

  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/live/markets?refresh=true');
      if (res.ok) {
        const json: LiveMarketsSnapshot = await res.json();
        setData(json);
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  };

  // Éléments du ticker normalisés
  const tickerItems = useMemo(() => {
    if (!data) return [];

    const items: Array<{
      id: string;
      kind: 'alert' | 'commodity' | 'forex';
      content: React.ReactNode;
    }> = [];

    // 1. Alertes d'urgence en tête
    data.alerts.forEach((alert) => {
      const isCritical = alert.severity === 'critical';
      items.push({
        id: alert.id,
        kind: 'alert',
        content: (
          <div
            className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition ${
              isCritical
                ? 'border-red-500/40 bg-red-950/40 text-red-200 hover:border-red-400'
                : 'border-amber-500/30 bg-amber-950/30 text-amber-200 hover:border-amber-400'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  isCritical ? 'bg-red-400' : 'bg-amber-400'
                } opacity-75`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isCritical ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
            <span className="font-semibold">{alert.title}</span>
            {alert.countryCode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCountry?.(alert.countryCode!);
                }}
                className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-white/20"
                title={`Centrer sur ${alert.countryCode}`}
              >
                {alert.countryCode}
              </button>
            )}
            {(() => {
              const safeUrl = sanitizeExternalUrl(alert.url);
              if (!safeUrl) return null;
              return (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white"
                  title="Consulter la source"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              );
            })()}
          </div>
        ),
      });
    });

    // 2. Matières premières stratégiques
    data.commodities.forEach((item: MarketCommodity) => {
      const variation = formatVariation(item.changePercent24h);
      items.push({
        id: `com-${item.symbol}`,
        kind: 'commodity',
        content: (
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c120f] px-2.5 py-1 text-xs text-zinc-200">
            <span className="font-bold text-white">{item.label}</span>
            <span className="font-mono text-zinc-300">
              {formatMarketPrice(item.price, item.currency, item.unit)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                variation.isNeutral
                  ? 'bg-zinc-800 text-zinc-400'
                  : variation.isPositive
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-red-500/15 text-red-400'
              }`}
            >
              {variation.isNeutral ? (
                <Minus className="h-2.5 w-2.5" />
              ) : variation.isPositive ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {variation.text}
            </span>
          </div>
        ),
      });
    });

    // 3. Devises clés et parités
    data.forex.forEach((item: MarketForex) => {
      items.push({
        id: `forex-${item.pair}`,
        kind: 'forex',
        content: (
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c120f] px-2.5 py-1 text-xs text-zinc-200">
            <span className="font-bold text-amber-300">{item.pair}</span>
            <span className="font-mono font-semibold text-white">
              {item.isPegged
                ? item.rate.toFixed(3)
                : item.rate >= 10
                  ? item.rate.toFixed(2)
                  : item.rate.toFixed(4)}
            </span>
            {item.isPegged ? (
              <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-300">
                Fixe BCEAO/BEAC
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500">Flottant</span>
            )}
          </div>
        ),
      });
    });

    return items;
  }, [data, onSelectCountry]);

  if (!data && loading) {
    return (
      <div className={`flex h-10 w-full items-center justify-between border-y border-white/[0.08] bg-[#060907] px-4 text-xs text-zinc-400 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
          <span>Chargement du bandeau marchés & alertes…</span>
        </div>
      </div>
    );
  }

  if (tickerItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`group relative flex h-11 w-full items-center overflow-hidden border-y border-white/[0.08] bg-[#050806]/95 backdrop-blur-md ${className}`}
      role="region"
      aria-label="Bandeau des marchés et alertes panafricaines"
    >
      {/* Badge fixe à gauche type Bloomberg / Salle de crise */}
      <div className="z-10 flex shrink-0 items-center gap-2 border-r border-white/[0.1] bg-[#080d0a] px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-300 sm:text-xs">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="hidden sm:inline">Marchés & Alertes</span>
        <span className="sm:hidden">Marchés</span>
      </div>

      {/* Piste de défilement horizontal continu */}
      <div
        className="relative flex flex-1 items-center overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_2%,black_98%,transparent)]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`animate-ticker-scroll flex items-center gap-4 px-4 ${
            isPaused ? '[animation-play-state:paused]' : ''
          }`}
        >
          {/* Première passe */}
          {tickerItems.map((item) => (
            <div key={`p1-${item.id}`} className="shrink-0">
              {item.content}
            </div>
          ))}

          {/* Deuxième passe identique pour créer la boucle infinie continue */}
          {tickerItems.map((item) => (
            <div key={`p2-${item.id}`} className="shrink-0" aria-hidden="true">
              {item.content}
            </div>
          ))}
        </div>
      </div>

      {/* Contrôles discrets à droite (pause/lecture & actualisation manuelle) */}
      <div className="z-10 flex shrink-0 items-center gap-1 border-l border-white/[0.1] bg-[#080d0a] px-2 py-1.5 text-zinc-400">
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          className="rounded p-1 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          title={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
          aria-label={isPaused ? 'Reprendre le défilement' : 'Mettre en pause'}
        >
          {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => void handleManualRefresh()}
          disabled={loading}
          className="rounded p-1 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
          title="Actualiser les cotations"
          aria-label="Actualiser les cotations"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
