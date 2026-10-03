'use client';

import {
  Keyboard,
  Maximize,
  Minimize,
  PictureInPicture2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';

export type PlayerControlsProps = {
  /** Mini-lecteur : lecture, son et image dans l'image seulement. */
  compact?: boolean;
  visible: boolean;
  paused: boolean;
  muted: boolean;
  volume: number;
  fullscreen: boolean;
  pipAvailable: boolean;
  helpOpen: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onToggleHelp: () => void;
  /** Présents seulement quand une liste de chaînes est connue (modale, page de lecteur). */
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
};

const BUTTON =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold disabled:pointer-events-none disabled:opacity-35';

const SHORTCUTS: Array<[string, string]> = [
  ['Espace · K', 'Lecture / pause'],
  ['M', 'Couper / rétablir le son'],
  ['F', 'Plein écran'],
  ['P', 'Image dans l’image'],
  ['← →', 'Chaîne précédente / suivante'],
  ['?', 'Afficher cette aide'],
];

/** Commandes maison du lecteur : lecture, son, plein écran, image dans l'image, chaîne précédente / suivante, aide. */
export default function PlayerControls(props: PlayerControlsProps) {
  const helpId = useId();
  const { paused, muted, volume, fullscreen, helpOpen } = props;
  return (
    <>
      {helpOpen && (
        <div
          id={helpId}
          role="region"
          aria-label="Raccourcis clavier"
          className="absolute bottom-16 right-3 z-30 w-72 max-w-[calc(100%-1.5rem)] rounded-card border border-line-gold bg-surface-1/95 p-4 text-xs shadow-2xl"
        >
          <p className="mb-2 font-display text-sm font-bold text-text">Raccourcis</p>
          <dl className="space-y-1.5">
            {SHORTCUTS.filter(([keys]) => props.onPrevious || keys !== '← →').map(([keys, label]) => (
              <div key={keys} className="flex items-center justify-between gap-3">
                <dt><kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-text">{keys}</kbd></dt>
                <dd className="text-text-muted">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div
        role="toolbar"
        aria-label="Commandes du lecteur"
        className={`absolute inset-x-0 bottom-0 z-20 flex items-center gap-0.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2 pb-1.5 pt-10 transition-opacity duration-200 focus-within:pointer-events-auto focus-within:opacity-100 ${
          props.visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {props.onPrevious && !props.compact && (
          <button type="button" onClick={props.onPrevious} disabled={!props.hasPrevious} aria-label="Chaîne précédente" className={BUTTON}>
            <SkipBack className="size-5" aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={props.onTogglePlay} aria-label={paused ? 'Lecture' : 'Pause'} className={BUTTON}>
          {paused ? <Play className="size-5 fill-current" aria-hidden="true" /> : <Pause className="size-5 fill-current" aria-hidden="true" />}
        </button>
        {props.onNext && !props.compact && (
          <button type="button" onClick={props.onNext} disabled={!props.hasNext} aria-label="Chaîne suivante" className={BUTTON}>
            <SkipForward className="size-5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={props.onToggleMute}
          aria-label={muted ? 'Rétablir le son' : 'Couper le son'}
          aria-pressed={muted}
          className={BUTTON}
        >
          {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          onChange={event => props.onVolumeChange(Number(event.target.value))}
          aria-label="Volume"
          className={`mx-1 hidden h-11 w-24 accent-al-yellow ${props.compact ? '' : 'sm:block'}`}
        />
        <span className="flex-1" />
        {!props.compact && <button
          type="button"
          onClick={props.onToggleHelp}
          aria-label="Raccourcis clavier"
          aria-expanded={helpOpen}
          aria-controls={helpOpen ? helpId : undefined}
          className={`${BUTTON} max-sm:hidden`}
        >
          <Keyboard className="size-5" aria-hidden="true" />
        </button>}
        {props.pipAvailable && (
          <button type="button" onClick={props.onTogglePip} aria-label="Image dans l’image" className={BUTTON}>
            <PictureInPicture2 className="size-5" aria-hidden="true" />
          </button>
        )}
        {!props.compact && <button
          type="button"
          onClick={props.onToggleFullscreen}
          aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          className={BUTTON}
        >
          {fullscreen ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
        </button>}
      </div>
    </>
  );
}

/** Les commandes s'effacent après 3 s d'inactivité pendant la lecture ; un geste, le survol ou le focus les rappellent. */
export function useIdleVisibility(containerRef: RefObject<HTMLElement | null>, keepVisible: boolean) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const wake = () => {
      setIdle(false);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setIdle(true), 3_000);
    };
    const events = ['pointermove', 'pointerdown', 'focusin', 'keydown'] as const;
    for (const name of events) element.addEventListener(name, wake);
    return () => {
      for (const name of events) element.removeEventListener(name, wake);
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, [containerRef]);

  return keepVisible || !idle;
}

export type ShortcutHandlers = {
  enabled: boolean;
  helpOpen: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onToggleHelp: () => void;
  onCloseHelp: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
};

function isEditable(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element?.tagName) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

/** Raccourcis du lecteur. Ils laissent les champs de saisie, les curseurs et les boutons focalisés faire leur travail. */
export function usePlayerShortcuts(handlers: ShortcutHandlers) {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const h = ref.current;
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (event.key === 'Escape') {
        if (!h.enabled || !h.helpOpen) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        h.onCloseHelp();
        return;
      }
      if (isEditable(target)) return;
      const onRange = target?.tagName === 'INPUT';
      const onActivatable = Boolean(target?.closest('button, a[href], summary, [role="button"], [role="switch"]'));
      // Le zapping change de chaîne : il reste actif même quand la chaîne courante se lit dans VLC ou charge encore.
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const go = event.key === 'ArrowLeft' ? h.onPrevious : h.onNext;
        if (onRange || !go) return;
        event.preventDefault();
        go();
        return;
      }
      if (!h.enabled) return;
      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          if (event.key === ' ' && onActivatable) return;
          event.preventDefault();
          h.onTogglePlay();
          break;
        case 'm': case 'M': event.preventDefault(); h.onToggleMute(); break;
        case 'f': case 'F': event.preventDefault(); h.onToggleFullscreen(); break;
        case 'p': case 'P': event.preventDefault(); h.onTogglePip(); break;
        case '?': event.preventDefault(); h.onToggleHelp(); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
