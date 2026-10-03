'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ExternalLink, Globe, Maximize2, Minimize2, Tv, X } from 'lucide-react';
import { recordRecentChannel } from '@/components/tv/hooks';
import { ShareChannelLink } from '@/components/tv/ChannelTile';
import { categoryLabels } from '@/lib/catalog-metadata';
import { formatCountryName } from '@/lib/format';
import { launchPlayer } from '@/lib/player-window';
import { saveZapList, zapNeighbors } from '@/lib/zap-list';
import type { Channel } from '@/types/channel';

// hls.js et le lecteur ne sont chargés qu'à la première lecture (ni le Radar ni la TV ne les embarquent d'emblée).
const Player = dynamic(() => import('@/components/Player'), { ssr: false });

export type DockRequest = {
  channel: Channel;
  /** Chaînes parmi lesquelles zapper (la liste d'où vient la sélection). */
  playlist?: readonly Channel[];
  /** La page d'origine suit la chaîne courante (sélection, mise en avant). Oublié dès qu'on change de page. */
  onZap?: (channel: Channel) => void;
  /** Fenêtre séparée gérée par la page d'origine ; à défaut, ouverture générique. Oublié dès qu'on change de page. */
  onPopout?: (channel: Channel) => void;
};

type DockView = 'expanded' | 'mini';
type DockState = (DockRequest & { view: DockView; zapped: boolean }) | null;

type DockApi = {
  channel: Channel | null;
  view: DockView | null;
  open: (request: DockRequest) => void;
  close: () => void;
  expand: () => void;
  minimize: () => void;
};

const DockContext = createContext<DockApi | null>(null);

export function usePlayerDock(): DockApi {
  const api = useContext(DockContext);
  if (!api) throw new Error('usePlayerDock doit être utilisé sous PlayerDockProvider (layout /app).');
  return api;
}

/**
 * Lecteur unique de l'espace /app (UX-501) : une seule source active, qui survit au passage Radar ↔ TV.
 * Le même composant <Player> passe de la fenêtre plein écran au mini-lecteur sans être remonté : le flux continue.
 */
export function PlayerDockProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DockState>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Changement de page : le lecteur se range en mini-lecteur et oublie les rappels de la page quittée.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (state) setState({ ...state, view: 'mini', onZap: undefined, onPopout: undefined });
  }

  const open = useCallback((request: DockRequest) => setState({ ...request, view: 'expanded', zapped: false }), []);
  const close = useCallback(() => setState(null), []);
  const expand = useCallback(() => setState(current => current && { ...current, view: 'expanded' }), []);
  const minimize = useCallback(() => setState(current => current && { ...current, view: 'mini' }), []);

  const api = useMemo<DockApi>(() => ({
    channel: state?.channel ?? null, view: state?.view ?? null, open, close, expand, minimize,
  }), [state?.channel, state?.view, open, close, expand, minimize]);

  return (
    <DockContext.Provider value={api}>
      {children}
      {state && <PlayerDockFrame state={state} setState={setState} onClose={close} onExpand={expand} onMinimize={minimize} />}
    </DockContext.Provider>
  );
}

