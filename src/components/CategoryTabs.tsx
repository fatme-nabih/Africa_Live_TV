'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Star,
  Film,
  Trophy,
  Newspaper,
  Tv,
  Globe,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';

export interface CategoryPreset {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  country?: string;
  favoritesOnly?: boolean;
}

const CATEGORY_PRESETS: CategoryPreset[] = [
  { id: 'all', label: 'Toutes les chaînes', icon: Sparkles },
  { id: 'favorites', label: 'Mes favoris', icon: Star, favoritesOnly: true },
  { id: 'france', label: 'France', icon: Globe, country: 'FR' },
  { id: 'news', label: 'News', icon: Newspaper, group: 'News' },
  { id: 'entertainment', label: 'Entertainment', icon: Flame, group: 'Entertainment' },
  { id: 'movies', label: 'Movies', icon: Film, group: 'Movies' },
  { id: 'sports', label: 'Sports', icon: Trophy, group: 'Sports' },
  { id: 'series', label: 'Series', icon: Tv, group: 'Series' },
];

interface CategoryTabsProps {
  activePresetId: string;
  onSelectPreset: (preset: CategoryPreset) => void;
  favoritesCount?: number;
}

export default function CategoryTabs({
  activePresetId,
  onSelectPreset,
  favoritesCount = 0,
}: CategoryTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollBy = (amount: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/90 p-1.5 shadow-xl backdrop-blur-md">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          aria-label="Faire défiler vers la gauche"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-yellow-400 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(200)}
          aria-label="Faire défiler vers la droite"
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-zinc-300 shadow-lg backdrop-blur transition hover:bg-yellow-400 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="no-scrollbar flex items-center gap-2 overflow-x-auto px-1 py-1 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORY_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          const Icon = preset.icon;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              aria-pressed={isActive}
              className={`relative flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
                isActive
                  ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/25 scale-[1.02]'
                  : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800/50'
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-transform duration-200 ${
                  isActive ? 'scale-110 text-black' : 'text-zinc-400'
                } ${preset.id === 'favorites' && isActive ? 'fill-current' : ''}`}
              />
              <span>{preset.label}</span>
              {preset.id === 'favorites' && favoritesCount > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-black/20 text-black' : 'bg-yellow-400/20 text-yellow-300'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeCategoryGlow"
                  className="absolute inset-0 rounded-xl bg-yellow-400/10 pointer-events-none ring-2 ring-yellow-400/50"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
