'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import PageTransition from '@/components/shell/PageTransition';
import { useCatalogFilters } from '@/components/useCatalogFilters';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import { Button, ButtonLink, ErrorState } from '@/components/ui';
import FilterSidebar from '@/components/FilterSidebar';
import ChannelGrid from '@/components/ChannelGrid';
import CategoryTabs from '@/components/CategoryTabs';
import ActiveFilterChips from '@/components/tv/ActiveFilterChips';
import HelpLine from '@/components/tv/HelpLine';
import TvRows from '@/components/tv/TvRows';
import { recordRecentChannel } from '@/components/tv/hooks';
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
import { FOCUS_SEARCH_EVENT } from '@/lib/shell-nav';
import { isCatalogHome } from '@/lib/tv-rows';
import { saveZapList } from '@/lib/zap-list';
import { migrateLegacyStorageOnce, STORAGE_KEYS, VLC_NOTICE_CHANGE_EVENT } from '@/lib/storage-keys';
import type { Channel } from '@/types/channel';
import { AlertCircle, ExternalLink, Filter, LayoutGrid, LayoutList, List, MonitorPlay, Play, RefreshCw } from 'lucide-react';


const VLC_NOTICE_STORAGE_KEY = STORAGE_KEYS.vlcNoticeDismissed;
const FAVORITES_STORAGE_KEY = STORAGE_KEYS.favorites;
const FAVORITES_PENDING_KEY = STORAGE_KEYS.favoritesPending;
const FAVORITES_MIGRATED_KEY = STORAGE_KEYS.favoritesMigrated;
// Excluded from every production build, including Railway staging.
const ANCHORED_PLAYER_AVAILABLE = process.env.NODE_ENV === 'development';

