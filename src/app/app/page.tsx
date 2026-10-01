'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import AppNavigation, { AppBrand } from '@/components/AppNavigation';
import { useCatalogFilters } from '@/components/useCatalogFilters';
import BrandWatermark from '@/components/BrandWatermark';
import LocalAccountControls from '@/components/LocalAccountControls';
import FilterSidebar from '@/components/FilterSidebar';
import ChannelGrid from '@/components/ChannelGrid';
import CategoryTabs from '@/components/CategoryTabs';
import InlinePlayerModal from '@/components/InlinePlayerModal';
import AnchoredPlayer from '@/components/AnchoredPlayer';
import {
  catalogRequestSchema,
  catalogResponseSchema,
  favoritesResponseSchema,
  messageForApiError,
  readApiResponse,
  type CatalogRequest,
} from '@/lib/api-contracts';
import { LatestRequestController, SingleFlightGate } from '@/lib/latest-request';
import { launchPlayer, type PlayerWindowHandle } from '@/lib/player-window';
import type { Channel } from '@/types/channel';
import { AlertCircle, ExternalLink, Filter, LayoutGrid, LayoutList, List, MonitorPlay, Play, RefreshCw, X } from 'lucide-react';


const VLC_NOTICE_STORAGE_KEY = 'iptv_vlc_notice_dismissed';
const VLC_NOTICE_CHANGE_EVENT = 'iptv_vlc_notice_change';
const VLC_DOWNLOAD_URL = 'https://www.videolan.org/vlc/';
const FAVORITES_STORAGE_KEY = 'iptv_favorites';
const FAVORITES_PENDING_KEY = 'iptv_favorites_pending';
const FAVORITES_MIGRATED_KEY = 'iptv_favorites_server_migrated';
// Excluded from every production build, including Railway staging.
const ANCHORED_PLAYER_AVAILABLE = process.env.NODE_ENV === 'development';

function readStoredFavorites() {
  if (typeof window === 'undefined') return [];

  const saved = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
  if (!saved) return [];

  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (e) {
    console.error('Impossible de lire les favoris locaux.', e);
    return [];
  }
}

function readPendingFavorites() {
  if (typeof window === 'undefined') return {} as Record<string, boolean>;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(FAVORITES_PENDING_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
      ),
    );
  } catch {
    return {};
  }
}

function applyPendingFavorites(serverFavorites: string[], pending: Record<string, boolean>) {
  const merged = new Set(serverFavorites);
  for (const [id, desired] of Object.entries(pending)) {
    if (desired) merged.add(id);
    else merged.delete(id);
  }
  return [...merged];
}

function readVlcNoticeDismissed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(VLC_NOTICE_STORAGE_KEY) === 'true';
}

