'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui';
import type { Channel } from '@/types/channel';
import ChannelTile from './ChannelTile';

/**
 * Rangée de chaînes défilable (tactile, molette, boutons, clavier). Une seule tuile est dans l'ordre de tabulation
 * (focus itinérant) : ← → Début Fin passent d'une chaîne à l'autre, Tab quitte la rangée.
 */
export default function ChannelRail({
  title,
  channels,
  loading = false,
  selectedId,
  favorites,
  onSelect,
  onToggleFavorite,
  action,
}: {
  title: string;
  channels: Channel[];
  loading?: boolean;
  selectedId: string | null;
  favorites: string[];
  onSelect: (channel: Channel, list: Channel[]) => void;
  onToggleFavorite: (id: string) => void;
  action?: ReactNode;
}) {
  const headingId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(channels.length - 1, 0));

  const scrollBy = (direction: -1 | 1) => {
    const element = scroller.current;
    if (!element) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, (index: number) => number> = {
      ArrowRight: index => Math.min(index + 1, channels.length - 1),
      ArrowLeft: index => Math.max(index - 1, 0),
      Home: () => 0,
      End: () => channels.length - 1,
    };
    const move = keys[event.key];
    if (!move || (event.target as HTMLElement).closest('[data-tile-main]') === null) return;
    event.preventDefault();
    const next = move(activeIndex);
    setActive(next);
    scroller.current?.querySelectorAll<HTMLElement>('[data-tile-main]')[next]?.focus();
  };

  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="font-display text-lg font-bold text-text">{title}</h2>
        <div className="flex items-center gap-1.5">
          {action}
          <div className="hidden items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Faire défiler vers la gauche"
              className="inline-flex size-9 items-center justify-center rounded-pill border border-line bg-surface-2 text-text-muted transition-colors hover:border-line-gold hover:text-text"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Faire défiler vers la droite"
              className="inline-flex size-9 items-center justify-center rounded-pill border border-line bg-surface-2 text-text-muted transition-colors hover:border-line-gold hover:text-text"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scroller}
        role="list"
        onKeyDown={onKeyDown}
        className="-mx-3 flex snap-x snap-proximity gap-3 overflow-x-auto scroll-px-3 px-3 pb-2 sm:-mx-1 sm:px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {channels.length === 0 && loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} role="listitem" className="w-[62%] shrink-0 sm:w-56">
                <Skeleton className="aspect-video w-full rounded-card" />
                <Skeleton className="mt-3 h-3 w-2/3" />
              </div>
            ))
          : channels.map((channel, index) => (
              <div
                key={channel.id}
                role="listitem"
                onFocusCapture={() => setActive(index)}
                className="w-[62%] shrink-0 snap-start sm:w-56"
              >
                <ChannelTile
                  channel={channel}
                  selected={selectedId === channel.id}
                  favorite={favorites.includes(channel.id)}
                  onSelect={picked => onSelect(picked, channels)}
                  onToggleFavorite={onToggleFavorite}
                  tabbable={index === activeIndex}
                />
              </div>
            ))}
      </div>
    </section>
  );
}