function readStoredFavorites() {
  if (typeof window === 'undefined') return [];
  migrateLegacyStorageOnce();

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
  migrateLegacyStorageOnce();
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
  migrateLegacyStorageOnce();
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
  // Liste d'où vient la sélection (grille ou rangée) : le zapping avance dans cette liste.
  const [playlist, setPlaylist] = useState<Channel[] | null>(null);
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

  // Recherche : raccourci Ctrl/Cmd+K, bouton « Rechercher » de la barre (événement) ou lien ?focus=search
  useEffect(() => {
    const focusSearch = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) setIsMobileFiltersOpen(true);
      // Le champ peut n'exister qu'après l'ouverture du tiroir mobile : on réessaie quelques images.
      let attempts = 0;
      const tryFocus = () => {
        const input = document.getElementById('catalog-search') as HTMLInputElement | null;
        if (input) {
          input.focus(); input.select();
          if (document.activeElement === input) {
            // Le tiroir mobile place le focus sur son premier contrôle à l'ouverture : on reprend la main.
            window.setTimeout(() => {
              if (document.activeElement !== input) { input.focus(); input.select(); }
            }, 150);
            return;
          }
        }
        if (++attempts < 30) window.requestAnimationFrame(tryFocus);
      };
      window.requestAnimationFrame(tryFocus);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(FOCUS_SEARCH_EVENT, focusSearch);
    const url = new URL(window.location.href);
    if (url.searchParams.get('focus') === 'search') {
      url.searchParams.delete('focus');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      queueMicrotask(focusSearch);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(FOCUS_SEARCH_EVENT, focusSearch);
    };
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
    saveZapList(playlist ?? channels, window.localStorage);
    recordRecentChannel(channel);
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
  }, [channels, playlist]);

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

  const handleSelectChannel = useCallback((channel: Channel, list?: Channel[]) => {
    setPlaylist(list ?? null);
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
    <PageTransition>
    <main className="relative flex-1 bg-black text-text flex flex-col selection:bg-al-gold/25 selection:text-text">
      {/* Brand transparent background watermark */}
      <BrandBackdrop variant="app" />

      <a
        href="#catalogue"
        className="sr-only z-[100] rounded-lg bg-al-yellow px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au catalogue
      </a>
      <h1 className="sr-only">Catalogue Africa Live</h1>
      {/* Barre d'outils de la TV : filtres (mobile), mode d'affichage, nombre de chaînes */}
      <div className="relative z-10 border-b border-line bg-black/60">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6">
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(true)}
            aria-label="Ouvrir les filtres"
            className="flex min-h-11 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3.5 text-xs font-semibold text-text transition hover:border-line-gold lg:hidden"
          >
            <Filter className="h-3.5 w-3.5 text-al-gold" aria-hidden="true" />
            <span>Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-al-yellow px-1 text-xs font-black text-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div aria-live="polite" className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-muted sm:flex">
              <span aria-hidden="true" className="live-dot"></span>
              {channels.length} chaînes visibles
            </div>

            <div role="group" aria-label="Mode d’affichage" className="flex items-center gap-0.5 rounded-control border border-line bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="Afficher en grille"
                aria-pressed={viewMode === 'grid'}
                className={`inline-flex size-10 items-center justify-center rounded-lg transition ${viewMode === 'grid' ? 'bg-surface-3 text-al-gold' : 'text-text-muted hover:text-text'}`}
              >
                <LayoutGrid aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Afficher en liste"
                aria-pressed={viewMode === 'list'}
                className={`inline-flex size-10 items-center justify-center rounded-lg transition ${viewMode === 'list' ? 'bg-surface-3 text-al-gold' : 'text-text-muted hover:text-text'}`}
              >
                <List aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showVlcNotice && <HelpLine onDismiss={dismissVlcNotice} />}

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

          {/* Filtres actifs : pastilles retirables et « Tout effacer » */}
          <div className="xl:col-span-2 empty:hidden">
            <ActiveFilterChips
              filters={baseFilters}
              favoritesOnly={showFavoritesOnly}
              onChange={(next, favorites) => handleFilterChange(next, favorites)}
              onClearAll={resetFilters}
            />
          </div>

          {/* Chaîne sélectionnée : lecture directe ou fenêtre séparée (plus d'encart « Prêt pour le direct ») */}
          {(selectedChannel || ANCHORED_PLAYER_AVAILABLE) && (
            <section aria-label="Lecteur" className={`relative xl:col-span-2 overflow-hidden ${selectedChannel ? 'rounded-card border border-line bg-surface-1 p-3 sm:p-4' : ''}`}>
              {ANCHORED_PLAYER_AVAILABLE && (
                <div className={`flex flex-wrap items-center gap-3 text-xs ${selectedChannel ? 'mb-3' : ''}`}>
                  <button type="button" aria-pressed={anchoredEnabled} disabled={!canPlay || (!anchoredEnabled && !externalStopped)}
                    className="rounded-lg border border-al-gold/40 px-3 py-2 focus-visible:ring-2 focus-visible:ring-al-gold disabled:opacity-40"
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
              {selectedChannel && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="live-dot shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-base font-bold text-text">{selectedChannel.name}</h2>
                      <p aria-live="polite" className="mt-0.5 text-xs leading-5 text-text-muted">
                        La chaîne est sélectionnée. Lancez-la ici ou dans une fenêtre séparée.
                      </p>
                    </div>
                  </div>
                  {canPlay ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="primary" size="sm" onClick={openInlinePlayer} icon={<Play aria-hidden="true" className="size-3.5 fill-current" />}>
                        Lecture directe
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openPlayerForChannel(selectedChannel)}
                        title="Ouvrir dans une fenêtre pop-up séparée"
                        aria-label="Ouvrir dans une fenêtre pop-up séparée"
                        icon={<ExternalLink aria-hidden="true" className="size-3.5 text-text-muted" />}
                      >
                        <span className="hidden sm:inline">Fenêtre séparée</span>
                      </Button>
                    </div>
                  ) : (
                    <ButtonLink href="/pricing" variant="secondary" size="sm">Abonnement requis pour lire</ButtonLink>
                  )}
                </div>
              )}
              {playerWindowStatus === 'blocked' && selectedChannel && (
                <div role="alert" className="mt-3 flex flex-col gap-3 rounded-control border border-line-gold bg-surface-2 p-3 text-xs text-text sm:flex-row sm:items-center sm:justify-between sm:text-sm">
                  <span>Le navigateur a bloqué la fenêtre pop-up. Autorisez les popups pour Africa Live, puis réessayez.</span>
                  <Button variant="secondary" size="sm" onClick={() => openPlayerForChannel(selectedChannel)}>Réessayer</Button>
                </div>
              )}
            </section>
          )}

          {anchoredEnabled && canPlay && <div className="min-w-0 xl:col-start-2 xl:row-start-3 xl:sticky xl:top-24">
            <AnchoredPlayer channel={anchoredChannel} channels={channels} onSelect={handleSelectChannel}
              onStop={() => setAnchoredChannel(null)} onExternalHandoff={() => {
                setAnchoredChannel(null);
                setAnchoredEnabled(false);
                setExternalStopped(false);
                openInlinePlayer();
              }} />
          </div>}

          {/* Accueil : rangées Reprendre · Favoris · pays · Info · Sport · Musique (mêmes requêtes que le catalogue) */}
          {isCatalogHome(baseFilters, showFavoritesOnly) && !anchoredEnabled && (
            <div className="xl:col-span-2">
              <TvRows
                selectedId={selectedChannel?.id ?? null}
                favorites={favorites}
                onSelect={handleSelectChannel}
                onToggleFavorite={toggleFavorite}
              />
            </div>
          )}

          {/* Grille de Chaînes */}
          <section id="catalogue" aria-labelledby="catalog-title" tabIndex={-1} className="min-w-0 xl:col-start-1 xl:row-start-3 flex scroll-mt-28 flex-col gap-4 focus:outline-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="catalog-title" className="flex items-center gap-2 text-base sm:text-lg font-bold text-text">
                  <LayoutList aria-hidden="true" className="h-5 w-5 text-al-gold" />
                  {showFavoritesOnly ? 'Mes favoris' : isCatalogHome(baseFilters, showFavoritesOnly) ? 'Tout le catalogue' : 'Chaînes en direct'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Les chaînes actuellement signalées comme indisponibles sont masquées.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-text-muted font-mono bg-white/[0.03] border border-line px-2.5 py-1 rounded-lg">
                  {channels.length} chaînes visibles
                </span>
              </div>
            </div>

            {favoriteError && (
              <div role="alert" className="flex flex-col gap-3 rounded-xl border border-al-gold/30 bg-black/60 p-4 text-xs sm:text-sm text-text sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-start gap-2">
                  <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  {favoriteError}
                </span>
                <button
                  type="button"
                  onClick={() => void synchronizeFavorites()}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-al-gold/40 bg-al-gold/10 px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
                >
                  <RefreshCw aria-hidden="true" className="h-3 w-3" />
                  Réessayer
                </button>
              </div>
            )}

            {catalogError && (
              <ErrorState title="Le catalogue n’a pas pu être chargé." description={catalogError} onRetry={retryCatalog} />
            )}

            {(!catalogError || channels.length > 0) && (
              <ChannelGrid
                compact={anchoredEnabled && canPlay}
                channels={channels}
                selectedChannelId={selectedChannel?.id || null}
                onSelectChannel={channel => handleSelectChannel(channel, channels)}
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
          className="fixed bottom-20 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-al-gold/35 bg-black/80 px-3.5 py-2 text-xs sm:text-sm font-bold text-al-gold shadow-2xl backdrop-blur-xl transition hover:border-al-gold hover:bg-black/95 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold sm:right-8 md:bottom-8"
          title={`Regarder : ${selectedChannelLabel}`}
          aria-label={`Regarder : ${selectedChannelLabel}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-al-yellow opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-al-yellow"></span>
          </span>
          <MonitorPlay aria-hidden="true" className="h-4 w-4" />
          <span>Lecteur</span>
          <span className="hidden max-w-36 truncate text-text-muted sm:inline font-normal">
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
        playlist={playlist ?? channels}
        onZap={setSelectedChannel}
        onPlaybackStarted={recordRecentChannel}
      />}
    </main>
    </PageTransition>
  );
}
