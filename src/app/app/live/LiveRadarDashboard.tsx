'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import LocalAccountControls from '@/components/LocalAccountControls';
import Player from '@/components/Player';
import LiveMarketTicker from '@/components/radar/LiveMarketTicker';
import FlashBriefingModal from '@/components/radar/FlashBriefingModal';
import { launchPlayer } from '@/lib/player-window';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';
import type { RadarArticle, RadarCountry, RadarNewsSnapshot } from '@/lib/live-osint-types';
import type { LiveWeatherSnapshot, WeatherIconType } from '@/lib/live-weather-types';
import type { RadarRssSnapshot } from '@/lib/rss-collector-types';
import type { LiveChannelsSummarySnapshot } from '@/lib/live-channels-types';
import type { Channel } from '@/types/channel';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
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
      <div className="flex h-[460px] sm:h-[520px] w-full flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#070b09] p-6 text-center text-zinc-500">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        <p className="text-xs font-bold text-zinc-400">Chargement de la carte vectorielle tactique...</p>
      </div>
    ),
  },
);

const REFRESH_INTERVAL_MS = 5 * 60_000;
const TIMEZONE = 'Africa/Dakar';

function formatTime(value: string | null | undefined, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

function isNewsSnapshot(value: unknown): value is RadarNewsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<RadarNewsSnapshot>;
  return Array.isArray(data.articles) && Array.isArray(data.countries) && typeof data.updatedAt === 'string';
}

