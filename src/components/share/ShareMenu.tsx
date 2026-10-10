'use client';

import { Check, Copy, Ellipsis, MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import type { ShareLink } from '@/lib/share-links';

const subscribeNothing = () => () => {};
const GAP = 6;
const EDGE = 8;

/** Menu de partage du téléphone (Instagram, TikTok, Telegram, SMS… selon les applications installées). */
function useNativeShare() {
  return useSyncExternalStore(subscribeNothing, () => typeof navigator.share === 'function', () => false);
}

const ITEM =
  'flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none';

/**
 * Bouton « Partager » et son menu : WhatsApp, Facebook, menu du téléphone, copie du lien.
 * Le menu s'affiche dans la couche supérieure (popover) : jamais rogné par une carte, et il reste dans le DOM
 * du composant, donc dans la fenêtre modale du lecteur quand il y est ouvert.
 */
export default function ShareMenu({
  share,
  label,
  triggerClassName,
  tabIndex,
  children,
}: {
  share: ShareLink;
  /** Nom accessible du bouton, ex. « Partager RTS 1 ». */
  label: string;
  triggerClassName: string;
  tabIndex?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const nativeShare = useNativeShare();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const menuId = useId();

  const close = useCallback((restoreFocus = false) => {
    window.clearTimeout(closeTimer.current);
    setOpen(false);
    setCopy('idle');
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  // Position sous le bouton (au-dessus s'il manque de place), toujours dans l'écran ; focus sur le premier choix.
  useLayoutEffect(() => {
    const menu = menuRef.current, trigger = triggerRef.current;
    if (!open || !menu || !trigger) return;
    try { menu.showPopover?.(); } catch { /* sans popover, la position fixe suffit */ }
    const rect = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = menu;
    const left = Math.min(Math.max(rect.right - width, EDGE), window.innerWidth - width - EDGE);
    const below = rect.bottom + GAP;
    const top = below + height <= window.innerHeight - EDGE ? below : Math.max(EDGE, rect.top - height - GAP);
    menu.style.left = `${Math.max(EDGE, left)}px`;
    menu.style.top = `${top}px`;
    // Sans défilement : le menu est dans la couche supérieure, la rangée de chaînes autour ne doit pas bouger.
    menu.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
  }, [open]);

  // Clic ailleurs, ou bouton déplacé par un défilement/redimensionnement : le menu se ferme (il ne suivrait plus le bouton).
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const start = triggerRef.current?.getBoundingClientRect();
    const dismiss = () => {
      const now = triggerRef.current?.getBoundingClientRect();
      if (!start || !now || Math.abs(now.top - start.top) > 1 || Math.abs(now.left - start.left) > 1) close();
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open, close]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    // Les flèches restent dans le menu : elles ne déplacent pas le focus de la grille de chaînes autour.
    const focus = (next: number) => { event.preventDefault(); event.stopPropagation(); items[(next + items.length) % items.length]?.focus({ preventScroll: true }); };
    if (event.key === 'Escape') {
      // Échap ferme seulement le menu, pas la fenêtre du lecteur autour.
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'ArrowDown') focus(index + 1);
    else if (event.key === 'ArrowUp') focus(index - 1);
    else if (event.key === 'Home') focus(0);
    else if (event.key === 'End') focus(items.length - 1);
    else if (event.key === 'Tab') close();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => close(true), 1_500);
  };

  const shareNative = async () => {
    close(true);
    try {
      await navigator.share({ title: share.title, text: share.text });
    } catch { /* partage annulé ou refusé : rien à signaler */ }
  };

  return (
    // `contents` : le bouton garde sa place dans la mise en page du parent ; aucun clic ne remonte à la carte.
    <span className="contents" onClick={event => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        tabIndex={tabIndex}
        aria-label={label}
        title="Partager"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={triggerClassName}
      >
        {children}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          popover="manual"
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="fixed inset-auto z-[70] m-0 w-56 rounded-card border border-line-gold bg-surface-1 p-1.5 text-text shadow-2xl"
        >
          <a role="menuitem" href={share.href} target="_blank" rel="noopener noreferrer" onClick={() => close()} className={ITEM}>
            <MessageCircle aria-hidden="true" className="size-4 shrink-0 text-al-green" />
            WhatsApp
          </a>
          <a role="menuitem" href={share.facebook} target="_blank" rel="noopener noreferrer" onClick={() => close()} className={ITEM}>
            <span aria-hidden="true" className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-[#1877F2] text-[11px] font-black leading-none text-white">f</span>
            Facebook
          </a>
          {nativeShare && (
            <button role="menuitem" type="button" onClick={shareNative} className={ITEM}>
              <Ellipsis aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0">
                Plus d’options…
                <span className="block text-xs font-normal text-text-muted">Instagram, TikTok, Telegram…</span>
              </span>
            </button>
          )}
          <button role="menuitem" type="button" onClick={copyLink} className={ITEM}>
            {copy === 'copied'
              ? <Check aria-hidden="true" className="size-4 shrink-0 text-al-green" />
              : <Copy aria-hidden="true" className="size-4 shrink-0 text-text-muted" />}
            {copy === 'copied' ? 'Lien copié' : copy === 'failed' ? 'Copie impossible' : 'Copier le lien'}
          </button>
        </div>
      )}
      <span role="status" className="sr-only">{copy === 'copied' ? 'Lien copié' : copy === 'failed' ? 'Copie impossible' : ''}</span>
    </span>
  );
}
