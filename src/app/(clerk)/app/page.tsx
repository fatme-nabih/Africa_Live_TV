'use client';

import dynamic from 'next/dynamic';
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import PageTransition from '@/components/shell/PageTransition';
import { useCatalogFilters } from '@/components/useCatalogFilters';
import BrandBackdrop from '@/components/brand/BrandBackdrop';
import { Button, ButtonLink, ErrorState } from '@/components/ui';
import FilterSidebar from '@/components/FilterSidebar';
import CatalogSearchField from '@/components/tv/CatalogSearchField';
import ChannelGrid from '@/components/ChannelGrid';
import CategoryTabs from '@/components/CategoryTabs';
import ActiveFilterChips from '@/components/tv/ActiveFilterChips';
import HelpLine from '@/components/tv/HelpLine';
import TvRows from '@/components/tv/TvRows';
import { recordRecentChannel } from '@/components/tv/hooks';
import { usePlayerDock } from '@/components/player/PlayerDock';
import { TV_WALL_ENABLED } from '@/lib/tv-wall';
import {
  type CatalogRequest,
} from '@/lib/api-contracts';
import {useCatalog} from '@/components/tv/useCatalog';
import { useFavorites } from '@/components/tv/useFavorites';
import { launchPlayer, type PlayerWindowHandle } from '@/lib/player-window';
import { FOCUS_SEARCH_EVENT } from '@/lib/shell-nav';
import { isCatalogHome } from '@/lib/tv-rows';
import { saveZapList } from '@/lib/zap-list';
import { migrateLegacyStorageOnce, STORAGE_KEYS, VLC_NOTICE_CHANGE_EVENT } from '@/lib/storage-keys';
import { localJsonStorage } from '@/lib/safe-storage';
import type { Channel } from '@/types/channel';
import { AlertCircle, ExternalLink, Filter, LayoutGrid, LayoutList, List, MonitorPlay, Play, RefreshCw } from 'lucide-react';

// Prototype L5 (développement seulement) : chargé à la demande, pour que le lecteur et hls.js restent hors du premier chargement de la TV.
const AnchoredPlayer = dynamic(() => import('@/components/AnchoredPlayer'), { ssr: false });


const VLC_NOTICE_STORAGE_KEY = STORAGE_KEYS.vlcNoticeDismissed;
// Excluded from every production build, including Railway staging.
const ANCHORED_PLAYER_AVAILABLE = process.env.NODE_ENV === 'development';