function subscribeToVlcNotice(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(VLC_NOTICE_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener(VLC_NOTICE_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getVlcNoticeSnapshot() {
  return !readVlcNoticeDismissed();
}

function getServerVlcNoticeSnapshot() {
  return true;
}

export default function Home() { return <Suspense fallback={<p>Chargement du catalogue…</p>}><CatalogWorkspace /></Suspense>; }

function CatalogWorkspace() {
  const { filters: baseFilters, favoritesOnly: showFavoritesOnly, activePresetId, update: handleFilterChange, setFavoritesOnly: handleShowFavoritesOnlyChange, selectPreset: handleSelectCategoryPreset, reset: resetFilters } = useCatalogFilters();
  const playerWindowRef = useRef<PlayerWindowHandle | null>(null);
  const catalogRequestsRef = useRef<LatestRequestController | null>(null);
  const favoriteSyncRequestsRef = useRef<LatestRequestController | null>(null);
  const favoriteQueuesRef = useRef(new Map<string, Promise<void>>());
  const favoritesRef = useRef<string[]>([]);
  const showFavoritesOnlyRef = useRef(false);
  const loadingMoreGateRef = useRef(new SingleFlightGate());
  if (catalogRequestsRef.current === null) catalogRequestsRef.current = new LatestRequestController();
  if (favoriteSyncRequestsRef.current === null) favoriteSyncRequestsRef.current = new LatestRequestController();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [canPlay, setCanPlay] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isInlinePlayerOpen, setIsInlinePlayerOpen] = useState(false);
  const [anchoredEnabled, setAnchoredEnabled] = useState(false);
  const [anchoredChannel, setAnchoredChannel] = useState<Channel | null>(null);
  const [externalStopped, setExternalStopped] = useState(false);
  const [playerWindowStatus, setPlayerWindowStatus] = useState<'idle' | 'open' | 'blocked' | 'closed'>('idle');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesHydrated, setFavoritesHydrated] = useState(false);
  const [favoritesRevision, setFavoritesRevision] = useState(0);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const showVlcNotice = useSyncExternalStore(
    subscribeToVlcNotice,
    getVlcNoticeSnapshot,
    getServerVlcNoticeSnapshot,
  );

  const [loading, setLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const closeMobileFilters = useCallback(() => setIsMobileFiltersOpen(false), []);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (baseFilters.search) count++;
    if (baseFilters.country) count++;
    if (baseFilters.group) count++;
    if (baseFilters.language) count++;
    if (baseFilters.status) count++;
    if (baseFilters.region) count++;
    if (showFavoritesOnly) count++;
    return count;
  }, [baseFilters, showFavoritesOnly]);

  // Keyboard shortcut (Ctrl+K or Cmd+K) for search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!window.matchMedia('(min-width: 1024px)').matches) setIsMobileFiltersOpen(true);
        window.requestAnimationFrame(() => {
          const input = document.getElementById('catalog-search') as HTMLInputElement | null;
          input?.focus(); input?.select();
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const catalogRequest = useMemo<CatalogRequest>(
    () => ({
      ...baseFilters,
      region: baseFilters.region ?? '',
      search: baseFilters.search.trim().length >= 2 ? baseFilters.search : '',
      favoritesOnly: showFavoritesOnly,
      cursor: null,
      limit: 30,
    }),
    [baseFilters, showFavoritesOnly],
  );

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const storedFavorites = readStoredFavorites();
      favoritesRef.current = storedFavorites;
      setFavorites(storedFavorites);
      setFavoritesHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!favoritesHydrated) return;
    favoritesRef.current = favorites;
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites, favoritesHydrated]);

  useEffect(() => {
    showFavoritesOnlyRef.current = showFavoritesOnly;
  }, [showFavoritesOnly]);

  const replaceFavorites = useCallback((nextFavorites: string[]) => {
    favoritesRef.current = nextFavorites;
    setFavorites(nextFavorites);
  }, []);

  const synchronizeFavorites = useCallback(async () => {
    const request = favoriteSyncRequestsRef.current!.begin();
    setFavoriteError(null);
    try {
      const response = await fetch('/api/favorites', { signal: request.signal, cache: 'no-store' });
      const server = await readApiResponse(response, favoritesResponseSchema);
      if (!favoriteSyncRequestsRef.current!.isCurrent(request.id)) return;

      const pending = readPendingFavorites();
      if (window.localStorage.getItem(FAVORITES_MIGRATED_KEY) !== 'true') {
        for (const id of readStoredFavorites()) pending[id] ??= true;
      }
      const add = Object.entries(pending).filter(([, desired]) => desired).map(([id]) => id);
      const remove = Object.entries(pending).filter(([, desired]) => !desired).map(([id]) => id);
      let canonical = server.favorites;
      if (add.length > 0 || remove.length > 0) {
        const mutationResponse = await fetch('/api/favorites', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ add, remove }),
          signal: request.signal,
        });
        canonical = (await readApiResponse(mutationResponse, favoritesResponseSchema)).favorites;
      }
      if (!favoriteSyncRequestsRef.current!.isCurrent(request.id)) return;

      const latestPending = readPendingFavorites();
      for (const [id, desired] of Object.entries(pending)) {
        if (latestPending[id] === desired) delete latestPending[id];
      }
      window.localStorage.setItem(FAVORITES_PENDING_KEY, JSON.stringify(latestPending));
      window.localStorage.setItem(FAVORITES_MIGRATED_KEY, 'true');
      replaceFavorites(applyPendingFavorites(canonical, latestPending));
      if (showFavoritesOnlyRef.current) setFavoritesRevision((revision) => revision + 1);
    } catch (error) {
      if (request.signal.aborted || !favoriteSyncRequestsRef.current!.isCurrent(request.id)) return;
      setFavoriteError(messageForApiError(error, 'La synchronisation des favoris a échoué.'));
    } finally {
      if (favoriteSyncRequestsRef.current!.isCurrent(request.id)) {
        favoriteSyncRequestsRef.current!.finish(request.id);
      }
    }
  }, [replaceFavorites]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void synchronizeFavorites();
    });
    return () => {
      active = false;
      favoriteSyncRequestsRef.current?.abort();
    };
  }, [synchronizeFavorites]);

  const toggleFavorite = useCallback((id: string) => {
    const desired = !favoritesRef.current.includes(id);
    const optimistic = desired
      ? [...new Set([...favoritesRef.current, id])]
      : favoritesRef.current.filter((favoriteId) => favoriteId !== id);
    const pending = { ...readPendingFavorites(), [id]: desired };
    window.localStorage.setItem(FAVORITES_PENDING_KEY, JSON.stringify(pending));
    replaceFavorites(optimistic);
    setFavoriteError(null);
    if (showFavoritesOnlyRef.current && !desired) {
      setChannels((current) => current.filter((channel) => channel.id !== id));
    }

    const previous = favoriteQueuesRef.current.get(id) ?? Promise.resolve();
    const queued = previous
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/favorites', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(desired ? { add: [id] } : { remove: [id] }),
        });
        const data = await readApiResponse(response, favoritesResponseSchema);
        const latestPending = readPendingFavorites();
        if (latestPending[id] === desired) delete latestPending[id];
        window.localStorage.setItem(FAVORITES_PENDING_KEY, JSON.stringify(latestPending));
        replaceFavorites(applyPendingFavorites(data.favorites, latestPending));
        if (showFavoritesOnlyRef.current) setFavoritesRevision((revision) => revision + 1);
      })
      .catch((error) => {
        setFavoriteError(
          `${messageForApiError(error, 'La mise à jour du favori a échoué.')} Le choix reste conservé localement.`,
        );
      })
      .finally(() => {
        if (favoriteQueuesRef.current.get(id) === queued) favoriteQueuesRef.current.delete(id);
      });
    favoriteQueuesRef.current.set(id, queued);
  }, [replaceFavorites]);

  const fetchChannels = useCallback(async (requestInput: CatalogRequest, append = false) => {
    if (append && !loadingMoreGateRef.current.enter()) return;
    const request = catalogRequestsRef.current!.begin();
    setLoading(true);
    setCatalogError(null);
    try {
      const body = catalogRequestSchema.parse(requestInput);
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: request.signal,
      });
      const data = await readApiResponse(response, catalogResponseSchema);
      if (!catalogRequestsRef.current!.isCurrent(request.id)) return;
      setCanPlay(data.canPlay);
      const visibleChannels = data.channels.filter(
        (channel) => channel.availabilityStatus !== 'OFFLINE',
      );
      setChannels((current) => {
        if (!append) return visibleChannels;
        const merged = new Map(current.map((channel) => [channel.id, channel]));
        for (const channel of visibleChannels) merged.set(channel.id, channel);
        return [...merged.values()];
      });
      setNextCursor(data.nextCursor);
    } catch (error) {
      if (request.signal.aborted || !catalogRequestsRef.current!.isCurrent(request.id)) return;
      setCatalogError(messageForApiError(error, 'Impossible de charger le catalogue.'));
    } finally {
      if (append) loadingMoreGateRef.current.leave();
      if (catalogRequestsRef.current!.isCurrent(request.id)) {
        setLoading(false);
        catalogRequestsRef.current!.finish(request.id);
      }
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!nextCursor || loading || loadingMoreGateRef.current.isActive()) return;
    void fetchChannels({ ...catalogRequest, cursor: nextCursor }, true);
  }, [catalogRequest, fetchChannels, loading, nextCursor]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setChannels([]); setNextCursor(null); setLoading(true); } });
    const timer = window.setTimeout(() => {
      if (!active) return;
      loadingMoreGateRef.current.leave();
      void fetchChannels(catalogRequest, false);
    }, baseFilters.search ? 300 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      catalogRequestsRef.current?.abort();
    };
  }, [catalogRequest, baseFilters.search, favoritesRevision, fetchChannels]);

  const retryCatalog = useCallback(() => {
    void fetchChannels(catalogRequest, false);
  }, [catalogRequest, fetchChannels]);


  const openPlayerForChannel = useCallback((channel: Channel) => {
    setAnchoredChannel(null);
    setSelectedChannel(channel);
    setIsInlinePlayerOpen(false);
    const result = launchPlayer({
      channelId: channel.id,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      openWindow: (url, target, features) => window.open(url, target, features),
      navigateCurrentTab: (url) => window.location.assign(url),
    });

    if (result.mode === 'separate-window') {
      playerWindowRef.current = result.handle;
      setPlayerWindowStatus('open');
    } else if (result.mode === 'blocked') {
      playerWindowRef.current = null;
      setPlayerWindowStatus('blocked');
    }
  }, []);

  const closePlayerWindow = useCallback(() => {
    const handle = playerWindowRef.current as Window | null;
    if (handle && !handle.closed) handle.close();
    playerWindowRef.current = null;
    setPlayerWindowStatus('closed');
  }, []);

  const stopPlayerWindow = useCallback(() => {
    const handle = playerWindowRef.current as Window | null;
    if (handle && !handle.closed) handle.postMessage({ type: 'africa-live-stop-player' }, window.location.origin);
  }, []);

  const openInlinePlayer = useCallback(() => {
    stopPlayerWindow();
    setAnchoredChannel(null);
    setIsInlinePlayerOpen(true);
  }, [stopPlayerWindow]);

  const handleSelectChannel = useCallback((channel: Channel) => {
    setSelectedChannel(channel);
    if (anchoredEnabled) closePlayerWindow();
    else stopPlayerWindow();
    setIsInlinePlayerOpen(canPlay && !anchoredEnabled);
    setAnchoredChannel(canPlay && anchoredEnabled ? channel : null);
  }, [canPlay, anchoredEnabled, closePlayerWindow, stopPlayerWindow]);

  useEffect(() => {
    if (playerWindowStatus !== 'open') return;
    const interval = window.setInterval(() => {
      if (playerWindowRef.current?.closed) {
        playerWindowRef.current = null;
        setPlayerWindowStatus('closed');
      }
    }, 750);
    return () => window.clearInterval(interval);
  }, [playerWindowStatus]);

  const selectedChannelLabel = selectedChannel?.name || '';

  const compactSelectedChannelLabel = useMemo(() => {
    if (selectedChannelLabel.length <= 28) return selectedChannelLabel;
    return `${selectedChannelLabel.slice(0, 25)}...`;
  }, [selectedChannelLabel]);

  const dismissVlcNotice = useCallback(() => {
    window.localStorage.setItem(VLC_NOTICE_STORAGE_KEY, 'true');
    window.dispatchEvent(new Event(VLC_NOTICE_CHANGE_EVENT));
  }, []);

  return (
    <main className="relative min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-yellow-400/25 selection:text-yellow-100">
      {/* Brand transparent background watermark */}
      <BrandWatermark />

      <a
        href="#catalogue"
        className="sr-only z-[100] rounded-lg bg-yellow-300 px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au catalogue
      </a>
      <h1 className="sr-only">Catalogue Africa Live</h1>
      {/* Entête */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-black/50 px-4 py-2.5 shadow-2xl backdrop-blur-2xl sm:px-6 sm:py-3">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-tricolor-bar opacity-80" />
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <AppBrand />
          <AppNavigation country={baseFilters.country} />

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Filter Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              aria-label="Ouvrir les filtres"
              className="lg:hidden flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-zinc-200 shadow-sm transition hover:border-amber-400/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Filter className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <LocalAccountControls />

            <div role="group" aria-label="Mode d’affichage" className="flex items-center gap-0.5 bg-white/[0.03] border border-white/10 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Afficher en grille"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${viewMode === 'grid' ? 'bg-white/15 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <LayoutGrid aria-hidden="true" className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Afficher en liste"
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${viewMode === 'list' ? 'bg-white/15 text-amber-300' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                <List aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <div aria-live="polite" className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-zinc-400">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {channels.length} chaînes visibles
            </div>
          </div>
        </div>
      </header>

      {showVlcNotice && (
        <section className="relative z-10 border-b border-white/[0.06] bg-black/40 px-4 py-2.5 sm:py-3 md:px-6 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-amber-400/20 bg-black/40 px-4 py-3 shadow-xl backdrop-blur-xl">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/25">
                <MonitorPlay aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-zinc-100">
                    Certains flux fonctionnent mieux dans VLC
                  </p>
                <p className="mt-0.5 hidden text-xs leading-5 text-zinc-400 sm:block">
                    Africa Live privilégie le lecteur web et vous propose VLC lorsqu&apos;un format le nécessite.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2">
              <a
                href={VLC_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:border-amber-400/50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <span>Obtenir VLC</span>
                <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
              <button
                type="button"
                onClick={dismissVlcNotice}
                title="Masquer"
                aria-label="Masquer le rappel VLC"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Contenu principal */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Colonne Filtres (1/4 de largeur sur grand écran, drawer sur mobile) */}
        <div className="lg:col-span-1">
          <FilterSidebar
            filters={baseFilters}
            onReset={resetFilters}
            onFilterChange={handleFilterChange}
            showFavoritesOnly={showFavoritesOnly}
            setShowFavoritesOnly={handleShowFavoritesOnlyChange}
            isOpenMobile={isMobileFiltersOpen}
            onCloseMobile={closeMobileFilters}
          />
        </div>

        {/* Section Lecteur + Grille (3/4 de largeur) */}
        <div className={`min-w-0 lg:col-span-3 ${anchoredEnabled && canPlay ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] items-start' : 'flex flex-col'} gap-4 sm:gap-6`}>

          {/* Quick Category Filter Tabs */}
          <div className="xl:col-span-2"><CategoryTabs
            activePresetId={activePresetId}
            onSelectPreset={handleSelectCategoryPreset}
            favoritesCount={favorites.length}
          /></div>

          {/* Contrôleur du lecteur séparé */}
          <section aria-label="Lecteur" className="relative xl:col-span-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/40 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
            {ANCHORED_PLAYER_AVAILABLE && (
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
                <button type="button" aria-pressed={anchoredEnabled} disabled={!canPlay || (!anchoredEnabled && !externalStopped)}
                  className="rounded-lg border border-amber-400/40 px-3 py-2 focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-40"
                  onClick={() => {
                    closePlayerWindow();
                    setIsInlinePlayerOpen(false);
                    setAnchoredChannel(null);
                    setAnchoredEnabled(!anchoredEnabled);
                  }}>{anchoredEnabled ? 'Désactiver le lecteur ancré' : 'Activer le lecteur ancré'}</button>
                {!anchoredEnabled && <label className="flex items-center gap-2">
                  <input type="checkbox" checked={externalStopped} onChange={event => setExternalStopped(event.target.checked)} />
                  VLC et mes autres lecteurs sont arrêtés
                </label>}
              </div>
            )}
            <div className="h-[2px] w-full bg-tricolor-bar absolute top-0 left-0 right-0 opacity-80" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-lg shadow-black/40">
                  <MonitorPlay aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
                    {selectedChannel ? selectedChannel.name : 'Prêt pour le direct'}
                    {selectedChannel && (
                      <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </h2>
                  <p aria-live="polite" className="mt-0.5 line-clamp-2 text-xs leading-5 text-zinc-400 sm:mt-1 sm:text-sm">
                    {selectedChannel
                      ? 'La chaîne est sélectionnée. Lancez-la ici ou dans une fenêtre séparée.'
                      : 'Choisissez une chaîne ci-dessous. Le lecteur web sera essayé en priorité, avec VLC en solution de repli.'}
                  </p>
                </div>
              </div>
              {selectedChannel && canPlay && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={openInlinePlayer}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-emerald-500/15 via-amber-400/20 to-rose-500/15 hover:from-emerald-500/25 hover:via-amber-400/30 hover:to-rose-500/25 px-3.5 py-2 text-xs sm:text-sm font-bold text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 shadow-sm backdrop-blur-sm"
                  >
                    <Play aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
                    <span>Lecture directe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPlayerForChannel(selectedChannel)}
                    title="Ouvrir dans une fenêtre pop-up séparée"
                    aria-label="Ouvrir dans une fenêtre pop-up séparée"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 px-3.5 py-2 text-xs sm:text-sm font-semibold text-zinc-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  >
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="hidden sm:inline">Fenêtre séparée</span>
                  </button>
                </div>
              )}
              {selectedChannel && !canPlay && (
                <Link href="/pricing" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2 text-xs font-bold text-amber-100 hover:bg-amber-400/20">
                  Abonnement requis pour lire
                </Link>
              )}
            </div>
            {playerWindowStatus === 'blocked' && selectedChannel && (
              <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-black/60 p-4 text-xs sm:text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <span>Le navigateur a bloqué la fenêtre pop-up. Autorisez les popups pour Africa Live, puis réessayez.</span>
                <button
                  type="button"
                  onClick={() => openPlayerForChannel(selectedChannel)}
                  className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  Réessayer
                </button>
              </div>
            )}
          </section>

          {anchoredEnabled && canPlay && <div className="min-w-0 xl:col-start-2 xl:row-start-3 xl:sticky xl:top-24">
            <AnchoredPlayer channel={anchoredChannel} channels={channels} onSelect={handleSelectChannel}
              onStop={() => setAnchoredChannel(null)} onExternalHandoff={() => {
                setAnchoredChannel(null);
                setAnchoredEnabled(false);
                setExternalStopped(false);
                openInlinePlayer();
              }} />
          </div>}

          {/* Grille de Chaînes */}
          <section id="catalogue" aria-labelledby="catalog-title" tabIndex={-1} className="min-w-0 xl:col-start-1 xl:row-start-3 flex scroll-mt-28 flex-col gap-4 focus:outline-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="catalog-title" className="flex items-center gap-2 text-base sm:text-lg font-bold text-zinc-100">
                  <LayoutList aria-hidden="true" className="h-5 w-5 text-amber-400" />
                  {showFavoritesOnly ? 'Mes favoris' : 'Chaînes en direct'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Les chaînes actuellement signalées comme indisponibles sont masquées.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400 font-mono bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
                  {channels.length} chaînes visibles
                </span>
              </div>
            </div>

            {favoriteError && (
              <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-black/60 p-4 text-xs sm:text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {favoriteError}
                </span>
                <button
                  type="button"
                  onClick={() => void synchronizeFavorites()}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <RefreshCw aria-hidden="true" className="h-3 w-3" />
                  Réessayer
                </button>
              </div>
            )}

            {catalogError && (
              <div role="alert" className="flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-black/60 p-8 text-center text-red-100">
                <AlertCircle aria-hidden="true" className="mb-3 h-8 w-8 text-red-400" />
                <p className="font-bold text-sm">Le catalogue n’a pas pu être chargé.</p>
                <p className="mt-1 max-w-xl text-xs text-red-200/80">{catalogError}</p>
                <button
                  type="button"
                  onClick={retryCatalog}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Réessayer
                </button>
              </div>
            )}

            {(!catalogError || channels.length > 0) && (
              <ChannelGrid
                compact={anchoredEnabled && canPlay}
                channels={channels}
                selectedChannelId={selectedChannel?.id || null}
                onSelectChannel={handleSelectChannel}
                loading={loading}
                hasMore={Boolean(nextCursor)}
                onLoadMore={handleLoadMore}
                viewMode={viewMode}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
              />
            )}
          </section>
        </div>
      </div>

      {/* Floating Action Button for Quick Player Re-Open */}
      {selectedChannel && canPlay && !anchoredEnabled && (
        <button
          type="button"
          onClick={openInlinePlayer}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/80 px-3.5 py-2 text-xs sm:text-sm font-bold text-amber-300 shadow-2xl backdrop-blur-xl transition hover:border-amber-400 hover:bg-black/95 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:bottom-8 sm:right-8"
          title={`Regarder : ${selectedChannelLabel}`}
          aria-label={`Regarder : ${selectedChannelLabel}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
          </span>
          <MonitorPlay aria-hidden="true" className="h-4 w-4" />
          <span>Lecteur</span>
          <span className="hidden max-w-36 truncate text-zinc-400 sm:inline font-normal">
            {compactSelectedChannelLabel}
          </span>
        </button>
      )}

      {/* Inline Video Player Modal Overlay */}
      {canPlay && isInlinePlayerOpen && <InlinePlayerModal
        channel={selectedChannel}
        isOpen={canPlay && isInlinePlayerOpen}
        onClose={() => setIsInlinePlayerOpen(false)}
        onOpenPopoutWindow={() => {
          if (selectedChannel) openPlayerForChannel(selectedChannel);
        }}
      />}
    </main>
  );
}