function WeatherIconDisplay({
  icon,
  isDay,
}: {
  icon: WeatherIconType;
  isDay: boolean;
}) {
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

function isWeatherSnapshot(value: unknown): value is LiveWeatherSnapshot {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<LiveWeatherSnapshot>;
  return Boolean(data.current) && Array.isArray(data.quickLocations);
}

export default function LiveRadarDashboard() {
  const [news, setNews] = useState<RadarNewsSnapshot | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clock, setClock] = useState('');

  const [rss, setRss] = useState<RadarRssSnapshot | null>(null);
  const [feedTab, setFeedTab] = useState<'all' | 'rss' | 'gdelt'>('all');
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);

  const [channelsSummary, setChannelsSummary] = useState<LiveChannelsSummarySnapshot | null>(null);
  const [countryChannels, setCountryChannels] = useState<Channel[]>([]);
  const [countryChannelsLoading, setCountryChannelsLoading] = useState(false);
  const [countryChannelsError, setCountryChannelsError] = useState<string | null>(null);
  const [activePlayChannel, setActivePlayChannel] = useState<Channel | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'news' | 'channels'>('news');

  const [selectedCityCode, setSelectedCityCode] = useState<string | null>(null);
  const activeWeatherCode = selectedCityCode ?? selectedCountry ?? 'SN';
  const [weather, setWeather] = useState<LiveWeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadWeather = async () => {
      setWeatherLoading(true);
      try {
        const response = await fetch(`/api/live/weather?code=${encodeURIComponent(activeWeatherCode)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error('Données météo momentanément indisponibles.');
        if (!isWeatherSnapshot(body)) throw new Error('Format de données météo invalide.');
        if (!active) return;
        setWeather(body);
        setWeatherError(null);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setWeatherError(error instanceof Error ? error.message : 'Erreur de chargement météo.');
        }
      } finally {
        if (active) setWeatherLoading(false);
      }
    };

    void loadWeather();
    const interval = window.setInterval(() => void loadWeather(), 15 * 60_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [activeWeatherCode, refreshToken]);

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
        const [newsRes, rssRes] = await Promise.allSettled([
          fetch('/api/live/news', { signal: controller.signal, cache: 'no-store' }),
          fetch('/api/live/rss', { signal: controller.signal, cache: 'no-store' }),
        ]);

        let hasSuccess = false;

        if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
          const body: unknown = await newsRes.value.json();
          if (isNewsSnapshot(body)) {
            setNews(body);
            hasSuccess = true;
          }
        }

        if (rssRes.status === 'fulfilled' && rssRes.value.ok) {
          const body: unknown = await rssRes.value.json();
          if (body && typeof body === 'object' && Array.isArray((body as RadarRssSnapshot).articles)) {
            setRss(body as RadarRssSnapshot);
            hasSuccess = true;
          }
        }

        if (!hasSuccess) {
          throw new Error('Les flux d’actualités sont momentanément indisponibles.');
        }
        setNewsError(null);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setNewsError(error instanceof Error ? error.message : 'Impossible de charger les flux.');
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
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!active) return;
        if (body && typeof body === 'object' && 'countries' in body) {
          setChannelsSummary(body as LiveChannelsSummarySnapshot);
        }
      } catch {
        // Ignored
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
  }, []);

  const gdeltArticles = useMemo<RadarArticle[]>(() => {
    return (news?.articles ?? []).map((a) => ({
      ...a,
      sourceType: 'gdelt',
      sourceName: a.domain,
    }));
  }, [news]);

  const rssArticles = useMemo<RadarArticle[]>(() => {
    return (rss?.articles ?? []).map((a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      indexedAt: a.publishedAt,
      countryCode: a.countryCode,
      sourceType: 'rss',
      sourceName: a.sourceName,
      category: a.category,
    }));
  }, [rss]);

  const allMergedArticles = useMemo<RadarArticle[]>(() => {
    const seen = new Set<string>();
    const merged: RadarArticle[] = [];
    for (const art of [...rssArticles, ...gdeltArticles]) {
      const key = art.url.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(art);
      }
    }
    return merged.sort((a, b) => Date.parse(b.indexedAt) - Date.parse(a.indexedAt));
  }, [rssArticles, gdeltArticles]);

  const currentTabArticles = useMemo<RadarArticle[]>(() => {
    if (feedTab === 'rss') return rssArticles;
    if (feedTab === 'gdelt') return gdeltArticles;
    return allMergedArticles;
  }, [feedTab, rssArticles, gdeltArticles, allMergedArticles]);

  const visibleArticles = useMemo(() => {
    return selectedCountry
      ? currentTabArticles.filter((article) => article.countryCode === selectedCountry)
      : currentTabArticles;
  }, [currentTabArticles, selectedCountry]);

  const tabCounts = useMemo(() => {
    if (!selectedCountry) {
      return {
        all: allMergedArticles.length,
        rss: rssArticles.length,
        gdelt: gdeltArticles.length,
      };
    }
    return {
      all: allMergedArticles.filter((a) => a.countryCode === selectedCountry).length,
      rss: rssArticles.filter((a) => a.countryCode === selectedCountry).length,
      gdelt: gdeltArticles.filter((a) => a.countryCode === selectedCountry).length,
    };
  }, [selectedCountry, allMergedArticles, rssArticles, gdeltArticles]);

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of allMergedArticles) {
      if (article.countryCode) counts.set(article.countryCode, (counts.get(article.countryCode) ?? 0) + 1);
    }
    return counts;
  }, [allMergedArticles]);

  const domainsCount = useMemo(() => {
    return new Set(allMergedArticles.map((article) => article.sourceName || article.domain)).size;
  }, [allMergedArticles]);

  const activeCountry = AFRICAN_COUNTRIES.find((country) => country.code === selectedCountry) ?? null;

  return (
    <main className="min-h-screen bg-[#070a09] text-zinc-100 selection:bg-emerald-300/20 selection:text-emerald-100">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080b0a]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-tricolor-bar opacity-90" />
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3">
          <Link href="/" aria-label="Accueil Africa Live" className="flex shrink-0 items-center gap-2.5 rounded-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300/10 p-1 ring-1 ring-emerald-200/20">
              <BrandLogo className="h-full w-full" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-black tracking-tight text-white">Africa Live</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">Radar panafricain</span>
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] font-semibold text-emerald-100 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>VEILLE ACTIVE</span>
              <span className="font-mono tabular-nums text-emerald-100/70">{clock || '—'}</span>
              <span className="text-emerald-100/50">GMT</span>
            </div>
            <LocalAccountControls />
            <Link
              href="/app"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300 px-3.5 py-2 text-xs font-extrabold text-zinc-950 shadow-[0_6px_24px_-10px_rgba(252,211,77,0.65)] transition hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 sm:px-4 sm:text-sm"
            >
              <span className="hidden sm:inline">Ouvrir l’app des chaînes</span>
              <span className="sm:hidden">Chaînes</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <LiveMarketTicker
        onSelectCountry={(code) => setSelectedCountry(code)}
      />

      <div className="mx-auto max-w-[1480px] px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <section className="mb-6 flex flex-col gap-5 xl:mb-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
              <Radar aria-hidden="true" className="h-4 w-4" />
              Afrique · sources ouvertes · actualisé automatiquement
            </div>
            <h1 className="text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-[44px]">
              L’Afrique, <span className="text-gradient-africa">vue depuis le terrain.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Une veille médiatique panafricaine, une carte des rédactions et un point de suivi prévu à Dakar. Ouvrez une dépêche, puis retrouvez les chaînes du pays dans Africa Live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsBriefingOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-amber-400/10 to-emerald-400/15 px-3.5 py-2 text-xs font-black text-amber-200 shadow-[0_4px_20px_-8px_rgba(251,191,36,0.35)] transition hover:border-amber-300 hover:bg-amber-400/25 hover:text-white"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Flash Briefing IA (12h)</span>
            </button>
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              disabled={refreshing}
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-zinc-200 transition hover:border-emerald-300/30 hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} />
              {refreshing ? 'Actualisation…' : 'Actualiser'}
            </button>
          </div>
        </section>

        <section aria-label="Indicateurs de veille" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Résultats chargés · 24 h" value={news || rss ? String(allMergedArticles.length) : '—'} icon={<Newspaper className="h-4 w-4" />} />
          <MetricCard label="Médias & Rédactions" value={news || rss ? String(domainsCount) : '—'} icon={<Radar className="h-4 w-4" />} />
          <MetricCard label="Pays représentés" value={news || rss ? String(countryCounts.size) : '—'} icon={<MapPin className="h-4 w-4" />} />
          <MetricCard
            label="Chaînes directes actives"
            value={channelsSummary ? String(channelsSummary.totalChannels) : '—'}
            subLabel={channelsSummary && channelsSummary.totalDirectWeb > 0 ? `${channelsSummary.totalDirectWeb} Web` : undefined}
            icon={<Tv className="h-4 w-4 text-amber-300" />}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <article className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
                    <Radar aria-hidden="true" className="h-4 w-4" />
                  </span>
                  Carte tactique interactive & Globe 3D
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Navigation 2D & Globe 3D immersif, zoom molette, inclinaison horizon et couches OSINT.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                2D / Globe 3D · MapLibre GL
              </span>
            </div>

            <div className="p-2 sm:p-3">
              <TacticalVectorMap
                countries={AFRICAN_COUNTRIES}
                countryCounts={countryCounts}
                channelsSummary={channelsSummary}
                selectedCountry={selectedCountry}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onSelectCountryForChannels={handleSelectCountryForChannels}
              />
            </div>

            <div className="border-t border-white/[0.07] bg-black/20 px-4 py-3 text-[11px] leading-5 text-zinc-500 sm:px-5">
              <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-300/80" />
              Fonds de carte Satellite haute résolution (Esri), Topographique (OpenFreeMap) et OpenStreetMap sous licence libre. Les marqueurs situent les médias indexés et les télévisions directes.
            </div>
          </article>

          <article className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-5">
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
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setRightPanelTab('news')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    rightPanelTab === 'news'
                      ? 'bg-white/[0.12] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Newspaper className="h-3.5 w-3.5 text-amber-300" />
                  <span>Dépêches ({allMergedArticles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('channels')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    rightPanelTab === 'channels'
                      ? 'border border-amber-400/30 bg-amber-400/15 text-amber-200 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
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
                  <span className="font-semibold text-emerald-200">{activeCountry.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCountry(null)}
                    className="text-zinc-500 hover:text-white"
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
                <div className="flex flex-col gap-2 border-b border-white/[0.07] px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
                          <Newspaper aria-hidden="true" className="h-3.5 w-3.5" />
                        </span>
                        Fil des dépêches
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Rédactions africaines & veille GDELT · {allMergedArticles.length} disponibles
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rss && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          5 Rédactions
                        </span>
                      )}
                      {news?.stale && (
                        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-bold text-amber-200">
                          Cache
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feed selector tabs */}
                  <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-black/40 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFeedTab('all')}
                      className={`flex-1 rounded-lg px-2.5 py-1 text-center text-[11px] font-bold transition ${
                        feedTab === 'all'
                          ? 'bg-white/[0.12] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Tous ({tabCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedTab('rss')}
                      className={`flex-1 rounded-lg px-2.5 py-1 text-center text-[11px] font-bold transition ${
                        feedTab === 'rss'
                          ? 'border border-emerald-400/30 bg-emerald-400/15 text-emerald-200 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Rédactions ({tabCounts.rss})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedTab('gdelt')}
                      className={`flex-1 rounded-lg px-2.5 py-1 text-center text-[11px] font-bold transition ${
                        feedTab === 'gdelt'
                          ? 'bg-white/[0.12] text-white shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      GDELT ({tabCounts.gdelt})
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

                {newsError && (news || rss) && (
                  <div role="status" className="border-b border-amber-200/10 bg-amber-200/[0.04] px-4 py-2 text-[11px] text-amber-100/80 sm:px-5">
                    Mise à jour partielle ; les dernières dépêches chargées restent consultables.
                  </div>
                )}

                <div aria-live="polite" className="flex-1 divide-y divide-white/[0.055] overflow-y-auto xl:max-h-[515px]">
                  {newsError && !news && !rss ? (
                    <div className="m-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
                      <p>{newsError}</p>
                      <button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="mt-3 font-bold text-amber-200 underline underline-offset-4">Réessayer</button>
                    </div>
                  ) : !news && !rss ? (
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
                          ? `Ce pays n'a pas de dépêche récente dans le flux sélectionné.`
                          : 'Essayez une autre source ou effacez la sélection.'}
                      </p>
                      {selectedCountry && (
                        <button
                          type="button"
                          onClick={() => setSelectedCountry(null)}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
                        >
                          Afficher toutes les dépêches ({allMergedArticles.length})
                        </button>
                      )}
                    </div>
                  ) : (
                    visibleArticles.map((article, index) => (
                      <ArticleRow
                        key={article.url + index}
                        article={article}
                        country={AFRICAN_COUNTRIES.find((country) => country.code === article.countryCode)}
                        channelCount={article.countryCode ? channelsSummary?.countries[article.countryCode]?.channelCount : undefined}
                        onSelectCountryForChannels={handleSelectCountryForChannels}
                        onSelectCountry={(code) => setSelectedCountry(code)}
                      />
                    ))
                  )}
                </div>

                <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] leading-4 text-zinc-500 sm:px-5">
                  Les liens ouvrent les publications d’origine. Africa Live affiche les titres et métadonnées de veille, sans reprendre le contenu des articles.
                </div>
              </>
            )}
          </article>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <article className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">
                  <CloudSun aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    Météo en direct
                    <span className="text-zinc-600 font-normal">·</span>
                    <span className="text-sky-200">{weather?.current.locationName ?? 'Dakar'}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Observation temps réel · Open-Meteo CC BY 4.0
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {weather?.stale ? (
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Données en cache
                  </span>
                ) : weather ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    En direct
                  </span>
                ) : null}
              </div>
            </div>

            {/* Quick city selectors */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] bg-black/25 px-4 py-2.5 text-xs no-scrollbar sm:px-5">
              {weather?.quickLocations.map((loc) => {
                const isActive = activeWeatherCode === loc.code;
                return (
                  <button
                    key={loc.code}
                    type="button"
                    onClick={() => {
                      setSelectedCityCode(loc.code);
                      setSelectedCountry(loc.code);
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      isActive
                        ? 'border border-sky-300/30 bg-sky-300/15 text-sky-100 shadow-sm'
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
              {weatherError && !weather ? (
                <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-xs text-amber-100/90">
                  <p>{weatherError}</p>
                  <button
                    type="button"
                    onClick={() => setRefreshToken((v) => v + 1)}
                    className="mt-2 font-bold text-amber-200 underline underline-offset-4"
                  >
                    Réessayer
                  </button>
                </div>
              ) : weatherLoading && !weather ? (
                <div className="space-y-3" aria-label="Chargement de la météo">
                  <div className="h-20 animate-pulse rounded-xl bg-white/[0.035]" />
                  <div className="h-14 animate-pulse rounded-xl bg-white/[0.02]" />
                </div>
              ) : weather ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-sky-300/15 bg-sky-400/[0.04] p-4">
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
                        {weather.current.timezone}
                      </div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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

                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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

                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
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

                    <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <Compass className="h-3 w-3 text-amber-300" />
                        Relevé
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-white tabular-nums">
                        {formatTime(weather.current.observedAt)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-zinc-400">
                        Heure locale
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-white/[0.06] bg-black/20 px-4 py-2.5 text-[10px] leading-4 text-zinc-500 sm:px-5 flex flex-wrap items-center justify-between gap-2">
              <span>
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sky-300/80 hover:text-sky-200 underline underline-offset-2"
                >
                  Données Open-Meteo
                </a>{' '}
                · CC BY 4.0 · Relevé d’observation automatisé sans valeur d’alerte officielle de protection civile.
              </span>
              <span className="text-zinc-600">Aucun relevé simulé</span>
            </div>
          </article>

          <article className="rounded-2xl border border-white/[0.09] bg-[#0b100e] p-4 sm:p-5 lg:col-span-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200"><Info aria-hidden="true" className="h-4 w-4" /></span>
              Comment lire le radar
            </div>
            <div className="mt-4 space-y-3 text-xs leading-5 text-zinc-400">
              <p><strong className="text-zinc-200">Veille, pas alerte officielle.</strong> Le nombre d’articles indexés ne mesure ni la gravité ni la véracité d’une situation.</p>
              <p><strong className="text-zinc-200">Origine, pas géolocalisation.</strong> Les points cartographient le pays de publication connu du média ; l’événement peut se dérouler ailleurs.</p>
              <p><strong className="text-zinc-200">Retour au terrain.</strong> Le bouton « Ouvrir l’app des chaînes » donne accès au catalogue complet et à ses lecteurs habituels.</p>
            </div>
            <Link href="/app" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/[0.14]">
              Voir toutes les chaînes <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </article>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>GDELT DOC · requête actualisée toutes les 5 minutes · disponibilité amont variable</span>
          <span>Le service ne confirme pas les faits rapportés par les sources.</span>
        </footer>
      </div>

      <FlashBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        selectedCountryCode={selectedCountry}
        onSelectCountryForChannels={handleSelectCountryForChannels}
      />
    </main>
  );
}

function MetricCard({
  label,
  value,
  subLabel,
  icon,
}: {
  label: string;
  value: string;
  subLabel?: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0b100e] px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-emerald-200">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black tracking-tight text-white tabular-nums">
            {value}
          </span>
          {subLabel && (
            <span className="text-[10px] font-bold text-amber-300/80 truncate">
              {subLabel}
            </span>
          )}
        </div>
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
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
              Chaînes en direct : <strong>{activeCountry.name}</strong> ({countryChannels.length})
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
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isPlaying
                        ? 'border border-red-500/40 bg-red-500/15 text-red-200'
                        : 'border border-amber-300/30 bg-amber-300/[0.12] text-amber-200 hover:bg-amber-300/25 hover:text-white'
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
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-white/20 hover:text-white"
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
          Télévisions d’Afrique en direct
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
              className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:border-amber-400/30 hover:bg-white/[0.05] group"
            >
              <div className="min-w-0 pr-2">
                <div className="font-bold text-xs text-white group-hover:text-amber-200 transition">
                  {c.name}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  {c.region}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">
                  <Tv className="h-2.5 w-2.5" />
                  <span>{totalCh}</span>
                </div>
                {webCh > 0 && (
                  <div className="mt-0.5 text-[9px] text-emerald-400">
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
    if (name.includes('ecofin')) return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
    if (name.includes('rfi')) return 'border-rose-400/30 bg-rose-400/10 text-rose-300';
    if (name.includes('jeune')) return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-300';
    if (name.includes('bbc')) return 'border-red-400/30 bg-red-400/10 text-red-300';
    return 'border-zinc-700 bg-white/[0.04] text-zinc-300';
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
            className="rounded px-1 text-zinc-400 transition hover:bg-emerald-300/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
            title={`Centrer la carte sur ${country?.name ?? article.countryCode}`}
          >
            {country?.name ?? 'Source africaine'}
          </button>
        ) : (
          <span>{country?.name ?? 'Source africaine'}</span>
        )}
        {article.countryCode && channelCount !== undefined && channelCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectCountryForChannels?.(article.countryCode!)}
            className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 transition hover:bg-amber-400/20"
            title={`Voir les ${channelCount} chaîne(s) TV directes`}
          >
            <Tv className="h-2.5 w-2.5" />
            <span>{channelCount} direct</span>
          </button>
        )}
        <span className="ml-auto font-mono font-normal tracking-normal text-zinc-600">{formatTime(article.indexedAt)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-5 text-zinc-200 transition group-hover:text-white focus-visible:rounded-sm">
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-zinc-600 group-hover:text-emerald-200" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        {isRss ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-400/90">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
            Dépêche officielle · Rédaction vérifiée
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600">
            <span className="h-1 w-1 rounded-full bg-emerald-300/70" />
            Titre indexé · GDELT
          </span>
        )}
        {country && <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600"><MapPin aria-hidden="true" className="h-2.5 w-2.5" />{country.region}</span>}
      </div>
    </div>
  );
}
