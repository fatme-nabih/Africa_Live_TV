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
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe,
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
  { id: 'all', label: 'Tout le catalogue', icon: Sparkles },
  { id: 'africa', label: 'Afrique', icon: Globe },
  { id: 'senegal', label: 'Sénégal', icon: Globe, country: 'SN' },
  { id: 'favorites', label: 'Favoris', icon: Star, favoritesOnly: true },
  { id: 'news', label: 'Actualités', icon: Newspaper, group: 'News' },
  { id: 'entertainment', label: 'Divertissement', icon: Flame, group: 'Entertainment' },
  { id: 'movies', label: 'Cinéma', icon: Film, group: 'Movies' },
  { id: 'sports', label: 'Sports', icon: Trophy, group: 'Sports' },
  { id: 'series', label: 'Séries', icon: Tv, group: 'Series' },
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
    <nav aria-label="Accès rapide aux catégories" className="relative w-full overflow-hidden rounded-2xl border border-line bg-surface-1/80 p-1.5 shadow-xl">
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-200)}
          aria-label="Faire défiler vers la gauche"
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-black/80 text-text shadow-md transition hover:border-al-gold/40 hover:text-al-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
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
          className="absolute right-2 top-1/2 z-20 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-black/80 text-text shadow-md transition hover:border-al-gold/40 hover:text-al-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-1 py-1 scroll-smooth"
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
              className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
                isActive
                  ? 'border border-al-gold bg-al-gold/10 text-text font-bold'
                  : 'border border-transparent bg-white/[0.02] text-text-muted hover:text-text hover:bg-white/[0.05] hover:border-line font-medium'
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isActive ? 'scale-105 text-al-gold' : 'text-text-muted'
                } ${preset.id === 'favorites' && isActive ? 'fill-current' : ''}`}
              />
              <span>{preset.label}</span>
              {preset.id === 'favorites' && favoritesCount > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
                    isActive ? 'bg-al-gold/20 text-text border border-al-gold/30' : 'bg-white/10 text-text'
                  }`}
                >
                  {favoritesCount}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeCategoryGlow"
                  className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-al-gold/30"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
