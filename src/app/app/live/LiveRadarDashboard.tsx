'use client';

import { useCallback, useEffect, useMemo, useState, Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import RadarSourcesPanel from '@/components/radar/RadarSourcesPanel';
import { radarCountry, radarCountryUrl, sourcePlaceholder, type RadarSourceRow } from '@/lib/radar-workspace';
import Link from 'next/link';
import AppNavigation, { AppBrand } from '@/components/AppNavigation';
import BrandWatermark from '@/components/BrandWatermark';
import LocalAccountControls from '@/components/LocalAccountControls';
import Player from '@/components/Player';
import LiveMarketTicker from '@/components/radar/LiveMarketTicker';
import { canonicalArticleUrl, temporalWindow, formatRadarDate, radarSource } from '@/lib/radar-data';
import { launchPlayer } from '@/lib/player-window';
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { QUICK_WEATHER_LOCATIONS } from '@/lib/weather-locations';
import { useLiveWeather } from '@/components/radar/useLiveWeather';
import type { RadarArticle, RadarCountry } from '@/lib/live-osint-types';
import type { WeatherIconType } from '@/lib/live-weather-types';
import type { RadarRssSnapshot } from '@/lib/rss-collector-types';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { Channel } from '@/types/channel';
import {
  ArrowRight,
  ArrowUpRight,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  ExternalLink,
  Info,
  MapPin,
  Moon,
  Newspaper,
  Play,
  Radar,
  RefreshCw,
  Rss,
  Sparkles,
  Sun,
  Tv,
  Wind,
  X,
} from 'lucide-react';

const TacticalVectorMap = dynamic(
  () => import('@/components/radar/TacticalVectorMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] sm:h-[520px] w-full flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm p-6 text-center text-zinc-500">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="text-xs font-bold text-zinc-400">Chargement de la carte vectorielle tactique...</p>
      </div>
    ),
  },
);

const REFRESH_INTERVAL_MS = 5 * 60_000;
const TIMEZONE = 'Africa/Dakar';

function WeatherIconDisplay({
  icon,
  isDay,
}: {
  icon: WeatherIconType;
  isDay: boolean | null;
}) {
  if (isDay === null || icon === 'unknown') return <Cloud aria-hidden="true" className="h-6 w-6 text-zinc-300" />;
  switch (icon) {
    case 'clear':
      return isDay ? (
        <Sun aria-hidden="true" className="h-6 w-6 text-amber-300" />
      ) : (
        <Moon aria-hidden="true" className="h-6 w-6 text-sky-200" />
      );
    case 'partly-cloudy':
      return <CloudSun aria-hidden="true" className="h-6 w-6 text-amber-200" />;
    case 'cloudy':
      return <Cloud aria-hidden="true" className="h-6 w-6 text-zinc-300" />;
    case 'rain':
      return <CloudRain aria-hidden="true" className="h-6 w-6 text-sky-300" />;
    case 'storm':
      return <CloudLightning aria-hidden="true" className="h-6 w-6 text-yellow-300" />;
    case 'fog':
      return <CloudFog aria-hidden="true" className="h-6 w-6 text-amber-200/90" />;
    default:
      return <CloudSun aria-hidden="true" className="h-6 w-6 text-zinc-300" />;
  }
}

export default function LiveRadarDashboard() {
  return <Suspense fallback={<p className="p-4">Chargement du Radar…</p>}><RadarWorkspace /></Suspense>;
}

