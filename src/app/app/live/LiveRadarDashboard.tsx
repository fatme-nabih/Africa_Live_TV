'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import BrandLogo from '@/components/BrandLogo';
import LocalAccountControls from '@/components/LocalAccountControls';
import type { RadarArticle, RadarCountry, RadarNewsSnapshot } from '@/lib/live-osint-types';
import {
  ArrowUpRight,
  CloudSun,
  ExternalLink,
  Info,
  MapPin,
  Newspaper,
  Radar,
  RefreshCw,
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 5 * 60_000;
const TIMEZONE = 'Africa/Dakar';

const AFRICA_OUTLINE: Array<[number, number]> = [
  [-17, 15], [-17, 22], [-13, 28], [-10, 33], [-5, 36], [1, 37], [9, 37], [12, 34], [20, 32],
  [25, 32], [33, 31], [35, 28], [34, 24], [39, 17], [43, 12], [51, 11], [49, 4], [44, 1],
  [42, -4], [41, -11], [44, -16], [40, -21], [35, -25], [33, -30], [28, -34], [22, -35],
  [18, -34], [16, -29], [13, -27], [12, -22], [14, -17], [12, -13], [13, -8], [12, -5],
  [14, -1], [11, 0], [10, 4], [7, 5], [3, 6], [1, 5], [-2, 5], [-5, 5], [-8, 5], [-11, 7],
  [-14, 10], [-17, 12],
];
const MADAGASCAR_OUTLINE: Array<[number, number]> = [
  [49.8, -12.0], [50.5, -15.2], [49.2, -18.4], [47.8, -22.0],
  [45.7, -25.5], [43.8, -22.6], [44.8, -18.0], [46.1, -14.2],
];

function project(longitude: number, latitude: number) {
  return {
    x: ((longitude + 30) / 90) * 680,
    y: ((38 - latitude) / 76) * 560,
  };
}

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

export default function LiveRadarDashboard() {
  const [news, setNews] = useState<RadarNewsSnapshot | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [clock, setClock] = useState('');

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
        const response = await fetch('/api/live/news', { signal: controller.signal, cache: 'no-store' });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error('Le flux de veille est indisponible.');
        if (!isNewsSnapshot(body)) throw new Error('Le format du flux de veille est invalide.');
        if (!active) return;
        setNews(body);
        setNewsError(null);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setNewsError(error instanceof Error ? error.message : 'Impossible de charger le fil.');
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

  const allArticles = news?.articles ?? [];
  const visibleArticles = useMemo(
    () => selectedCountry
      ? allArticles.filter((article) => article.countryCode === selectedCountry)
      : allArticles,
    [allArticles, selectedCountry],
  );
  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of allArticles) {
      if (article.countryCode) counts.set(article.countryCode, (counts.get(article.countryCode) ?? 0) + 1);
    }
    return counts;
  }, [allArticles]);
  const domainsCount = useMemo(() => new Set(allArticles.map((article) => article.domain)).size, [allArticles]);
  const activeCountry = news?.countries.find((country) => country.code === selectedCountry) ?? null;

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
          <button
            type="button"
            onClick={() => setRefreshToken((value) => value + 1)}
            disabled={refreshing}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-zinc-200 transition hover:border-emerald-300/30 hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} />
            {refreshing ? 'Actualisation…' : 'Actualiser'}
          </button>
        </section>

        <section aria-label="Indicateurs de veille" className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="Résultats chargés · 24 h" value={news ? String(allArticles.length) : '—'} icon={<Newspaper className="h-4 w-4" />} />
          <MetricCard label="Médias représentés" value={news ? String(domainsCount) : '—'} icon={<Radar className="h-4 w-4" />} />
          <MetricCard label="Pays représentés" value={news ? String(countryCounts.size) : '—'} icon={<MapPin className="h-4 w-4" />} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <article className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-7">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-300/10 text-emerald-300"><Radar aria-hidden="true" className="h-4 w-4" /></span>
                  Carte de veille médiatique
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Les marqueurs situent les médias indexés, pas les faits rapportés.</p>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">2D · légère</span>
            </div>

            <div className="relative isolate px-2 py-3 sm:px-4">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_52%_46%,rgba(16,185,129,0.11),transparent_58%)]" />
              <svg viewBox="0 0 680 560" role="img" aria-label="Carte schématique de l’Afrique avec les pays des médias présents dans le fil" className="mx-auto block w-full max-w-[760px]">
                <defs>
                  <linearGradient id="africa-land" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#17392d" />
                    <stop offset="100%" stopColor="#10251e" />
                  </linearGradient>
                  <pattern id="africa-grid" width="42" height="42" patternUnits="userSpaceOnUse">
                    <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#a7f3d0" strokeOpacity="0.08" strokeWidth="0.8" />
                  </pattern>
                  <clipPath id="africa-clip">
                    <path d={AFRICA_OUTLINE.map((point, index) => {
                      const position = project(point[0], point[1]);
                      return (index === 0 ? 'M ' : 'L ') + position.x + ' ' + position.y;
                    }).join(' ') + ' Z'} />
                    <path d={MADAGASCAR_OUTLINE.map((point, index) => {
                      const position = project(point[0], point[1]);
                      return (index === 0 ? 'M ' : 'L ') + position.x + ' ' + position.y;
                    }).join(' ') + ' Z'} />
                  </clipPath>
                </defs>
                <path
                  d={AFRICA_OUTLINE.map((point, index) => {
                    const position = project(point[0], point[1]);
                    return (index === 0 ? 'M ' : 'L ') + position.x + ' ' + position.y;
                  }).join(' ') + ' Z'}
                  fill="url(#africa-land)"
                  stroke="#4ade80"
                  strokeOpacity="0.6"
                  strokeWidth="1.5"
                />
                <path
                  d={MADAGASCAR_OUTLINE.map((point, index) => {
                    const position = project(point[0], point[1]);
                    return (index === 0 ? 'M ' : 'L ') + position.x + ' ' + position.y;
                  }).join(' ') + ' Z'}
                  fill="url(#africa-land)"
                  stroke="#4ade80"
                  strokeOpacity="0.6"
                  strokeWidth="1.5"
                />
                <rect x="0" y="0" width="680" height="560" fill="url(#africa-grid)" clipPath="url(#africa-clip)" />
                {news?.countries.map((country) => {
                  const count = countryCounts.get(country.code) ?? 0;
                  if (!count) return null;
                  const position = project(country.longitude, country.latitude);
                  const isSelected = selectedCountry === country.code;
                  const radius = Math.min(12, 5 + count * 0.7);
                  return (
                    <g
                      key={country.code}
                      role="button"
                      tabIndex={0}
                      aria-label={country.name + ' : ' + count + ' dépêches. ' + (isSelected ? 'Désélectionner le pays.' : 'Filtrer le fil sur ce pays.')}
                      onClick={() => setSelectedCountry(isSelected ? null : country.code)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedCountry(isSelected ? null : country.code);
                        }
                      }}
                      className="cursor-pointer outline-none"
                    >
                      <title>{country.name + ' · ' + count + ' dépêche(s) · pays du média'}</title>
                      <circle cx={position.x} cy={position.y} r={radius + 7} fill="#34d399" fillOpacity={isSelected ? '0.16' : '0.08'} />
                      <circle cx={position.x} cy={position.y} r={radius} fill={isSelected ? '#facc15' : '#6ee7b7'} stroke="#08100c" strokeWidth="2" />
                      {count > 1 && <text x={position.x} y={position.y + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="#06100b">{count}</text>}
                    </g>
                  );
                })}
                <text x="22" y="30" fill="#a7f3d0" fillOpacity="0.55" fontSize="9" fontFamily="monospace" letterSpacing="2">AFRIQUE · VEILLE PRESSE</text>
                <text x="22" y="542" fill="#a7f3d0" fillOpacity="0.45" fontSize="9" fontFamily="monospace">SOURCE COUNTRY · GDELT DOC</text>
              </svg>
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 text-[10px] text-zinc-500 sm:px-4">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-300" />Pays du média source</span>
                <button type="button" onClick={() => setSelectedCountry(null)} className="font-semibold text-emerald-200/80 hover:text-emerald-100">Effacer le filtre</button>
              </div>
            </div>

            <div className="border-t border-white/[0.07] bg-black/20 px-4 py-3 text-[11px] leading-5 text-zinc-500 sm:px-5">
              <Info aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px] text-amber-300/80" />
              Le pays indiqué correspond à l’origine de publication déclarée par GDELT. Il ne géolocalise pas l’événement décrit.
            </div>
          </article>

          <article className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b100e] shadow-[0_20px_70px_-35px_rgba(0,0,0,0.9)] xl:col-span-5">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200"><Newspaper aria-hidden="true" className="h-4 w-4" /></span>
                  Fil des dépêches
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Articles indexés · dernière interrogation {news ? formatTime(news.updatedAt) + ' GMT' : 'en cours'}</p>
              </div>
              <a href="https://www.gdeltproject.org/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-200 hover:text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> {news?.stale ? 'Données en cache' : 'GDELT'}
              </a>
            </div>

            {activeCountry && (
              <div className="flex items-center justify-between border-b border-emerald-200/10 bg-emerald-300/[0.05] px-4 py-2 text-xs">
                <span className="text-emerald-100">Filtre pays : <strong>{activeCountry.name}</strong></span>
                <button type="button" onClick={() => setSelectedCountry(null)} className="text-zinc-400 hover:text-white">Tout afficher</button>
              </div>
            )}

            {newsError && news && (
              <div role="status" className="border-b border-amber-200/10 bg-amber-200/[0.04] px-4 py-2 text-[11px] text-amber-100/80 sm:px-5">
                Mise à jour indisponible ; les dernières données chargées restent visibles.
              </div>
            )}

            <div aria-live="polite" className="flex-1 divide-y divide-white/[0.055] overflow-y-auto xl:max-h-[515px]">
              {newsError && !news ? (
                <div className="m-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-sm text-amber-100/80">
                  <p>{newsError}</p>
                  <button type="button" onClick={() => setRefreshToken((value) => value + 1)} className="mt-3 font-bold text-amber-200 underline underline-offset-4">Réessayer</button>
                </div>
              ) : !news ? (
                <div className="space-y-3 p-4" aria-label="Chargement des dépêches">
                  {[0, 1, 2, 3].map((row) => <div key={row} className="h-20 animate-pulse rounded-xl bg-white/[0.035]" />)}
                </div>
              ) : visibleArticles.length === 0 ? (
                <div className="p-8 text-center">
                  <Newspaper aria-hidden="true" className="mx-auto h-7 w-7 text-zinc-600" />
                  <p className="mt-3 text-sm font-bold text-zinc-300">Aucune dépêche dans ce filtre</p>
                  <p className="mt-1 text-xs text-zinc-500">Essayez un autre pays ou effacez la sélection.</p>
                </div>
              ) : (
                visibleArticles.map((article, index) => (
                  <ArticleRow key={article.url + index} article={article} country={news.countries.find((country) => country.code === article.countryCode)} />
                ))
              )}
            </div>

            <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] leading-4 text-zinc-500 sm:px-5">
              Les liens ouvrent les publications d’origine. Africa Live affiche les titres et métadonnées de veille, sans reprendre le contenu des articles.
            </div>
          </article>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          <article className="rounded-2xl border border-white/[0.09] bg-[#0b100e] p-4 sm:p-5 lg:col-span-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><CloudSun aria-hidden="true" className="h-4 w-4" /></span>
                  Météo à Dakar
                </div>
                <p className="mt-1.5 text-xs text-zinc-500">Point de suivi prévu · coordonnées fixes</p>
              </div>
            </div>
            <div className="mt-5 flex min-h-28 items-center gap-4 rounded-xl border border-sky-200/10 bg-sky-200/[0.035] p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-200/10 bg-sky-200/[0.06] text-sky-200"><CloudSun aria-hidden="true" className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-bold text-zinc-200">Météo en attente</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Ce volet sera activé dès qu’une source fiable de conditions météo pour Dakar sera disponible.</p>
              </div>
            </div>
            <div className="mt-4 border-t border-white/[0.06] pt-3 text-[10px] text-zinc-500">
              Aucun relevé météo n’est simulé dans ce tableau.
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
    </main>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0b100e] px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-emerald-200">{icon}</span>
      <div className="min-w-0">
        <div className="text-xl font-black tracking-tight text-white tabular-nums">{value}</div>
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{label}</div>
      </div>
    </div>
  );
}

function ArticleRow({ article, country }: { article: RadarArticle; country?: RadarCountry }) {
  return (
    <div className="group px-4 py-3.5 transition hover:bg-white/[0.025] sm:px-5">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <span className="text-emerald-200/90">{article.domain}</span>
        <span className="text-zinc-700">·</span>
        <span>{country?.name ?? 'Source africaine'}</span>
        <span className="ml-auto font-mono font-normal tracking-normal text-zinc-600">{formatTime(article.indexedAt)}</span>
      </div>
      <a href={article.url} target="_blank" rel="noopener noreferrer" className="block text-[13px] font-semibold leading-5 text-zinc-200 transition group-hover:text-white focus-visible:rounded-sm">
        {article.title}
        <ExternalLink aria-hidden="true" className="ml-1.5 inline h-3 w-3 text-zinc-600 group-hover:text-emerald-200" />
      </a>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600"><span className="h-1 w-1 rounded-full bg-emerald-300/70" />Titre indexé · non vérifié</span>
        {country && <span className="inline-flex items-center gap-1 text-[9px] text-zinc-600"><MapPin aria-hidden="true" className="h-2.5 w-2.5" />{country.region}</span>}
      </div>
    </div>
  );
}
