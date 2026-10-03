'use client';

import { useCallback, useEffect, useMemo, useState, Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import RadarSourcesPanel from '@/components/radar/RadarSourcesPanel';
import { radarCountry, radarCountryUrl, sourcePlaceholder, type RadarSourceRow } from '@/lib/radar-workspace';
import Link from 'next/link';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import PageTransition from '@/components/shell/PageTransition';
import { ShareArticleLink } from '@/components/tv/ChannelTile';
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
      <div className="flex h-[460px] sm:h-[520px] w-full flex-col items-center justify-center rounded-xl border border-line bg-surface-1/80 p-6 text-center text-text-muted">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-al-green border-t-transparent" />
        <p className="text-xs font-bold text-text-muted">Chargement de la carte vectorielle tactique...</p>
      </div>
    ),
  },
);

const REFRESH_INTERVAL_MS = 5 * 60_000;

function WeatherIconDisplay({
  icon,
  isDay,
}: {
  icon: WeatherIconType;
  isDay: boolean | null;
}) {
  if (isDay === null || icon === 'unknown') return <Cloud aria-hidden="true" className="h-6 w-6 text-text" />;
  switch (icon) {
    case 'clear':
      return isDay ? (
        <Sun aria-hidden="true" className="h-6 w-6 text-al-gold" />
      ) : (
        <Moon aria-hidden="true" className="h-6 w-6 text-sky-200" />
      );
    case 'partly-cloudy':
      return <CloudSun aria-hidden="true" className="h-6 w-6 text-text" />;
    case 'cloudy':
      return <Cloud aria-hidden="true" className="h-6 w-6 text-text" />;
    case 'rain':
      return <CloudRain aria-hidden="true" className="h-6 w-6 text-sky-300" />;
    case 'storm':
      return <CloudLightning aria-hidden="true" className="h-6 w-6 text-al-gold" />;
    case 'fog':
      return <CloudFog aria-hidden="true" className="h-6 w-6 text-text/90" />;
    default:
      return <CloudSun aria-hidden="true" className="h-6 w-6 text-text" />;
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
    <PageTransition>
    <main className="relative flex-1 bg-black text-text flex flex-col selection:bg-al-gold/25 selection:text-text">
      {/* Brand transparent background watermark */}
      <BrandBackdrop variant="app" />

      <div className="mx-auto max-w-7xl w-full flex-1 px-3 pb-8 pt-3 sm:px-6 sm:pt-4 md:px-6">
        <section className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">Radar Afrique</h1>
            <p className="mt-0.5 text-xs text-text-muted">Dépêches, météo et télévisions par pays.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshToken(value => value + 1)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] hover:bg-white/[0.08] hover:border-al-gold/40 px-3 py-1.5 text-xs font-semibold text-text transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold shadow-sm"
            >
              <RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 text-al-gold ${refreshing ?'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualisation…' : 'Actualiser'}</span>
            </button>
          </div>
        </section>

        {countryParam && !selectedCountry && <p role="status" className="mb-3 rounded-control border border-line-gold bg-surface-1 px-3 py-2 text-xs text-text">Pays inconnu dans le lien : vue Afrique affichée.</p>}

        <section aria-label="Indicateurs de veille" className="mb-3 grid grid-cols-2 gap-2 sm:mb-4 sm:gap-3 lg:grid-cols-4">
          <MetricCard
            label="Résultats chargés · 24 h"
            shortLabel="Dépêches · 24 h"
            value={rss ? String(visibleArticles.length) : '—'}
            icon={<Newspaper className="h-5 w-5" />}
            accentColor="amber"
          />
          <MetricCard
            label="Médias & Rédactions"
            shortLabel="Médias"
            value={rss ? String(domainsCount) : '—'}
            icon={<Radar className="h-5 w-5" />}
            accentColor="emerald"
          />
          <MetricCard
            label="Pays représentés"
            shortLabel="Pays"
            value={rss ? String(new Set(visibleArticles.map(a => a.countryCode).filter(Boolean)).size) : '—'}
            icon={<MapPin className="h-5 w-5" />}
            accentColor="rose"
          />
          <MetricCard
            label="Chaînes référencées"
            shortLabel="Chaînes"
            value={channelsSummary ? String(channelsSummary.totalChannels) : '—'}
            subLabel={channelsSummary ? `${channelsSummary.totalDirectWeb} web · ${channelsSummary.totalDirectVlc ?? 0} VLC` : undefined}
            icon={<Tv className="h-5 w-5" />}
            accentColor="amber"
          />
        </section>

        <RadarSourcesPanel sources={sourceRows} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <article aria-label="Fil et chaînes du pays" className="relative flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-line bg-surface-1/80 shadow-2xl xl:col-span-5">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            {/* Embedded PiP Mini-Player Dock */}
            {activePlayChannel && (
              <div className="border-b border-line bg-black/90 p-3 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-al-green opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-al-green" />
                    </span>
                    <span className="truncate text-xs font-bold text-text">
                      EN DIRECT : {activePlayChannel.name}
                    </span>
                    {activeCountry && (
                      <span className="hidden sm:inline-block rounded border border-line bg-white/[0.04] px-1.5 py-0.5 text-xs text-text-muted">
                        {activeCountry.name}
                      </span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                        activePlayChannel.playbackMode === 'BROWSER'
                          ? 'border border-al-green/20 bg-al-green/10 text-al-green'
                          : 'border border-al-gold/20 bg-al-gold/10 text-al-gold'
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
                      className="flex h-7 items-center gap-1 rounded-lg border border-line bg-white/[0.04] px-2 text-xs font-semibold text-text transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text"
                    >
                      <ExternalLink className="h-3 w-3 text-al-gold" />
                      <span className="hidden sm:inline">Fenêtre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePlayChannel(null)}
                      title="Fermer le lecteur direct"
                      aria-label="Fermer le lecteur direct"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-text-muted transition hover:border-al-red/40 hover:text-text"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-line bg-black shadow-2xl">
                  <Player channelId={activePlayChannel.id} channelName={activePlayChannel.name} />
                </div>
              </div>
            )}

            {/* Navigation Tabs : Dépêches vs Chaînes en direct */}
            <div className="flex items-center justify-between border-b border-line bg-black/40 px-3 py-2 sm:px-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('news')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
                    rightPanelTab === 'news'
                      ? 'border border-al-gold bg-al-gold/10 text-text font-bold'
                      : 'border border-transparent bg-white/[0.02] text-text-muted hover:text-text hover:bg-white/[0.05] hover:border-line font-medium'
                  }`}
                >
                  <Newspaper className="h-3.5 w-3.5 text-al-gold" />
                  <span>Dépêches ({tabCounts.all})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('channels')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
                    rightPanelTab === 'channels'
                      ? 'border border-al-gold bg-al-gold/10 text-text font-bold'
                      : 'border border-transparent bg-white/[0.02] text-text-muted hover:text-text hover:bg-white/[0.05] hover:border-line font-medium'
                  }`}
                >
                  <Tv className="h-3.5 w-3.5 text-al-green" />
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
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="font-semibold text-al-green">{activeCountry.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCountry(null)}
                    aria-label={`Retirer le filtre ${activeCountry.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-text-muted hover:bg-white/10 hover:text-text"
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
                <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-text">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-al-gold/10 text-text">
                          <Newspaper aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                        Fil des dépêches
                      </div>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {activeCountry ? `Dépêches liées à : ${activeCountry.name}` : 'Rédactions africaines et internationales'} · {visibleArticles.length} résultats datés · 24 h
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rss && (
                        <span className="hidden items-center gap-1 rounded-full border border-al-green/20 bg-al-green/10 px-2 py-0.5 text-xs font-bold text-al-green sm:inline-flex">
                          <span className="h-1.5 w-1.5 rounded-full bg-al-green" />
                          {rss.availability?.filter(source => source.status === 'available' || source.status === 'empty').length ?? rss.sources.length} sources RSS
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scope filter tabs: Toutes / Afrique & National / International */}
                  <div className="flex items-center gap-1 rounded-xl border border-line bg-surface-1/80 p-1">
                    <button
                      type="button"
                      onClick={() => setScopeTab('all')}
                      className={`flex-auto rounded-lg px-1.5 py-1 text-xs font-semibold leading-tight transition sm:px-2 ${
                        scopeTab === 'all'
                          ? 'border border-al-gold/40 bg-al-gold/15 text-text shadow-sm'
                          : 'text-text-muted hover:text-text hover:bg-white/[0.04]'
                      }`}
                    >
                      Toutes ({tabCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeTab('africa')}
                      className={`flex-auto rounded-lg px-1.5 py-1 text-xs font-semibold leading-tight transition sm:px-2 ${
                        scopeTab === 'africa'
                          ? 'border border-al-green/40 bg-al-green/15 text-text shadow-sm'
                          : 'text-text-muted hover:text-text hover:bg-white/[0.04]'
                      }`}
                    >
                      Afrique & National ({tabCounts.africa})
                    </button>
                    <button
                      type="button"
                      onClick={() => setScopeTab('international')}
                      className={`flex-auto rounded-lg px-1.5 py-1 text-xs font-semibold leading-tight transition sm:px-2 ${
                        scopeTab === 'international'
                          ? 'border border-sky-400/40 bg-sky-400/15 text-sky-200 shadow-sm'
                          : 'text-text-muted hover:text-text hover:bg-white/[0.04]'
                      }`}
                    >
                      International ({tabCounts.intl})
                    </button>
                  </div>
                </div>

                {activeCountry && (
                  <div className="flex items-center justify-between border-b border-al-green/10 bg-al-green/[0.05] px-4 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-text">Filtre pays : <strong>{activeCountry.name}</strong></span>
                      {channelsSummary?.countries[activeCountry.code]?.channelCount ? (
                        <button
                          type="button"
                          onClick={() => setRightPanelTab('channels')}
                          className="inline-flex items-center gap-1 rounded-md border border-al-gold/30 bg-al-gold/10 px-1.5 py-0.5 text-xs font-bold text-al-gold transition hover:bg-al-gold/20"
                        >
                          <Tv className="h-2.5 w-2.5" />
                          <span>{channelsSummary.countries[activeCountry.code].channelCount} chaînes TV</span>
                        </button>
                      ) : null}
                    </div>
                    <button type="button" onClick={() => setSelectedCountry(null)} className="text-text-muted hover:text-text">Tout afficher</button>
                  </div>
                )}

                {newsError && rss && (
                  <div role="status" className="border-b border-al-gold/10 bg-al-gold/[0.04] px-4 py-2 text-xs text-text/80 sm:px-5">
                    {newsError} Les dernières dépêches chargées restent consultables.
                  </div>
                )}

                <div aria-live="polite" className="flex-1 divide-y divide-white/[0.055] overflow-y-auto xl:max-h-[515px]">
                  {newsError && !rss ? (
                    <div className="m-4 rounded-xl border border-al-gold/15 bg-al-gold/[0.05] p-4 text-sm text-text/80">
                      <p>{newsError}</p>
                      <button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="mt-3 font-bold text-text underline underline-offset-4">Réessayer</button>
                    </div>
                  ) : !rss ? (
                    <div className="space-y-3 p-4" aria-label="Chargement des dépêches">
                      {[0, 1, 2, 3].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-white/[0.035]" />)}
                    </div>
                  ) : visibleArticles.length === 0 ? (
                    <div className="p-8 text-center">
                      <Newspaper aria-hidden="true" className="mx-auto h-7 w-7 text-text-faint" />
                      <p className="mt-3 text-sm font-bold text-text">
                        {activeCountry
                          ? `Aucune dépêche pour : ${activeCountry.name}`
                          : 'Aucune dépêche dans ce filtre'}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
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
                            className="inline-flex items-center gap-1.5 rounded-lg border border-al-green/40 bg-al-green/10 px-3 py-1.5 text-xs font-bold text-al-green transition hover:bg-al-green/20"
                          >
                            Toutes les rubriques ({tabCounts.all})
                          </button>
                        )}
                        {selectedCountry && (
                          <button
                            type="button"
                            onClick={() => setSelectedCountry(null)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-al-gold/40 bg-al-gold/10 px-3 py-1.5 text-xs font-bold text-al-gold transition hover:bg-al-gold/20"
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

                {visibleUnknownArticles.length > 0 && <section aria-label="Dépêches sans date" className="border-t border-al-gold/20">
                  <h2 className="p-3 text-xs text-text">Date inconnue · {visibleUnknownArticles.length} titres exclus des compteurs 24 h</h2>
                  {visibleUnknownArticles.map(article => <ArticleRow key={canonicalArticleUrl(article.url)} article={article} country={AFRICAN_COUNTRIES.find(country => country.code === article.countryCode)} onSelectCountry={setSelectedCountry} />)}
                </section>}
                <div className="border-t border-line px-4 py-3 text-xs leading-4 text-text-muted sm:px-5">
                  Les liens ouvrent les publications d’origine. Africa Live affiche les titres et métadonnées de veille, sans reprendre le contenu des articles.
                </div>
              </>
            )}
          </article>
          <article aria-label="Carte du Radar" className="relative overflow-hidden rounded-2xl border border-line bg-surface-1/80 shadow-2xl xl:col-span-7">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-text">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-al-green/30 bg-al-green/10 text-al-green">
                    <Radar aria-hidden="true" className="h-4 w-4" />
                  </span>
                  Carte des médias et du catalogue
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  Médias et chaînes de télévision africaines géolocalisées par pays.
                </p>
              </div>
              <span className="rounded-full border border-al-green/30 bg-al-green/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-al-green">
                2D / Globe 3D · MapLibre GL
              </span>
            </div>

            <div className="p-2 sm:p-3">
              {!desktopMap && <button type="button" aria-expanded={mapRequested} aria-controls="radar-map" onClick={() => setMapRequested(value => !value)} className="mb-2 rounded-xl border border-al-green/30 bg-al-green/10 hover:bg-al-green/20 px-3 py-1.5 text-xs font-semibold text-text transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold">{mapRequested ? 'Masquer la carte' : 'Afficher la carte'}</button>}
              <div id="radar-map">{showMap ? (
              <TacticalVectorMap
                countries={AFRICAN_COUNTRIES}
                countryCounts={countryCounts}
                channelsSummary={channelsSummary}
                selectedCountry={selectedCountry}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onSelectCountryForChannels={handleSelectCountryForChannels}
              />
              ) : <p className="p-3 text-xs text-text-muted">Carte à la demande. Le choix du pays et les dépêches fonctionnent sans elle.</p>}</div>
            </div>

            <div className="border-t border-line bg-black/40 px-4 py-3 text-xs leading-5 text-text-muted sm:px-5">
              <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-al-gold/80" />
              Fonds de carte Satellite haute résolution (Esri), Topographique (OpenFreeMap) et OpenStreetMap sous licence libre. Les marqueurs situent les médias indexés et les télévisions référencées.
            </div>
          </article>


        </section>

        <details className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface-1/80 shadow-xl">
          <summary className="cursor-pointer p-3 sm:p-4 text-xs font-bold text-text hover:text-text transition">Marchés et événements · bandeau daté</summary>
          <LiveMarketTicker onSelectCountry={setSelectedCountry} onSourcesChange={setTickerSources} refreshToken={refreshToken} />
        </details>
        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <article className="relative overflow-hidden rounded-2xl border border-line bg-surface-1/80 shadow-2xl lg:col-span-7">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-300">
                  <CloudSun aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-text">
                    Météo locale
                    <span className="text-text-faint font-normal">·</span>
                    <span className="text-sky-200">{weather?.current.locationName ?? (AFRICAN_COUNTRIES.find((c) => c.code === activeWeatherCode)?.name ?? 'Dakar')}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-text-muted">
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
                  className="rounded-xl border border-line bg-black/60 px-2.5 py-1.5 text-xs font-medium text-text hover:border-sky-400/40 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/50"
                >
                  <optgroup label={`Pays et territoires africains (${AFRICAN_COUNTRIES.length})`}>
                    {[...AFRICAN_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((c) => {
                      const city = QUICK_WEATHER_LOCATIONS.find(loc => loc.code === c.code);
                      return <option key={c.code} value={c.code} className="bg-surface-2 text-text">
                        {c.name} ({c.code}){city ? ` · ${city.city}` : ' · point de référence'}
                      </option>;
                    })}
                  </optgroup>
                </select>

                {weather?.stale ? (
                  <span className="rounded-full border border-al-gold/20 bg-al-gold/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-text">
                    Relevé conservé · périmé
                  </span>
                ) : weather ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-al-green/20 bg-al-green/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-al-green">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-al-green opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-al-green" />
                    </span>
                    {weather.availability[0].status === 'partial' ? 'Données partielles' : 'Relevé récent'}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick city selectors */}
            <div aria-label="Villes rapides" className="flex gap-1.5 overflow-x-auto border-b border-line bg-black/40 px-4 py-2.5 text-xs no-scrollbar sm:px-5">
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
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'border border-sky-300/40 bg-sky-400/20 text-sky-100 shadow-sm'
                        : 'border border-transparent bg-white/[0.03] text-text-muted hover:border-line hover:bg-white/[0.06] hover:text-text'
                    }`}
                  >
                    <span>{loc.city}</span>
                    <span className="font-mono text-xs text-text-muted">{loc.code}</span>
                  </button>
                );
              })}
            </div>

            {/* Weather body */}
            <div className="p-4 sm:p-5">
              {weatherError && weather && <p role="status" className="mb-3 text-xs text-text">{weatherError} · Relevé conservé jusqu’à expiration.</p>}
              {weather?.current.timeAnomaly && <p className="mb-3 text-xs text-text">Horodatage amont légèrement futur.</p>}
              {weatherError && !weather ? (
                <div className="rounded-xl border border-al-gold/15 bg-al-gold/[0.05] p-4 text-xs text-text/90">
                  <p>{weatherError}</p>
                  <button
                    type="button"
                    onClick={() => setRefreshToken((v) => v + 1)}
                    className="mt-2 font-bold text-text underline underline-offset-4"
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
                          <span className="font-display text-3xl font-bold tracking-tight text-text tabular-nums sm:text-4xl">
                            {weather.current.temperatureC}°C
                          </span>
                          <span className="text-xs font-semibold text-text-muted">
                            Ressenti {weather.current.apparentTemperatureC}°C
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-sky-200">
                          {weather.current.weatherDescription}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-sm font-bold text-text">
                        {weather.current.locationName}
                      </div>
                      <div className="text-xs text-text-muted">
                        {weather.current.countryName} · {weather.current.region}
                      </div>
                      <div className="mt-1 font-mono text-xs text-text-muted">
                        {weather.current.timezone ?? 'Fuseau inconnu'}
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                        <Wind className="h-3 w-3 text-sky-300" />
                        Vent
                      </div>
                      <div className="mt-1 text-sm font-black text-text tabular-nums">
                        {weather.current.windSpeedKmh} <span className="text-xs font-normal text-text-muted">km/h</span>
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        {weather.current.windDirectionCompass} ({weather.current.windDirectionDeg}°)
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                        <Droplets className="h-3 w-3 text-al-green" />
                        Humidité
                      </div>
                      <div className="mt-1 text-sm font-black text-text tabular-nums">
                        {weather.current.relativeHumidityPercent} <span className="text-xs font-normal text-text-muted">%</span>
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        Hygrométrie
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                        <CloudRain className="h-3 w-3 text-indigo-300" />
                        Pluie
                      </div>
                      <div className="mt-1 text-sm font-black text-text tabular-nums">
                        {weather.current.precipitationMm} <span className="text-xs font-normal text-text-muted">mm</span>
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        Précipitations
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-surface-1/80 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted">
                        <Compass className="h-3 w-3 text-al-gold" />
                        Relevé
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-text tabular-nums">
                        {weather.current.observedAt ? new Intl.DateTimeFormat('fr-FR', { timeZone: weather.current.timezone ?? 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(weather.current.observedAt)) : 'Date d’observation inconnue'}
                      </div>
                      <div className="mt-0.5 text-xs text-text-muted">
                        {weather.current.timezone ? 'Heure locale' : 'UTC · fuseau du lieu inconnu'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-line bg-black/40 px-4 py-2.5 text-xs leading-4 text-text-muted sm:px-5 flex flex-wrap items-center justify-between gap-2">
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
              <span className="text-text-muted">Aucun relevé simulé</span>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-2xl border border-line bg-surface-1/80 p-4 sm:p-5 lg:col-span-5 shadow-2xl">
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex items-center gap-2 text-sm font-bold text-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-al-gold/30 bg-al-gold/10 text-al-gold"><Info aria-hidden="true" className="h-4 w-4" /></span>
              Comment lire le radar
            </div>
            <details className="mt-3 text-xs text-text"><summary className="cursor-pointer font-semibold text-text hover:text-al-gold transition">Définitions, fenêtre et limites</summary><div className="mt-2 space-y-3 text-xs leading-5 text-text-muted">
              <p>{asOf ? <>Fenêtre commune : {formatRadarDate(windowed.window.from)} — {formatRadarDate(windowed.window.asOf)}.</> : 'Fenêtre en cours de chargement.'} Dépêches d’agences de presse africaines vérifiées.</p>
              <p><strong className="text-text">TV référencées.</strong> Candidates web/VLC selon les contrôles du résolveur ; la lecture est vérifiée à l’ouverture. VLC inclut les candidates web.</p>
              <p><strong className="text-text">Veille, pas alerte officielle.</strong> Le nombre d’articles indexés ne mesure ni la gravité ni la véracité d’une situation.</p>
              <p><strong className="text-text">Origine rédactionnelle.</strong> Les flux RSS identifient l’agence de presse émettrice et le pays d’origine de publication.</p>
              <p><strong className="text-text">Retour au terrain.</strong> Le bouton « TV » donne accès au catalogue complet et à ses lecteurs habituels.</p>
            </div>
            </details>
            <Link
              href={activeCountry ? `/app?country=${activeCountry.code}` : '/app'}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-transparent bg-al-yellow hover:brightness-110 px-4 py-2 text-xs font-bold text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold shadow-sm"
            >
              {selectedCountry ? 'Voir les chaînes du pays' : 'Voir toutes les chaînes'} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </article>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-line pt-4 text-xs leading-5 text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Flux RSS officiels rédactions africaines · actualisé régulièrement</span>
          <span>Le service ne confirme pas les faits rapportés par les sources.</span>
        </footer>
      </div>

    </main>
    </PageTransition>
  );
}

function MetricCard({
  label,
  shortLabel,
  value,
  subLabel,
  icon,
  accentColor = 'amber',
}: {
  label: string;
  shortLabel?: string;
  value: string;
  subLabel?: string;
  icon: ReactNode;
  accentColor?: 'emerald' | 'amber' | 'rose';
}) {
  const iconBorderBg = {
    emerald: 'border-al-green/30 bg-al-green/10 text-al-green',
    amber: 'border-al-gold/30 bg-al-gold/10 text-al-gold',
    rose: 'border-al-red/30 bg-al-red/10 text-al-red-soft',
  }[accentColor];

  return (
    <div className="relative overflow-hidden flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface-1/80 p-2.5 sm:p-4 shadow-xl">
      <span className={`hidden sm:flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm ${iconBorderBg}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="font-display text-lg sm:text-xl font-bold leading-tight tracking-tight text-text tabular-nums">
            {value}
          </span>
          {subLabel && (
            <span className="hidden truncate text-xs font-bold text-al-gold/90 sm:inline">
              {subLabel}
            </span>
          )}
        </div>
        <div className="truncate text-xs font-semibold uppercase leading-snug tracking-wide text-text-muted">
          <span className="sm:hidden">{shortLabel ?? label}</span>
          <span className="hidden sm:inline">{label}</span>
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
        <div className="flex items-center justify-between border-b border-al-gold/10 bg-al-gold/[0.04] px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-text">
            <Tv className="h-3.5 w-3.5" />
            <span>
              Chaînes du catalogue : <strong>{activeCountry.name}</strong> ({countryChannels.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectCountry(null)}
            className="text-xs font-semibold text-text-muted hover:text-text"
          >
            Tous les pays
          </button>
        </div>

        {error ? (
          <div className="m-4 rounded-xl border border-al-gold/15 bg-al-gold/[0.05] p-4 text-xs text-text">
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 font-bold text-text underline underline-offset-4"
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
            <Tv aria-hidden="true" className="mx-auto h-8 w-8 text-text-faint" />
            <p className="mt-3 text-sm font-bold text-text">
              Aucune chaîne directe répertoriée pour {activeCountry.name}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Découvrez les flux disponibles dans les autres pays africains.
            </p>
            <button
              type="button"
              onClick={() => onSelectCountry(null)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.04] px-3.5 py-1.5 text-xs font-bold text-text transition hover:bg-white/[0.08]"
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
                  isPlaying ? 'bg-al-gold/[0.08]' : 'hover:bg-white/[0.025]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white/[0.04]">
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
                      <Tv className="h-5 w-5 text-text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs sm:text-sm font-bold text-text">
                        {channel.name}
                      </span>
                      {isPlaying && (
                        <span className="flex items-center gap-1 rounded bg-al-green/15 px-1.5 py-0.5 text-xs font-bold uppercase text-al-green">
                          <span className="h-1.5 w-1.5 rounded-full bg-al-green animate-ping" />
                          En cours
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      {channel.groupTitle && (
                        <span className="text-text-muted">{channel.groupTitle}</span>
                      )}
                      <span className="text-text-faint">·</span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${
                          isBrowserDirect
                            ? 'bg-al-green/10 text-al-green'
                            : 'bg-al-gold/10 text-al-gold'
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
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
                      isPlaying
                        ? 'border border-al-red/40 bg-al-red/15 text-text'
                        : 'border border-transparent bg-al-yellow hover:brightness-110 text-black shadow-sm'
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
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white/[0.04] text-text-muted transition hover:border-al-gold/40 hover:bg-white/[0.08] hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
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
      <div className="border-b border-line bg-black/20 px-4 py-3 sm:px-5">
        <div className="text-xs font-bold text-text">
          Télévisions d’Afrique référencées
        </div>
        <p className="mt-0.5 text-xs text-text-muted">
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
              className="flex items-center justify-between rounded-xl border border-line bg-white/[0.025] p-3 text-left transition hover:border-al-gold/40 hover:bg-white/[0.06] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-xs text-text group-hover:text-text transition">
                  {c.name}
                </div>
                <div className="mt-0.5 text-xs text-text-muted">
                  {c.region}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-al-gold/30 bg-al-gold/10 px-2 py-0.5 text-xs font-black text-al-gold">
                  <Tv className="h-2.5 w-2.5" />
                  <span>{totalCh}</span>
                </div>
                {webCh > 0 && (
                  <div className="mt-0.5 text-xs font-semibold text-al-green">
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
    if (name.includes('aps')) return 'border-al-green/30 bg-al-green/10 text-al-green';
    if (name.includes('aip')) return 'border-al-gold/30 bg-al-gold/10 text-al-gold';
    if (name.includes('ecofin')) return 'border-al-gold/30 bg-al-gold/10 text-al-gold';
    if (name.includes('financial')) return 'border-al-green/30 bg-al-green/10 text-al-green';
    if (name.includes('rfi')) return 'border-al-red/30 bg-al-red/10 text-al-red-soft';
    if (name.includes('france 24')) return 'border-sky-400/30 bg-sky-400/10 text-sky-300';
    if (name.includes('jeune')) return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300';
    if (name.includes('bbc')) return 'border-al-red/30 bg-al-red/10 text-al-red-soft';
    if (name.includes('monde')) return 'border-violet-400/30 bg-violet-400/10 text-violet-300';
    if (name.includes('okapi')) return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
    if (name.includes('malijet')) return 'border-teal-400/30 bg-teal-400/10 text-teal-300';
    if (name.includes('lefaso')) return 'border-al-gold/30 bg-al-gold/10 text-al-gold';
    if (name.includes('cameroun')) return 'border-al-green/30 bg-al-green/10 text-al-green';
    if (name.includes('guinée') || name.includes('guinee')) return 'border-al-gold/30 bg-al-gold/10 text-al-gold';
    if (name.includes('hespress')) return 'border-al-red/30 bg-al-red/10 text-al-red-soft';
    if (name.includes('tsa')) return 'border-teal-400/30 bg-teal-400/10 text-teal-300';
    if (name.includes('gabon')) return 'border-al-green/30 bg-al-green/10 text-al-green';
    if (name.includes('benin') || name.includes('bénin')) return 'border-al-gold/30 bg-al-gold/10 text-al-gold';
    if (name.includes('africanews')) return 'border-blue-400/30 bg-blue-400/10 text-blue-300';
    return 'border-line bg-white/[0.04] text-text';
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
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
        {isRss ? (
          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold tracking-normal ${sourceBadgeClass()}`}>
            <Rss className="h-2.5 w-2.5" />
            {article.sourceName ?? article.domain}
          </span>
        ) : (
          <span className="text-text/90">{article.domain}</span>
        )}
        {article.category && (
          <span className="rounded-md border border-line bg-white/[0.03] px-1.5 py-0.5 text-xs font-normal tracking-normal text-text-muted">
            {article.category}
          </span>
        )}
        <span className="text-text-faint">·</span>
        {article.countryCode ? (
          <button
            type="button"
            onClick={() => onSelectCountry?.(article.countryCode!)}
            className="rounded px-1 text-text-muted transition hover:bg-al-gold/10 hover:text-al-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold"
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
            className="inline-flex items-center gap-1 rounded-lg border border-al-gold/30 bg-al-gold/10 px-1.5 py-0.5 text-xs font-bold text-al-gold transition hover:bg-al-gold/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold"
            title={`Voir les ${channelCount} chaîne(s) TV référencées`}
          >
            <Tv className="h-2.5 w-2.5" />
            <span>{channelCount} chaînes</span>
          </button>
        )}
        <span className="ml-auto font-mono font-normal tracking-normal text-text-muted">Publication · {formatRadarDate(article.indexedAt)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-5 text-text transition group-hover:text-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold">
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-text-muted group-hover:text-al-gold" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        {article.editorialScope === 'international' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-400/90">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            Rubrique internationale
          </span>
        ) : isNational() ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-al-green/90">
            <span className="h-1.5 w-1.5 rounded-full bg-al-green" />
            Rédaction nationale officielle
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-al-gold/90">
            <span className="h-1.5 w-1.5 rounded-full bg-al-yellow" />
            Rédaction panafricaine & économie
          </span>
        )}
        <div className="flex items-center gap-2">
          {country && <span className="inline-flex items-center gap-1 text-xs text-text-muted"><MapPin aria-hidden="true" className="h-2.5 w-2.5" />{country.region}</span>}
          <ShareArticleLink title={article.title} sourceName={article.sourceName ?? undefined} url={article.url} />
        </div>
      </div>
    </div>
  );
}