function RadarWorkspace() {
  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const countryParam = searchParams.get('country');
  const selectedCountry = radarCountry(countryParam);
  const setSelectedCountry = useCallback((code: string | null) => {
    const next = radarCountryUrl(window.location.href, radarCountry(code));
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.pushState(null, '', next);
    }
  }, []);
  const [mapRequested, setMapRequested] = useState(false);
  const [desktopMap, setDesktopMap] = useState(false);
  const [tickerSources, setTickerSources] = useState<RadarSourceRow[]>([]);
  const showMap = desktopMap || mapRequested;
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1280px)');
    const update = () => setDesktopMap(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clock, setClock] = useState('');

  const [asOf, setAsOf] = useState(0);
  const [summaryError, setSummaryError] = useState(false);
  const [rss, setRss] = useState<RadarRssSnapshot | null>(null);

  const [channelsSummary, setChannelsSummary] = useState<LiveChannelsSummarySnapshot | null>(null);
  const [countryChannels, setCountryChannels] = useState<Channel[]>([]);
  const [countryChannelsLoading, setCountryChannelsLoading] = useState(false);
  const [countryChannelsError, setCountryChannelsError] = useState<string | null>(null);
  const [activePlayChannel, setActivePlayChannel] = useState<Channel | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'news' | 'channels'>('news');

  const activeWeatherCode = selectedCountry ?? 'SN';
  const { weather, weatherError, weatherLoading, retryBlocked } = useLiveWeather(activeWeatherCode, refreshToken);

  useEffect(() => {
    const tick = () => setClock(new Intl.DateTimeFormat('fr-FR', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date()));
    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const load = async () => {
      setRefreshing(true);
      try {
        const response = await fetch('/api/live/rss', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Flux RSS des rédactions indisponible');
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !Array.isArray((body as RadarRssSnapshot).articles)) throw new Error('Format invalide');
        if (!Array.isArray((body as RadarRssSnapshot).sources) || typeof (body as RadarRssSnapshot).updatedAt !== 'string') throw new Error('Format RSS invalide');
        if (!active) return;
        setAsOf(Date.now());
        setRss(body as RadarRssSnapshot);
        setNewsError(null);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setRss(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 45 * 60_000 ? { ...previous, stale: true } : null);
          setNewsError(error instanceof Error ? error.message : 'Impossible de charger le fil des dépêches.');
        }
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadChannelsSummary = async () => {
      try {
        const response = await fetch('/api/live/channels?summary=true', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Catalogue indisponible');
        const body: unknown = await response.json();
        if (!active) return;
        if (body && typeof body === 'object' && 'countries' in body) {
          setChannelsSummary(body as LiveChannelsSummarySnapshot);
          setSummaryError(false);
        }
      } catch {
        if (active && !controller.signal.aborted) setSummaryError(true);
      }
    };

    void loadChannelsSummary();
    const interval = window.setInterval(() => void loadChannelsSummary(), 10 * 60_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshToken]);

  useEffect(() => {
    if (!selectedCountry) return;

    let active = true;
    const controller = new AbortController();

    const loadCountryChannels = async () => {
      setCountryChannels([]);
      setCountryChannelsLoading(true);
      setCountryChannelsError(null);
      try {
        const response = await fetch(
          `/api/live/channels?country=${encodeURIComponent(selectedCountry)}`,
          {
            signal: controller.signal,
            cache: 'no-store',
          },
        );
        if (!response.ok) {
          throw new Error('Impossible de charger les chaînes de ce pays.');
        }
        const body = (await response.json()) as { channels?: Channel[] };
        if (!active) return;
        if (Array.isArray(body.channels)) {
          setCountryChannels(body.channels);
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setCountryChannelsError(
            error instanceof Error ? error.message : 'Erreur de chargement des chaînes.',
          );
        }
      } finally {
        if (active) setCountryChannelsLoading(false);
      }
    };

    void loadCountryChannels();
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCountry, refreshToken]);

  const handleOpenPopout = useCallback((channel: Channel) => {
    launchPlayer({
      channelId: channel.id,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      openWindow: (url, target, features) => window.open(url, target, features),
      navigateCurrentTab: (url) => window.location.assign(url),
    });
  }, []);

  const handleSelectCountryForChannels = useCallback((countryCode: string) => {
    setSelectedCountry(countryCode);
    setRightPanelTab('channels');
  }, [setSelectedCountry]);

  const rssArticles = useMemo<RadarArticle[]>(() => {
    return [...(rss?.articles ?? []), ...(rss?.undatedArticles ?? [])].map((a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      indexedAt: a.publishedAt ?? '',
      publishedAt: a.publishedAt,
      countryBasis: a.countryBasis ?? 'inferred_topic',
      countryCode: a.countryCode,
      sourceType: 'rss',
      sourceName: a.sourceName,
      category: a.category,
      editorialScope: a.editorialScope,
    }));
  }, [rss]);

  const allMergedArticles = useMemo<RadarArticle[]>(() => {
    const seen = new Set<string>();
    const merged: RadarArticle[] = [];
    for (const art of rssArticles) {
      const key = canonicalArticleUrl(art.url);
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(art);
      }
    }
    return merged.sort((a, b) => (Date.parse(b.indexedAt) || 0) - (Date.parse(a.indexedAt) || 0));
  }, [rssArticles]);

  const [scopeTab, setScopeTab] = useState<'all' | 'africa' | 'international'>('all');

  const windowed = useMemo(() => temporalWindow(allMergedArticles, a => a.indexedAt, asOf), [allMergedArticles, asOf]);
  const isInternational = useCallback((a: RadarArticle) => a.editorialScope === 'international', []);

  const baseCountryArticles = useMemo(() => {
    return windowed.recent.filter((a) => !selectedCountry || a.countryCode === selectedCountry);
  }, [windowed.recent, selectedCountry]);

  const visibleArticles = useMemo(() => {
    return baseCountryArticles.filter((a) => {
      if (scopeTab === 'africa') return !isInternational(a);
      if (scopeTab === 'international') return isInternational(a);
      return true;
    });
  }, [baseCountryArticles, scopeTab, isInternational]);

  const visibleUnknownArticles = useMemo(() => {
    const base = windowed.undated.filter((a) => !selectedCountry || a.countryCode === selectedCountry);
    return base.filter((a) => {
      if (scopeTab === 'africa') return !isInternational(a);
      if (scopeTab === 'international') return isInternational(a);
      return true;
    });
  }, [windowed.undated, selectedCountry, scopeTab, isInternational]);

  const tabCounts = useMemo(() => ({
    all: baseCountryArticles.length,
    africa: baseCountryArticles.filter((a) => !isInternational(a)).length,
    intl: baseCountryArticles.filter((a) => isInternational(a)).length,
  }), [baseCountryArticles, isInternational]);

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of windowed.recent) {
      if (article.countryCode) counts.set(article.countryCode, (counts.get(article.countryCode) ?? 0) + 1);
    }
    return counts;
  }, [windowed]);

  const domainsCount = new Set(visibleArticles.map(article => article.sourceName || article.domain)).size;

  const sourceRows: RadarSourceRow[] = [
    ...(rss?.availability ?? (rss ? [radarSource('RSS', 'Afrique · rédactions', Date.parse(rss.updatedAt), 5 * 60_000, rss.articles.length, { status: rss.stale ? 'stale' : undefined })] : [sourcePlaceholder('RSS', 'Afrique · rédactions', newsError?.includes('RSS') ? 'unavailable' : 'loading')])),
    ...(weather?.availability ?? [sourcePlaceholder('Open-Meteo', activeWeatherCode, weatherError ? 'unavailable' : 'loading')]),
    channelsSummary ? radarSource('Catalogue TV', 'Afrique · références et candidates', Date.parse(channelsSummary.updatedAt), 10 * 60_000, channelsSummary.totalChannels, { status: summaryError || channelsSummary.stale ? 'stale' : undefined, dataAt: channelsSummary.updatedAt }) : sourcePlaceholder('Catalogue TV', 'Afrique', summaryError ? 'unavailable' : 'loading'),
    ...(tickerSources.length ? tickerSources : [sourcePlaceholder('Marchés / bandeau', 'Cotations et événements', 'loading')]),
  ];

  const activeCountry = AFRICAN_COUNTRIES.find((country) => country.code === selectedCountry) ?? null;

  return (
    <main className="relative min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-yellow-400/25 selection:text-yellow-100">
      {/* Brand transparent background watermark */}
      <BrandWatermark />

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/50 px-4 py-2.5 shadow-2xl backdrop-blur-2xl sm:px-6 sm:py-3">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <AppBrand />
          <AppNavigation country={selectedCountry} />

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-zinc-400 sm:flex">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400">HEURE DE DAKAR</span>
              <span className="font-mono tabular-nums text-zinc-200">{clock || '—'}</span>
              <span className="text-zinc-500">GMT</span>
            </div>
            <LocalAccountControls />

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl w-full flex-1 px-3 pb-8 pt-3 sm:px-6 sm:pt-4 md:px-6">
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">Radar Afrique</h1>
            <p className="mt-0.5 text-xs text-zinc-400">Dépêches, météo et télévisions par pays.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              title="Le briefing reste désactivé jusqu’à sa prochaine implémentation."
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-zinc-500 cursor-not-allowed"
            >
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Briefing — bientôt</span>
            </button>
            <button
              type="button"
              onClick={() => setRefreshToken(value => value + 1)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm"
            >
              <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualisation…' : 'Actualiser'}</span>
            </button>
          </div>
        </section>

        <section aria-label="Sélection du pays" className="relative mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/40 p-2.5 sm:p-3 shadow-xl backdrop-blur-xl">
          <label htmlFor="radar-country" className="text-xs font-bold text-zinc-300">Choisir un pays</label>
          <select
            id="radar-country"
            aria-label="Choisir un pays"
            aria-describedby="radar-country-help"
            value={selectedCountry ?? ''}
            onChange={event => setSelectedCountry(event.target.value || null)}
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-xs text-zinc-100 hover:border-white/20 focus-visible:border-amber-400/60 focus-visible:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
          >
            <option value="" className="bg-zinc-900 text-zinc-100">Afrique · tous les pays</option>
            {AFRICAN_COUNTRIES.map(country => (
              <option key={country.code} value={country.code} className="bg-zinc-900 text-zinc-100">{country.name}</option>
            ))}
          </select>
          {selectedCountry && (
            <button
              type="button"
              onClick={() => setSelectedCountry(null)}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Réinitialiser le pays
            </button>
          )}
          <p id="radar-country-help" className="sr-only">Sélectionnez au clavier ou tapez le début du nom dans la liste. Le pays est conservé dans le lien ; la carte utilise le même choix.</p>
          {countryParam && !selectedCountry && <p role="status" className="w-full text-xs text-amber-200">Pays inconnu dans le lien : vue Afrique affichée.</p>}
        </section>

        <section aria-label="Indicateurs de veille" className="mb-4 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="Résultats chargés · 24 h"
            value={rss ? String(visibleArticles.length) : '—'}
            icon={<Newspaper className="h-5 w-5" />}
            accentColor="amber"
          />
          <MetricCard
            label="Médias & Rédactions"
            value={rss ? String(domainsCount) : '—'}
            icon={<Radar className="h-5 w-5" />}
            accentColor="emerald"
          />
          <MetricCard
            label="Pays représentés"
            value={rss ? String(new Set(visibleArticles.map(a => a.countryCode).filter(Boolean)).size) : '—'}
            icon={<MapPin className="h-5 w-5" />}
            accentColor="rose"
          />
          <MetricCard
            label="Chaînes référencées"
            value={channelsSummary ? String(channelsSummary.totalChannels) : '—'}
            subLabel={channelsSummary ? `${channelsSummary.totalDirectWeb} web · ${channelsSummary.totalDirectVlc ?? 0} VLC` : undefined}
            icon={<Tv className="h-5 w-5" />}
            accentColor="amber"
          />
        </section>

        <RadarSourcesPanel sources={sourceRows} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <article aria-label="Fil et chaînes du pays" className="relative flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-xl xl:col-span-5">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            {/* Embedded PiP Mini-Player Dock */}
            {activePlayChannel && (
              <div className="border-b border-white/[0.08] bg-black/90 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                    </span>
                    <span className="truncate text-xs font-bold text-white">
                      EN DIRECT : {activePlayChannel.name}
                    </span>
                    {activeCountry && (
                      <span className="hidden sm:inline-block rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-zinc-400">
                        {activeCountry.name}
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        activePlayChannel.playbackMode === 'BROWSER'
                          ? 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                          : 'border border-amber-400/20 bg-amber-400/10 text-amber-300'
                      }`}
                    >
                      {activePlayChannel.playbackMode === 'BROWSER' ? 'Web' : 'VLC'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenPopout(activePlayChannel)}
                      title="Ouvrir dans une fenêtre popout"
                      aria-label="Ouvrir dans une fenêtre popout"
                      className="flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 text-[10px] font-semibold text-zinc-300 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-white"
                    >
                      <ExternalLink className="h-3 w-3 text-amber-300" />
                      <span className="hidden sm:inline">Fenêtre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePlayChannel(null)}
                      title="Fermer le lecteur direct"
                      aria-label="Fermer le lecteur direct"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-red-400/40 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
                  <Player channelId={activePlayChannel.id} channelName={activePlayChannel.name} />
                </div>
              </div>
            )}

            {/* Navigation Tabs : Dépêches vs Chaînes en direct */}
            <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/40 px-3 py-2 sm:px-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('news')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    rightPanelTab === 'news'
                      ? 'border border-amber-400/40 bg-gradient-to-r from-emerald-500/15 via-amber-400/20 to-rose-500/15 text-white font-bold shadow-sm backdrop-blur-sm'
                      : 'border border-transparent bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] hover:border-white/10 font-medium'
                  }`}
                >
                  <Newspaper className="h-3.5 w-3.5 text-amber-300" />
                  <span>Dépêches ({tabCounts.all})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('channels')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    rightPanelTab === 'channels'
                      ? 'border border-amber-400/40 bg-gradient-to-r from-emerald-500/15 via-amber-400/20 to-rose-500/15 text-white font-bold shadow-sm backdrop-blur-sm'
                      : 'border border-transparent bg-white/[0.02] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] hover:border-white/10 font-medium'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    Chaînes TV (
                    {selectedCountry
                      ? (channelsSummary?.countries[selectedCountry]?.channelCount ?? countryChannels.length)
                      : (channelsSummary?.totalChannels ?? 0)}
                    )
                  </span>
                </button>
              </div>

              {activeCountry && (
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span className="font-semibold text-emerald-300">{activeCountry.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCountry(null)}
                    aria-label={`Retirer le filtre ${activeCountry.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {rightPanelTab === 'channels' ? (
              <CountryChannelsView
                selectedCountry={selectedCountry}
                activeCountry={activeCountry}
                countryChannels={countryChannels}
                loading={countryChannelsLoading}
                error={countryChannelsError}
                channelsSummary={channelsSummary}
                activePlayChannelId={activePlayChannel?.id ?? null}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onPlayChannel={(ch) => setActivePlayChannel(ch)}
                onOpenPopout={handleOpenPopout}
                onRetry={() => setRefreshToken((v) => v + 1)}
              />
            ) : (
              <>
                <div className="flex flex-col gap-2.5 border-b border-white/[0.07] px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
                          <Newspaper aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                        Fil des dépêches
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {activeCountry ? `Dépêches liées à : ${activeCountry.name}` : 'Rédactions africaines et internationales'} · {visibleArticles.length} résultats datés · 24 h
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rss && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {rss.availability?.filter(source => source.status === 'available' || source.status === 'empty').length ?? rss.sources.length} sources RSS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scope filter tabs: Toutes / Afrique & National / International */}
                  <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-black/50 p-1">
                    <button
                      type="button"
                      onClick={() => setScopeTab('all')}
                      className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        scopeTab === 'all'
                          ? 'border border-amber-400/40 bg-amber-400/15 text-amber-200 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      Toutes ({tabCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeTab('africa')}
                      className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        scopeTab === 'africa'
                          ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-200 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      Afrique & National ({tabCounts.africa})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeTab('international')}
                      className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
                        scopeTab === 'international'
                          ? 'border border-sky-400/40 bg-sky-400/15 text-sky-200 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      International ({tabCounts.intl})
                    </button>
                  </div>
                </div>

                {activeCountry && (
                  <div className="flex items-center justify-between border-b border-emerald-200/10 bg-emerald-300/[0.05] px-4 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-100">Filtre pays : <strong>{activeCountry.name}</strong></span>
                      {channelsSummary?.countries[activeCountry.code]?.channelCount ? (
                        <button
                          type="button"
                          onClick={() => setRightPanelTab('channels')}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 transition hover:bg-amber-400/20"
                        >
                          <Tv className="h-2.5 w-2.5" />
                          <span>{channelsSummary.countries[activeCountry.code].channelCount} chaînes TV</span>
                        </button>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setSelectedCountry(null)} className="text-zinc-400 hover:text-white">Tout afficher</button>
                  </div>
                )}

                {newsError && rss && (
                  <div role="status" className="border-b border-amber-200/10 bg-amber-200/[0.04] px-4 py-2 text-[11px] text-amber-100/80 sm:px-5">
                    {newsError} Les dernières dépêches chargées restent consultables.
                  </div>
                )}

                <div aria-live="polite" className="flex-1 divide-y divide-white/[0.055] overflow-y-auto xl:max-h-[515px]">
                  {newsError && !rss ? (
                    <div className="m-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
                      <p>{newsError}</p>
                      <button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="mt-3 font-bold text-amber-200 underline underline-offset-4">Réessayer</button>
                    </div>
                  ) : !rss ? (
                    <div className="space-y-3 p-4" aria-label="Chargement des dépêches">
                      {[0, 1, 2, 3].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-white/[0.035]" />)}
                    </div>
                  ) : visibleArticles.length === 0 ? (
                    <div className="p-8 text-center">
                      <Newspaper aria-hidden="true" className="mx-auto h-7 w-7 text-zinc-600" />
                      <p className="mt-3 text-sm font-bold text-zinc-300">
                        {activeCountry
                          ? `Aucune dépêche pour : ${activeCountry.name}`
                          : 'Aucune dépêche dans ce filtre'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {activeCountry
                          ? scopeTab !== 'all' && tabCounts.all > 0
                            ? `Ce pays a ${tabCounts.all} dépêche(s) dans d'autres rubriques.`
                            : `Ce pays n'a pas de dépêche récente dans ce flux.`
                          : 'Essayez une autre rubrique ou effacez la sélection.'}
                      </p>
                      <div className="mt-3.5 flex flex-wrap justify-center gap-2">
                        {scopeTab !== 'all' && tabCounts.all > 0 && (
                          <button
                            type="button"
                            onClick={() => setScopeTab('all')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20"
                          >
                            Toutes les rubriques ({tabCounts.all})
                          </button>
                        )}
                        {selectedCountry && (
                          <button
                            type="button"
                            onClick={() => setSelectedCountry(null)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
                          >
                            Effacer le filtre pays
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    visibleArticles.map((article) => (
                      <ArticleRow
                        key={canonicalArticleUrl(article.url)}
                        article={article}
                        country={AFRICAN_COUNTRIES.find((country) => country.code === article.countryCode)}
                        channelCount={article.countryCode ? channelsSummary?.countries[article.countryCode]?.channelCount : undefined}
                        onSelectCountryForChannels={handleSelectCountryForChannels}
                        onSelectCountry={(code) => setSelectedCountry(code)}
                      />
                    ))
                  )}
                </div>

                {visibleUnknownArticles.length > 0 && <section aria-label="Dépêches sans date" className="border-t border-amber-300/20">
                  <h2 className="p-3 text-xs text-amber-200">Date inconnue · {visibleUnknownArticles.length} titres exclus des compteurs 24 h</h2>
                  {visibleUnknownArticles.map(article => <ArticleRow key={canonicalArticleUrl(article.url)} article={article} country={AFRICAN_COUNTRIES.find(country => country.code === article.countryCode)} onSelectCountry={setSelectedCountry} />)}
                </section>}
                <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] leading-4 text-zinc-500 sm:px-5">
                  Les liens ouvrent les publications d’origine. Africa Live affiche les titres et métadonnées de veille, sans reprendre le contenu des articles.
                </div>
              </>
            )}
          </article>
          <article aria-label="Carte du Radar" className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-xl xl:col-span-7">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                    <Radar aria-hidden="true" className="h-4 w-4" />
                  </span>
                  Carte des médias et du catalogue
                </div>
                <p className="mt-1.5 text-xs text-zinc-400">
                  Médias et chaînes de télévision africaines géolocalisées par pays.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                2D / Globe 3D · MapLibre GL
              </span>
            </div>

            <div className="p-2 sm:p-3">
              {!desktopMap && <button type="button" aria-expanded={mapRequested} aria-controls="radar-map" onClick={() => setMapRequested(value => !value)} className="mb-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">{mapRequested ? 'Masquer la carte' : 'Afficher la carte'}</button>}
              <div id="radar-map">{showMap ? (
              <TacticalVectorMap
                countries={AFRICAN_COUNTRIES}
                countryCounts={countryCounts}
                channelsSummary={channelsSummary}
                selectedCountry={selectedCountry}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onSelectCountryForChannels={handleSelectCountryForChannels}
              />
              ) : <p className="p-3 text-xs text-zinc-400">Carte à la demande. Le choix du pays et les dépêches fonctionnent sans elle.</p>}</div>
            </div>

            <div className="border-t border-white/[0.07] bg-black/40 px-4 py-3 text-[11px] leading-5 text-zinc-400 sm:px-5">
              <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-300/80" />
              Fonds de carte Satellite haute résolution (Esri), Topographique (OpenFreeMap) et OpenStreetMap sous licence libre. Les marqueurs situent les médias indexés et les télévisions référencées.
            </div>
          </article>


        </section>

        <details className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 shadow-xl backdrop-blur-xl">
          <summary className="cursor-pointer p-3 sm:p-4 text-xs font-bold text-zinc-200 hover:text-white transition">Marchés et événements · bandeau daté</summary>
          <LiveMarketTicker onSelectCountry={setSelectedCountry} onSourcesChange={setTickerSources} refreshToken={refreshToken} />
        </details>
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 shadow-2xl backdrop-blur-xl lg:col-span-7">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
                  <CloudSun aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    Météo locale
                    <span className="text-zinc-600 font-normal">·</span>
                    <span className="text-sky-200">{weather?.current.locationName ?? (AFRICAN_COUNTRIES.find((c) => c.code === activeWeatherCode)?.name ?? 'Dakar')}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {weather ? `Observation · ${weather.current.source} · ${weather.current.transport === 'browser' ? 'navigateur' : 'serveur'}` : 'Observation au lieu sélectionné'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="weather-country-select"
                  aria-label="Choisir le pays ou la ville pour la météo"
                  value={activeWeatherCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedCountry(code);
                  }}
                  className="rounded-xl border border-white/[0.1] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:border-sky-400/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/50"
                >
                  <optgroup label={`Pays et territoires africains (${AFRICAN_COUNTRIES.length})`}>
                    {[...AFRICAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((c) => {
                      const city = QUICK_WEATHER_LOCATIONS.find(loc => loc.code === c.code);
                      return <option key={c.code} value={c.code} className="bg-zinc-900 text-zinc-100">
                        {c.name} ({c.code}){city ? ` · ${city.city}` : ' · point de référence'}
                      </option>;
                    })}
                  </optgroup>
                </select>

                {weather?.stale ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Relevé conservé · périmé
                  </span>
                ) : weather ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    {weather.availability[0].status === 'partial' ? 'Données partielles' : 'Relevé récent'}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick city selectors */}
            <div aria-label="Villes rapides" className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-black/40 px-4 py-2.5 text-xs no-scrollbar sm:px-5">
              {(weather?.quickLocations && weather.quickLocations.length > 0
                ? weather.quickLocations
                : QUICK_WEATHER_LOCATIONS
              ).map((loc) => {
                const isActive = activeWeatherCode === loc.code;
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(loc.code);
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                      isActive
                        ? 'border border-sky-300/40 bg-sky-400/20 text-sky-100 shadow-sm'
                        : 'border border-transparent bg-white/[0.03] text-zinc-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    <span>{loc.city}</span>
                    <span className="font-mono text-[9px] text-zinc-500">{loc.code}</span>
                  </button>
                );
              })}
            </div>

            {/* Weather body */}
            <div className="p-4 sm:p-5">
              {weatherError && weather && <p role="status" className="mb-3 text-xs text-amber-200">{weatherError} · Relevé conservé jusqu’à expiration.</p>}
              {weather?.current.timeAnomaly && <p className="mb-3 text-xs text-amber-200">Horodatage amont légèrement futur.</p>}
              {weatherError && !weather ? (
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs text-amber-100/90">
                  <p>{weatherError}</p>
                  <button
                    type="button"
                    onClick={() => setRefreshToken((v) => v + 1)}
                    className="mt-2 font-bold text-amber-200 underline underline-offset-4"
                  >
                    {retryBlocked ? 'Réessayer après le délai' : 'Réessayer'}
                  </button>
                </div>
              ) : weatherLoading && !weather ? (
                <div className="space-y-3" aria-label="Chargement de la météo">
                  <div className="h-20 animate-pulse rounded-xl bg-white/[0.035]" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/[0.02]" />
                </div>
              ) : weather ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-sky-300/20 bg-gradient-to-r from-sky-500/10 via-sky-400/5 to-transparent p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-[0_0_25px_-5px_rgba(56,189,248,0.25)]">
                        <WeatherIconDisplay
                          icon={weather.current.weatherIcon}
                          isDay={weather.current.isDay}
                        />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black tracking-tight text-white tabular-nums sm:text-4xl">
                            {weather.current.temperatureC}°C
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">
                            Ressenti {weather.current.apparentTemperatureC}°C
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-sky-200">
                          {weather.current.weatherDescription}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-zinc-100">
                        {weather.current.locationName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {weather.current.countryName} · {weather.current.region}
                      </div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-500">
                        {weather.current.timezone ?? 'Fuseau inconnu'}
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <Wind className="h-3 w-3 text-sky-300" />
                        Vent
                      </div>
                      <div className="mt-1 text-sm font-black text-white tabular-nums">
                        {weather.current.windSpeedKmh} <span className="text-[10px] font-normal text-zinc-400">km/h</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {weather.current.windDirectionCompass} ({weather.current.windDirectionDeg}°)
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <Droplets className="h-3 w-3 text-emerald-300" />
                        Humidité
                      </div>
                      <div className="mt-1 text-sm font-black text-white tabular-nums">
                        {weather.current.relativeHumidityPercent} <span className="text-[10px] font-normal text-zinc-400">%</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        Hygrométrie
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <CloudRain className="h-3 w-3 text-indigo-300" />
                        Pluie
                      </div>
                      <div className="mt-1 text-sm font-black text-white tabular-nums">
                        {weather.current.precipitationMm} <span className="text-[10px] font-normal text-zinc-400">mm</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        Précipitations
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <Compass className="h-3 w-3 text-amber-300" />
                        Relevé
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-white tabular-nums">
                        {weather.current.observedAt ? new Intl.DateTimeFormat('fr-FR', { timeZone: weather.current.timezone ?? 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(weather.current.observedAt)) : 'Date d’observation inconnue'}
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        {weather.current.timezone ? 'Heure locale' : 'UTC · fuseau du lieu inconnu'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/[0.07] bg-black/40 px-4 py-2.5 text-[10px] leading-4 text-zinc-400 sm:px-5 flex flex-wrap items-center justify-between gap-2">
              <span>
                <a
                  href={weather?.current.source === 'wttr.in' ? 'https://wttr.in/' : 'https://open-meteo.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-300 hover:text-sky-200 underline underline-offset-2"
                >
                  {weather?.current.attribution ?? 'Fournisseurs météo'}
                </a>{' '}
                · Relevé d’observation automatisé sans valeur d’alerte officielle de protection civile.
              </span>
              <span className="text-zinc-500">Aucun relevé simulé</span>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-4 sm:p-5 lg:col-span-5 shadow-2xl backdrop-blur-xl">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300"><Info aria-hidden="true" className="h-4 w-4" /></span>
              Comment lire le radar
            </div>
            <details className="mt-3 text-xs text-zinc-300"><summary className="cursor-pointer font-semibold text-zinc-300 hover:text-amber-300 transition">Définitions, fenêtre et limites</summary><div className="mt-2 space-y-3 text-xs leading-5 text-zinc-400">
              <p>{asOf ? <>Fenêtre commune : {formatRadarDate(windowed.window.from)} — {formatRadarDate(windowed.window.asOf)}.</> : 'Fenêtre en cours de chargement.'} Dépêches d’agences de presse africaines vérifiées.</p>
              <p><strong className="text-zinc-200">TV référencées.</strong> Candidates web/VLC selon les contrôles du résolveur ; la lecture est vérifiée à l’ouverture. VLC inclut les candidates web.</p>
              <p><strong className="text-zinc-200">Veille, pas alerte officielle.</strong> Le nombre d’articles indexés ne mesure ni la gravité ni la véracité d’une situation.</p>
              <p><strong className="text-zinc-200">Origine rédactionnelle.</strong> Les flux RSS identifient l’agence de presse émettrice et le pays d’origine de publication.</p>
              <p><strong className="text-zinc-200">Retour au terrain.</strong> Le bouton « TV » donne accès au catalogue complet et à ses lecteurs habituels.</p>
            </div>
            </details>
            <Link
              href={activeCountry ? `/app?country=${activeCountry.code}` : '/app'}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/15 via-amber-400/20 to-rose-500/15 hover:from-emerald-500/25 hover:via-amber-400/30 hover:to-rose-500/25 px-4 py-2 text-xs font-bold text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm backdrop-blur-sm"
            >
              {selectedCountry ? 'Voir les chaînes du pays' : 'Voir toutes les chaînes'} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </article>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Flux RSS officiels rédactions africaines · actualisé régulièrement</span>
          <span>Le service ne confirme pas les faits rapportés par les sources.</span>
        </footer>
      </div>

    </main>
  );
}

function MetricCard({
  label,
  value,
  subLabel,
  icon,
  accentColor = 'amber',
}: {
  label: string;
  value: string;
  subLabel?: string;
  icon: ReactNode;
  accentColor?: 'emerald' | 'amber' | 'rose';
}) {
  const iconBorderBg = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    amber: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    rose: 'border-rose-400/30 bg-rose-400/10 text-rose-300',
  }[accentColor];

  return (
    <div className="relative overflow-hidden flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/40 p-3 sm:p-4 shadow-xl backdrop-blur-xl">
      <span className={`hidden sm:flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${iconBorderBg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white tabular-nums">
            {value}
          </span>
          {subLabel && (
            <span className="text-[10px] font-bold text-amber-300/90 truncate">
              {subLabel}
            </span>
          )}
        </div>
        <div className="truncate text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
          {label}
        </div>
      </div>
    </div>
  );
}

function CountryChannelsView({
  selectedCountry,
  activeCountry,
  countryChannels,
  loading,
  error,
  channelsSummary,
  activePlayChannelId,
  onSelectCountry,
  onPlayChannel,
  onOpenPopout,
  onRetry,
}: {
  selectedCountry: string | null;
  activeCountry: RadarCountry | null;
  countryChannels: Channel[];
  loading: boolean;
  error: string | null;
  channelsSummary: LiveChannelsSummarySnapshot | null;
  activePlayChannelId: string | null;
  onSelectCountry: (code: string | null) => void;
  onPlayChannel: (channel: Channel) => void;
  onOpenPopout: (channel: Channel) => void;
  onRetry: () => void;
}) {
  if (selectedCountry && activeCountry) {
    return (
      <div className="flex-1 divide-y divide-white/[0.055] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-amber-400/10 bg-amber-400/[0.04] px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-amber-200">
            <Tv className="h-3.5 w-3.5" />
            <span>
              Chaînes du catalogue : <strong>{activeCountry.name}</strong> ({countryChannels.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectCountry(null)}
            className="text-[11px] font-semibold text-zinc-400 hover:text-white"
          >
            Tous les pays
          </button>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs text-amber-100">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 font-bold text-amber-200 underline underline-offset-4"
            >
              Réessayer
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3 p-4" aria-label="Chargement des chaînes">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-16 animate-pulse rounded-xl bg-white/[0.035]" />
            ))}
          </div>
        ) : countryChannels.length === 0 ? (
          <div className="p-8 text-center">
            <Tv aria-hidden="true" className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm font-bold text-zinc-300">
              Aucune chaîne directe répertoriée pour {activeCountry.name}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Découvrez les flux disponibles dans les autres pays africains.
            </p>
            <button
              type="button"
              onClick={() => onSelectCountry(null)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-white/[0.08]"
            >
              <span>Choisir un autre pays</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        ) : (
          countryChannels.map((channel) => {
            const isPlaying = activePlayChannelId === channel.id;
            const isBrowserDirect = channel.playbackMode === 'BROWSER';

            return (
              <div
                key={channel.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition sm:px-5 ${
                  isPlaying ? 'bg-amber-400/[0.08]' : 'hover:bg-white/[0.025]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                    {channel.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={channel.logoUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <Tv className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs sm:text-sm font-bold text-white">
                        {channel.name}
                      </span>
                      {isPlaying && (
                        <span className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                          En cours
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                      {channel.groupTitle && (
                        <span className="text-zinc-400">{channel.groupTitle}</span>
                      )}
                      <span className="text-zinc-600">·</span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${
                          isBrowserDirect
                            ? 'bg-emerald-400/10 text-emerald-300'
                            : 'bg-amber-400/10 text-amber-300'
                        }`}
                      >
                        {isBrowserDirect ? 'Direct Web' : 'VLC direct'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPlayChannel(channel)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      isPlaying
                        ? 'border border-red-500/40 bg-red-500/15 text-red-200'
                        : 'border border-amber-400/40 bg-gradient-to-r from-emerald-500/15 via-amber-400/20 to-rose-500/15 hover:from-emerald-500/25 hover:via-amber-400/30 hover:to-rose-500/25 text-amber-200 shadow-sm backdrop-blur-sm'
                    }`}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>{isPlaying ? 'Actif' : 'Regarder'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenPopout(channel)}
                    title="Ouvrir dans une fenêtre popout"
                    aria-label={`Ouvrir ${channel.name} en fenêtre séparée`}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  const availableCountries = AFRICAN_COUNTRIES.filter((c) => {
    const ch = channelsSummary?.countries[c.code];
    return ch && ch.channelCount > 0;
  }).sort((a, b) => {
    const countA = channelsSummary?.countries[a.code]?.channelCount ?? 0;
    const countB = channelsSummary?.countries[b.code]?.channelCount ?? 0;
    return countB - countA;
  });

  return (
    <div className="flex-1 divide-y divide-white/[0.055] overflow-y-auto">
      <div className="border-b border-white/[0.07] bg-black/20 px-4 py-3 sm:px-5">
        <div className="text-xs font-bold text-white">
          Télévisions d’Afrique référencées
        </div>
        <p className="mt-0.5 text-[11px] text-zinc-400">
          Choisissez un pays pour ouvrir ses chaînes locales dans le lecteur intégré :
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 sm:p-4">
        {availableCountries.map((c) => {
          const info = channelsSummary?.countries[c.code];
          const totalCh = info?.channelCount ?? 0;
          const webCh = info?.directWebCount ?? 0;

          return (
            <button
              key={c.code}
              type="button"
              onClick={() => onSelectCountry(c.code)}
              className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left transition hover:border-amber-400/40 hover:bg-white/[0.06] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-xs text-white group-hover:text-amber-200 transition">
                  {c.name}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-400">
                  {c.region}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  <Tv className="h-2.5 w-2.5" />
                  <span>{totalCh}</span>
                </div>
                {webCh > 0 && (
                  <div className="mt-0.5 text-[9px] font-semibold text-emerald-400">
                    {webCh} Web
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ArticleRow({
  article,
  country,
  channelCount,
  onSelectCountryForChannels,
  onSelectCountry,
}: {
  article: RadarArticle;
  country?: RadarCountry;
  channelCount?: number;
  onSelectCountryForChannels?: (code: string) => void;
  onSelectCountry?: (code: string) => void;
}) {
  const isRss = article.sourceType === 'rss';

  const sourceBadgeClass = () => {
    const name = (article.sourceName || article.domain).toLowerCase();
    if (name.includes('aps')) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
    if (name.includes('aip')) return 'border-orange-400/30 bg-orange-400/10 text-orange-300';
    if (name.includes('ecofin')) return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    if (name.includes('financial')) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
    if (name.includes('rfi')) return 'border-rose-400/30 bg-rose-400/10 text-rose-300';
    if (name.includes('france 24')) return 'border-sky-400/30 bg-sky-400/10 text-sky-300';
    if (name.includes('jeune')) return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300';
    if (name.includes('bbc')) return 'border-red-400/30 bg-red-400/10 text-red-300';
    if (name.includes('monde')) return 'border-violet-400/30 bg-violet-400/10 text-violet-300';
    if (name.includes('okapi')) return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
    if (name.includes('malijet')) return 'border-teal-400/30 bg-teal-400/10 text-teal-300';
    if (name.includes('lefaso')) return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300';
    if (name.includes('cameroun')) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
    if (name.includes('guinée') || name.includes('guinee')) return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    if (name.includes('hespress')) return 'border-red-400/30 bg-red-400/10 text-red-300';
    if (name.includes('tsa')) return 'border-teal-400/30 bg-teal-400/10 text-teal-300';
    if (name.includes('gabon')) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300';
    if (name.includes('benin') || name.includes('bénin')) return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300';
    if (name.includes('africanews')) return 'border-blue-400/30 bg-blue-400/10 text-blue-300';
    return 'border-zinc-700 bg-white/[0.04] text-zinc-300';
  };

  const isNational = () => {
    const name = (article.sourceName || '').toLowerCase();
    return (
      name.includes('aps') ||
      name.includes('aip') ||
      name.includes('okapi') ||
      name.includes('malijet') ||
      name.includes('lefaso') ||
      name.includes('cameroun') ||
      name.includes('guinée') ||
      name.includes('guinee') ||
      name.includes('hespress') ||
      name.includes('tsa') ||
      name.includes('gabon') ||
      name.includes('benin') ||
      name.includes('bénin')
    );
  };

  return (
    <div className="group px-4 py-3.5 transition hover:bg-white/[0.025] sm:px-5">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {isRss ? (
          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold tracking-normal ${sourceBadgeClass()}`}>
            <Rss className="h-2.5 w-2.5" />
            {article.sourceName ?? article.domain}
          </span>
        ) : (
          <span className="text-emerald-200/90">{article.domain}</span>
        )}
        {article.category && (
          <span className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-normal tracking-normal text-zinc-400">
            {article.category}
          </span>
        )}
        <span className="text-zinc-700">·</span>
        {article.countryCode ? (
          <button
            type="button"
            onClick={() => onSelectCountry?.(article.countryCode!)}
            className="rounded px-1 text-zinc-400 transition hover:bg-amber-400/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
            title={`Centrer la carte sur ${country?.name ?? article.countryCode}`}
          >
            {country?.name ?? 'Pays inconnu'}{article.countryBasis === 'inferred_topic' ? ' · sujet inféré' : ' · pays du média'}
          </button>
        ) : (
          <span>{country?.name ?? 'Pays inconnu'}{article.countryBasis === 'inferred_topic' ? ' · sujet inféré' : ' · pays du média'}</span>
        )}
        {article.countryCode && channelCount !== undefined && channelCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectCountryForChannels?.(article.countryCode!)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
            title={`Voir les ${channelCount} chaîne(s) TV référencées`}
          >
            <Tv className="h-2.5 w-2.5" />
            <span>{channelCount} chaînes</span>
          </button>
        )}
        <span className="ml-auto font-mono font-normal tracking-normal text-zinc-500">Publication · {formatRadarDate(article.indexedAt)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-5 text-zinc-200 transition group-hover:text-amber-200 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400">
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-zinc-500 group-hover:text-amber-300" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        {article.editorialScope === 'international' ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-sky-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Rubrique internationale
          </span>
        ) : isNational() ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Rédaction nationale officielle
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Rédaction panafricaine & économie
          </span>
        )}
        {country && <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600"><MapPin aria-hidden="true" className="h-2.5 w-2.5" />{country.region}</span>}
      </div>
    </div>
  );
}
