'use client';

import { useCallback, useEffect, useMemo, useState, Suspense, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import RadarSourcesPanel from '@/components/radar/RadarSourcesPanel';
import { radarCountry, radarCountryUrl, sourcePlaceholder, type RadarSourceRow } from '@/lib/radar-workspace';
import Link from 'next/link';
import AppNavigation, { AppBrand } from '@/components/AppNavigation';
import { catalogCountryHref } from '@/lib/catalog-filter-state';
import LocalAccountControls from '@/components/LocalAccountControls';
import Player from '@/components/Player';
import LiveMarketTicker from '@/components/radar/LiveMarketTicker';
import { canonicalArticleUrl, temporalWindow, formatRadarDate, radarSource } from '@/lib/radar-data';
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
  return <Suspense fallback={<p className="p-4">Chargement du Radar…</p>}><RadarWorkspace /></Suspense>;
}

function RadarWorkspace() {
  const [news, setNews] = useState<RadarNewsSnapshot | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const countryParam = searchParams.get('country');
  const selectedCountry = radarCountry(countryParam);
  const setSelectedCountry = useCallback((code: string | null) => {
    const next = radarCountryUrl(window.location.href, code);
    if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.pushState(null, '', next);
  }, []);
  const [mapRequested, setMapRequested] = useState(false);
  const [desktopMap, setDesktopMap] = useState(false);
  const [tickerSources, setTickerSources] = useState<RadarSourceRow[]>([]);
  const [layerSources, setLayerSources] = useState<RadarSourceRow[]>([]);
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
  const [feedTab, setFeedTab] = useState<'all' | 'rss' | 'gdelt'>('all');

  const [channelsSummary, setChannelsSummary] = useState<LiveChannelsSummarySnapshot | null>(null);
  const [countryChannels, setCountryChannels] = useState<Channel[]>([]);
  const [countryChannelsLoading, setCountryChannelsLoading] = useState(false);
  const [countryChannelsError, setCountryChannelsError] = useState<string | null>(null);
  const [activePlayChannel, setActivePlayChannel] = useState<Channel | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'news' | 'channels'>('news');

  const [selectedCityCode, setSelectedCityCode] = useState<{ code: string; countryContext: string | null } | null>(null);
  const activeWeatherCode = selectedCityCode?.countryContext === selectedCountry ? selectedCityCode.code : selectedCountry ?? 'SN';
  const [weather, setWeather] = useState<LiveWeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadWeather = async () => {
      setWeatherLoading(true);
      setWeather(previous => previous?.current.countryCode === activeWeatherCode ? previous : null);
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
        const results = await Promise.allSettled(['/api/live/news', '/api/live/rss'].map(async url => {
          const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Source indisponible');
          const body: unknown = await response.json();
          if (!body || typeof body !== 'object' || !Array.isArray((body as RadarNewsSnapshot).articles)) throw new Error('Format invalide');
          if (url.endsWith('/news') && !isNewsSnapshot(body)) throw new Error('Format GDELT invalide');
          if (url.endsWith('/rss') && (!Array.isArray((body as RadarRssSnapshot).sources) || typeof (body as RadarRssSnapshot).updatedAt !== 'string')) throw new Error('Format RSS invalide');
          return body;
        }));
        if (!active) return;
        setAsOf(Date.now());
        const [newsResult, rssResult] = results;
        if (newsResult.status === 'fulfilled' && isNewsSnapshot(newsResult.value)) setNews(newsResult.value);
        else setNews(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 45 * 60_000 ? { ...previous, stale: true, availability: previous.availability?.map(source => source.status === 'unavailable' ? source : { ...source, status: 'stale' as const }) } : null);
        if (rssResult.status === 'fulfilled') setRss(rssResult.value as RadarRssSnapshot);
        else setRss(previous => previous && Date.now() - Date.parse(previous.updatedAt) <= 45 * 60_000 ? { ...previous, stale: true, availability: previous.availability?.map(source => source.status === 'unavailable' ? source : { ...source, status: 'stale' as const }) } : null);
        const failures = results.flatMap((result, index) => result.status === 'rejected' ? [index ? 'RSS' : 'GDELT'] : []);
        setNewsError(failures.length ? `${failures.join(' et ')} indisponible(s). Les autres sources restent consultables.` : null);
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

  const gdeltArticles = useMemo<RadarArticle[]>(() => {
    return [...(news?.articles ?? []), ...(news?.undatedArticles ?? [])].map((a) => ({
      ...a,
      sourceType: 'gdelt',
      sourceName: a.domain,
    }));
  }, [news]);

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
    }));
  }, [rss]);

  const allMergedArticles = useMemo<RadarArticle[]>(() => {
    const seen = new Set<string>();
    const merged: RadarArticle[] = [];
    for (const art of [...rssArticles, ...gdeltArticles]) {
      const key = canonicalArticleUrl(art.url);
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(art);
      }
    }
    return merged.sort((a, b) => (Date.parse(b.indexedAt) || 0) - (Date.parse(a.indexedAt) || 0));
  }, [rssArticles, gdeltArticles]);

  const windowed = useMemo(() => temporalWindow(allMergedArticles, a => a.indexedAt, asOf), [allMergedArticles, asOf]);
  const matches = (a: RadarArticle) => (!selectedCountry || a.countryCode === selectedCountry) &&
    (feedTab === 'all' || a.sourceType === feedTab);
  const visibleArticles = windowed.recent.filter(matches);
  const visibleUnknownArticles = windowed.undated.filter(matches);
  const tabCounts = {
    all: windowed.recent.filter(a => !selectedCountry || a.countryCode === selectedCountry).length,
    rss: windowed.recent.filter(a => a.sourceType === 'rss' && (!selectedCountry || a.countryCode === selectedCountry)).length,
    gdelt: windowed.recent.filter(a => a.sourceType === 'gdelt' && (!selectedCountry || a.countryCode === selectedCountry)).length,
  };
  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of windowed.recent) {
      if (article.countryCode) counts.set(article.countryCode, (counts.get(article.countryCode) ?? 0) + 1);
    }
    return counts;
  }, [windowed]);

  const domainsCount = new Set(visibleArticles.map(article => article.sourceName || article.domain)).size;

  const sourceRows: RadarSourceRow[] = [
    ...(news?.availability ?? (news ? [radarSource('GDELT', 'Pays du média', Date.parse(news.updatedAt), 5 * 60_000, news.articles.length, { status: news.stale ? 'stale' : undefined, dataAt: news.articles[0]?.indexedAt })] : [sourcePlaceholder('GDELT', 'Afrique · pays du média', newsError?.includes('GDELT') ? 'unavailable' : 'loading')])),
    ...(rss?.availability ?? (rss ? [radarSource('RSS', 'Afrique · publications', Date.parse(rss.updatedAt), 5 * 60_000, rss.articles.length, { status: rss.stale ? 'stale' : undefined })] : [sourcePlaceholder('RSS', 'Afrique · publications', newsError?.includes('RSS') ? 'unavailable' : 'loading')])),
    ...(weather?.availability ?? [sourcePlaceholder('Open-Meteo', activeWeatherCode, weatherError ? 'unavailable' : 'loading')]),
    channelsSummary ? radarSource('Catalogue TV', 'Afrique · références et candidates', Date.parse(channelsSummary.updatedAt), 10 * 60_000, channelsSummary.totalChannels, { status: summaryError || channelsSummary.stale ? 'stale' : undefined, dataAt: channelsSummary.updatedAt }) : sourcePlaceholder('Catalogue TV', 'Afrique', summaryError ? 'unavailable' : 'loading'),
    ...(tickerSources.length ? tickerSources : [sourcePlaceholder('Marchés / bandeau', 'Cotations et événements', 'loading')]),
    ...(showMap && layerSources.length ? layerSources : [sourcePlaceholder('NASA FIRMS', 'Détections thermiques', 'not_requested'), sourcePlaceholder('USGS / GDACS', 'Lieu des événements', 'not_requested')]),
  ];

  const activeCountry = AFRICAN_COUNTRIES.find((country) => country.code === selectedCountry) ?? null;

  return (
    <main className="min-h-screen bg-[#070a09] text-zinc-100 selection:bg-emerald-300/20 selection:text-emerald-100">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#080b0a]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-tricolor-bar opacity-90" />
        <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-2">
          <AppBrand />
          <AppNavigation country={selectedCountry} />

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-1.5 text-[11px] font-semibold text-emerald-100 sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>HEURE DE DAKAR</span>
              <span className="font-mono tabular-nums text-emerald-100/70">{clock || '—'}</span>
              <span className="text-emerald-100/50">GMT</span>
            </div>
            <LocalAccountControls />

          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-3 pb-8 pt-3 sm:px-6">
        <section className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">Radar Afrique</h1><p className="text-xs text-zinc-400">Dépêches, météo et télévisions par pays.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled title="Le briefing reste désactivé jusqu’à sa prochaine implémentation." className="rounded-lg border border-white/10 px-2 py-2 text-[11px] text-zinc-500"><Sparkles aria-hidden="true" className="mr-1 inline h-3 w-3" />Briefing — bientôt</button>
            <button type="button" onClick={() => setRefreshToken(value => value + 1)} disabled={refreshing} className="rounded-lg border border-white/10 px-2 py-2 text-[11px] text-zinc-200 focus-visible:outline-2 focus-visible:outline-emerald-300"><RefreshCw aria-hidden="true" className="mr-1 inline h-3 w-3" />{refreshing ? 'Actualisation…' : 'Actualiser'}</button>
          </div>
        </section>
        <section aria-label="Sélection du pays" className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#0b100e] p-2">
          <label htmlFor="radar-country" className="text-xs font-semibold text-zinc-200">Choisir un pays</label>
          <select id="radar-country" aria-label="Choisir un pays" aria-describedby="radar-country-help" value={selectedCountry ?? ''} onChange={event => setSelectedCountry(event.target.value || null)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-300">
            <option value="">Afrique · tous les pays</option>{AFRICAN_COUNTRIES.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
          {selectedCountry && <button type="button" onClick={() => setSelectedCountry(null)} className="rounded p-2 text-xs text-emerald-200">Réinitialiser le pays</button>}
          <p id="radar-country-help" className="sr-only">Sélectionnez au clavier ou tapez le début du nom dans la liste. Le pays est conservé dans le lien ; la carte utilise le même choix.</p>
          {countryParam && !selectedCountry && <p role="status" className="w-full text-xs text-amber-200">Pays inconnu dans le lien : vue Afrique affichée.</p>}
        </section>

        <section aria-label="Indicateurs de veille" className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MetricCard label="Résultats chargés · 24 h" value={news || rss ? String(visibleArticles.length) : '—'} icon={<Newspaper className="h-4 w-4" />} />
          <MetricCard label="Médias & Rédactions" value={news || rss ? String(domainsCount) : '—'} icon={<Radar className="h-4 w-4" />} />
          <MetricCard label="Pays représentés" value={news || rss ? String(new Set(visibleArticles.map(a => a.countryCode).filter(Boolean)).size) : '—'} icon={<MapPin className="h-4 w-4" />} />
          <MetricCard
            label="Chaînes référencées"
            value={channelsSummary ? String(channelsSummary.totalChannels) : '—'}
            subLabel={channelsSummary ? `${channelsSummary.totalDirectWeb} web · ${channelsSummary.totalDirectVlc ?? 0} VLC` : undefined}
            icon={<Tv className="h-4 w-4 text-amber-300" />}
          />
        </section>

        <RadarSourcesPanel sources={sourceRows} />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <article aria-label="Fil et chaînes du pays" className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-5">
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
                  <span>Dépêches ({tabCounts.all})</span>
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
                        Rédactions africaines & veille GDELT · {visibleArticles.length} résultats datés · 24 h
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {rss && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          {rss.availability?.filter(source => source.status === 'available' || source.status === 'empty').length ?? rss.sources.length} sources RSS
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
                    {newsError} Les dernières dépêches chargées restent consultables.
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
                          Afficher toutes les dépêches ({windowed.recent.length})
                        </button>
                      )}
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
          <article aria-label="Carte du Radar" className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300">
                    <Radar aria-hidden="true" className="h-4 w-4" />
                  </span>
                  Carte des médias et du catalogue
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">
                  Médias et TV initiaux ; séismes et détections thermiques à activer séparément.
                </p>
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                2D / Globe 3D · MapLibre GL
              </span>
            </div>

            <div className="p-2 sm:p-3">
              {!desktopMap && <button type="button" aria-expanded={mapRequested} aria-controls="radar-map" onClick={() => setMapRequested(value => !value)} className="mb-2 rounded-lg border border-emerald-300/30 px-3 py-2 text-xs font-semibold text-emerald-200">{mapRequested ? 'Masquer la carte' : 'Afficher la carte'}</button>}
              <div id="radar-map">{showMap ? (
              <TacticalVectorMap
                countries={AFRICAN_COUNTRIES}
                countryCounts={countryCounts}
                channelsSummary={channelsSummary}
                selectedCountry={selectedCountry}
                onSelectCountry={(code) => setSelectedCountry(code)}
                onSelectCountryForChannels={handleSelectCountryForChannels}
                onSourcesChange={setLayerSources}
              />
              ) : <p className="p-3 text-xs text-zinc-400">Carte à la demande. Le choix du pays et les dépêches fonctionnent sans elle.</p>}</div>
            </div>

            <div className="border-t border-white/[0.07] bg-black/20 px-4 py-3 text-[11px] leading-5 text-zinc-500 sm:px-5">
              <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-300/80" />
              Fonds de carte Satellite haute résolution (Esri), Topographique (OpenFreeMap) et OpenStreetMap sous licence libre. Les marqueurs situent les médias indexés et les télévisions référencées.
            </div>
          </article>


        </section>

        <details className="mt-4 rounded-xl border border-white/10 bg-[#0b100e]">
          <summary className="cursor-pointer p-3 text-xs font-semibold text-zinc-200">Marchés et événements · bandeau daté</summary>
          <LiveMarketTicker onSelectCountry={setSelectedCountry} onSourcesChange={setTickerSources} refreshToken={refreshToken} />
        </details>
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
                      setSelectedCityCode({ code: loc.code, countryContext: selectedCountry });
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
            <details className="mt-3 text-xs text-zinc-300"><summary className="cursor-pointer">Définitions, fenêtre et limites</summary><div className="mt-2 space-y-3 text-xs leading-5 text-zinc-400">
              <p>{asOf ? <>Fenêtre commune : {formatRadarDate(windowed.window.from)} — {formatRadarDate(windowed.window.asOf)}.</> : 'Fenêtre en cours de chargement.'} Limites : 75 GDELT / 150 RSS, couverture non exhaustive.</p>
              <p><strong className="text-zinc-200">TV référencées.</strong> Candidates web/VLC selon les contrôles du résolveur ; la lecture est vérifiée à l’ouverture. VLC inclut les candidates web.</p>
              <p><strong className="text-zinc-200">Veille, pas alerte officielle.</strong> Le nombre d’articles indexés ne mesure ni la gravité ni la véracité d’une situation.</p>
              <p><strong className="text-zinc-200">Origine, pas géolocalisation.</strong> GDELT situe le pays du média ; RSS peut inférer le pays du sujet. Ces indications ne localisent pas nécessairement l’événement.</p>
              <p><strong className="text-zinc-200">Retour au terrain.</strong> Le bouton « TV » donne accès au catalogue complet et à ses lecteurs habituels.</p>
            </div>
            </details>
            <Link href={catalogCountryHref(selectedCountry)} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-2 text-xs font-bold text-amber-100 transition hover:bg-amber-300/[0.14]">
              {selectedCountry ? 'Voir les chaînes du pays' : 'Voir toutes les chaînes'} <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </article>
        </section>

        <footer className="mt-7 flex flex-col gap-2 border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>GDELT DOC · requête actualisée toutes les 5 minutes · disponibilité amont variable</span>
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
}: {
  label: string;
  value: string;
  subLabel?: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0b100e] px-2 py-2.5">
      <span className="flex hidden h-7 w-7 shrink-0 sm:flex items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-emerald-200">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-lg font-bold tracking-tight text-white tabular-nums">
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
            {country?.name ?? 'Pays inconnu'}{article.countryBasis === 'inferred_topic' ? ' · sujet inféré' : ' · pays du média'}
          </button>
        ) : (
          <span>{country?.name ?? 'Pays inconnu'}{article.countryBasis === 'inferred_topic' ? ' · sujet inféré' : ' · pays du média'}</span>
        )}
        {article.countryCode && channelCount !== undefined && channelCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectCountryForChannels?.(article.countryCode!)}
            className="inline-flex items-center gap-1 rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 transition hover:bg-amber-400/20"
            title={`Voir les ${channelCount} chaîne(s) TV référencées`}
          >
            <Tv className="h-2.5 w-2.5" />
            <span>{channelCount} chaînes</span>
          </button>
        )}
        <span className="ml-auto font-mono font-normal tracking-normal text-zinc-600">{isRss ? 'Publication' : 'Indexation'} · {formatRadarDate(article.indexedAt)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-5 text-zinc-200 transition group-hover:text-white focus-visible:rounded-sm">
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-zinc-600 group-hover:text-emerald-200" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        {isRss ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-400/90">

            Titre publié · source RSS
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