function readVlcNoticeDismissed() {
  if (typeof window === 'undefined') return false;
  migrateLegacyStorageOnce();
  return localJsonStorage.readJson(VLC_NOTICE_STORAGE_KEY,value => typeof value === 'boolean' ? value : null,false).value;
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
  const { favorites, favoriteError, favoritesRevision, toggleFavorite, synchronizeFavorites } = useFavorites();
  const playerWindowRef = useRef<PlayerWindowHandle | null>(null);
  // Liste d'où vient la sélection (grille ou rangée) : le zapping avance dans cette liste.
  const [playlist, setPlaylist] = useState<Channel[] | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  // Lecteur unique de l'espace /app (UX-501) : il continue si l'on passe au Radar.
  const dock = usePlayerDock();
  const [anchoredEnabled, setAnchoredEnabled] = useState(false);
  const [anchoredChannel, setAnchoredChannel] = useState<Channel | null>(null);
  const [externalStopped, setExternalStopped] = useState(false);
  const [playerWindowStatus, setPlayerWindowStatus] = useState<'idle' | 'open' | 'blocked' | 'closed'>('idle');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const showVlcNotice = useSyncExternalStore(
    subscribeToVlcNotice,
    getVlcNoticeSnapshot,
    getServerVlcNoticeSnapshot,
  );

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const closeMobileFilters = useCallback(() => setIsMobileFiltersOpen(false), []);
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
      // Le champ est dans la barre d'outils ; il peut n'exister qu'après hydratation : on réessaie quelques images.
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
    window.addEventListener(FOCUS_SEARCH_EVENT, focusSearch);
    const url = new URL(window.location.href);
    if (url.searchParams.get('focus') === 'search') {
      url.searchParams.delete('focus');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      queueMicrotask(focusSearch);
    }
    return () => {
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

  const {channels,canPlay,loading,nextCursor,catalogError,handleLoadMore,retryCatalog}=useCatalog(catalogRequest,favoritesRevision);

  const openPlayerForChannel = useCallback((channel: Channel) => {
    setAnchoredChannel(null);
    setSelectedChannel(channel);
    try { saveZapList(playlist ?? channels, window.localStorage); } catch { /* keep the window action usable */ }
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
      dock.close();
      playerWindowRef.current = result.handle;
      setPlayerWindowStatus('open');
    } else if (result.mode === 'blocked') {
      playerWindowRef.current = null;
      setPlayerWindowStatus('blocked');
    }
    if (result.mode === 'same-tab') dock.close();
    return result;
  }, [channels, playlist, dock]);

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
    if (!selectedChannel) return;
    stopPlayerWindow();
    setAnchoredChannel(null);
    dock.open({ channel: selectedChannel, playlist: playlist ?? channels, onZap: setSelectedChannel, onPopout: openPlayerForChannel });
  }, [stopPlayerWindow, selectedChannel, playlist, channels, dock, openPlayerForChannel]);

  const handleSelectChannel = useCallback((channel: Channel, list?: Channel[]) => {
    setPlaylist(list ?? null);
    setSelectedChannel(channel);
    if (anchoredEnabled) closePlayerWindow();
    else stopPlayerWindow();
    if (canPlay && !anchoredEnabled) {
      dock.open({ channel, playlist: list ?? channels, onZap: setSelectedChannel, onPopout: openPlayerForChannel });
    } else {
      dock.close();
    }
    setAnchoredChannel(canPlay && anchoredEnabled ? channel : null);
  }, [canPlay, anchoredEnabled, closePlayerWindow, stopPlayerWindow, dock, channels, openPlayerForChannel]);

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
    localJsonStorage.writeJson(VLC_NOTICE_STORAGE_KEY, true);
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
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3.5 text-xs font-semibold text-text transition hover:border-line-gold"
          >
            <Filter className="h-3.5 w-3.5 text-al-gold" aria-hidden="true" />
            <span className="hidden min-[360px]:inline">Filtres</span>
            {activeFiltersCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-al-yellow px-1 text-xs font-black text-black">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <CatalogSearchField value={baseFilters.search} onChange={search => handleFilterChange({ ...baseFilters, search })} />

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <div aria-live="polite" className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-muted xl:flex">
              <span aria-hidden="true" className="live-dot"></span>
              {channels.length} chaînes visibles
            </div>

            {/* Enveloppe : `hidden` posé sur le bouton perdait contre son `inline-flex` (lien visible à 360 px). Mur réservé au desktop. */}
            {TV_WALL_ENABLED && (
              <span className="hidden xl:block">
                <ButtonLink href="/app/mur" variant="ghost" size="sm" icon={<LayoutGrid aria-hidden="true" className="size-4 text-al-gold" />}>
                  Mur TV
                </ButtonLink>
              </span>
            )}
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
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col gap-4 sm:gap-6">

        {/* Filtres : un seul tiroir à toutes les largeurs (UX-209), ouvert par le bouton « Filtres » */}
        <div>
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
        <div className={`min-w-0 ${anchoredEnabled && canPlay ? 'grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] items-start' : 'flex flex-col'} gap-4 sm:gap-6`}>

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
                <div className={`flex flex-wrap items-center gap-2 rounded-control border border-dashed border-line px-3 py-2 ${selectedChannel ? 'mb-3' : ''}`}>
                  {/* Prototype local L5 (développement seulement) : habillé avec le design system, comportement inchangé (UX-213). */}
                  <span className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Prototype</span>
                  <Button variant="secondary" size="sm" aria-pressed={anchoredEnabled} disabled={!canPlay || (!anchoredEnabled && !externalStopped)}
                    icon={<MonitorPlay aria-hidden="true" className="size-3.5 text-al-gold" />}
                    onClick={() => {
                      closePlayerWindow();
                      dock.close();
                      setAnchoredChannel(null);
                      setAnchoredEnabled(!anchoredEnabled);
                    }}>{anchoredEnabled ? 'Désactiver le lecteur ancré' : 'Activer le lecteur ancré'}</Button>
                  {!anchoredEnabled && <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line bg-surface-2 px-3 text-xs font-semibold text-text has-[:checked]:border-al-green/60 has-[:checked]:text-al-green">
                    <input type="checkbox" className="size-4 accent-al-green" checked={externalStopped} onChange={event => setExternalStopped(event.target.checked)} />
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
      {selectedChannel && canPlay && !anchoredEnabled && !dock.channel && (
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

    </main>
    </PageTransition>
  );
}