function PlayerDockFrame({
  state,
  setState,
  onClose,
  onExpand,
  onMinimize,
}: {
  state: NonNullable<DockState>;
  setState: (updater: (current: DockState) => DockState) => void;
  onClose: () => void;
  onExpand: () => void;
  onMinimize: () => void;
}) {
  const { channel, playlist, view } = state;
  const expanded = view === 'expanded';
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const zapTo = useCallback((target: Channel) => {
    setState(current => current && { ...current, channel: target, zapped: true });
    state.onZap?.(target);
  }, [setState, state]);

  const popout = useCallback(() => {
    if (state.onPopout) {
      state.onPopout(channel);
    } else {
      if (playlist) saveZapList([...playlist], window.localStorage);
      recordRecentChannel(channel);
      launchPlayer({
        channelId: channel.id,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
        openWindow: (url, target, features) => window.open(url, target, features),
        navigateCurrentTab: (url) => window.location.assign(url),
      });
    }
    onClose();
  }, [channel, playlist, state, onClose]);

  // Fenêtre plein écran seulement : Échap ferme, la page ne défile pas, le focus reste dans la fenêtre.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded, onClose]);

  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], video[controls], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length > 0);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', keepFocusInside);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keepFocusInside);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [expanded]);

  const neighbors = playlist ? zapNeighbors([...playlist], channel.id) : null;
  const zapping = neighbors
    ? { previous: neighbors.previous ? () => zapTo(neighbors.previous!) : null, next: neighbors.next ? () => zapTo(neighbors.next!) : null }
    : undefined;
  const iconButton = 'inline-flex size-9 shrink-0 items-center justify-center rounded-control border border-line bg-surface-2 text-text-muted transition-colors hover:border-line-gold hover:text-text';

  // Structure identique dans les deux vues (seules les classes changent) : <Player> n'est jamais remonté.
  return (
    <div
      className={expanded
        ? 'fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-6 md:p-10'
        : 'fixed right-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 w-[min(20rem,calc(100vw-1.5rem))] md:right-5 md:bottom-5'}
    >
      {expanded ? (
        <div onClick={onClose} className="dock-fade absolute inset-0 bg-black/90" aria-hidden="true" />
      ) : null}
      <div
        ref={dialogRef}
        role={expanded ? 'dialog' : 'region'}
        aria-modal={expanded ? true : undefined}
        aria-labelledby={expanded ? 'inline-player-title' : undefined}
        aria-describedby={expanded ? 'inline-player-description' : undefined}
        aria-label={expanded ? undefined : 'Mini-lecteur'}
        className={expanded
          ? 'dock-rise relative z-10 flex h-full w-full max-w-5xl flex-col justify-between overflow-hidden border-0 border-line bg-black/85 shadow-2xl sm:h-auto sm:justify-start sm:rounded-3xl sm:border'
          : 'dock-rise relative flex w-full flex-col overflow-hidden rounded-card border border-line-gold bg-surface-1 shadow-2xl shadow-black/60'}
      >
        <div className={`relative flex shrink-0 items-center justify-between gap-2 border-b border-line ${expanded ? 'bg-black/50 px-4 py-3 sm:px-5 sm:py-3.5' : 'px-2.5 py-2'}`}>
          <div className="bg-tricolor-bar absolute top-0 right-0 left-0 h-0.5 opacity-80" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-3">
            {expanded ? (
              <span className="hidden size-10 shrink-0 items-center justify-center rounded-control border border-line-gold bg-al-gold/10 text-al-gold sm:flex">
                <Tv className="size-5" aria-hidden="true" />
              </span>
            ) : (
              <span className="live-dot shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h2 id="inline-player-title" className={`truncate font-bold text-text ${expanded ? 'text-sm sm:text-base' : 'text-sm'}`}>
                {channel.name}
              </h2>
              {expanded && (
                <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                  <Globe className="size-3 shrink-0" aria-hidden="true" />
                  {formatCountryName(channel.countryCode)}
                  {channel.groupTitle && <span className="truncate text-al-gold"> · {categoryLabels(channel.groupTitle)}</span>}
                </p>
              )}
              <p id="inline-player-description" className="sr-only">
                Lecteur direct de la chaîne sélectionnée. Réduisez-le pour continuer à naviguer ; Échap ferme la fenêtre.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {expanded && <ShareChannelLink channel={channel} className={iconButton} />}
            {expanded && (
              <button type="button" onClick={popout} aria-label="Ouvrir dans une fenêtre séparée" title="Ouvrir dans une fenêtre séparée"
                className="hidden items-center gap-1.5 rounded-control border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-line-gold sm:inline-flex">
                <ExternalLink className="size-3.5 text-al-gold" aria-hidden="true" />
                Fenêtre séparée
              </button>
            )}
            <button type="button" onClick={expanded ? onMinimize : onExpand}
              aria-label={expanded ? 'Réduire le lecteur' : 'Agrandir le lecteur'}
              title={expanded ? 'Réduire : la lecture continue pendant la navigation' : 'Agrandir le lecteur'}
              className={iconButton}>
              {expanded ? <Minimize2 className="size-4" aria-hidden="true" /> : <Maximize2 className="size-4" aria-hidden="true" />}
            </button>
            <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Fermer le lecteur" title="Fermer le lecteur" className={iconButton}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={expanded ? 'flex flex-1 flex-col justify-center bg-black/60 p-2 sm:p-5' : 'bg-black'}>
          <Player
            key={channel.id}
            channelId={channel.id}
            channelName={channel.name}
            zapping={expanded ? zapping : undefined}
            manualExternal={state.zapped}
            compact={!expanded}
            onPlaybackStarted={() => recordRecentChannel(channel)}
          />
        </div>
      </div>
    </div>
  );
}
