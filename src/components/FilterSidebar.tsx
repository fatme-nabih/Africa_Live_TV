'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search as SearchIcon,
  Globe as GlobeIcon,
  Filter as FilterIcon,
  Film as FilmIcon,
  Languages as LanguageIcon,
  Star as StarIcon,
  X as XIcon,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import {
  filterOptionsResponseSchema,
  messageForApiError,
  readApiResponse,
} from '@/lib/api-contracts';
import { formatCountryName, formatLanguageName } from '@/lib/format';
import { LatestRequestController } from '@/lib/latest-request';
import type { ChannelFilters } from '@/types/channel';

interface FilterSidebarProps {
  onFilterChange: (filters: ChannelFilters) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (value: boolean) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}
export default function FilterSidebar({
  onFilterChange,
  showFavoritesOnly,
  setShowFavoritesOnly,
  isOpenMobile = false,
  onCloseMobile,
}: FilterSidebarProps) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [group, setGroup] = useState('');
  const [language, setLanguage] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterRequestsRef = useRef<LatestRequestController | null>(null);
  if (filterRequestsRef.current === null) filterRequestsRef.current = new LatestRequestController();

  const loadFilters = useCallback(async () => {
    const request = filterRequestsRef.current!.begin();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/filters', { signal: request.signal, cache: 'no-store' });
      const data = await readApiResponse(response, filterOptionsResponseSchema);
      if (!filterRequestsRef.current!.isCurrent(request.id)) return;
      setCountries(data.countries);
      setGroups(data.groups);
      setLanguages(data.languages);
    } catch (requestError) {
      if (request.signal.aborted || !filterRequestsRef.current!.isCurrent(request.id)) return;
      setError(messageForApiError(requestError, 'Impossible de charger les options de filtre.'));
    } finally {
      if (filterRequestsRef.current!.isCurrent(request.id)) {
        setLoading(false);
        filterRequestsRef.current!.finish(request.id);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadFilters();
    });
    return () => {
      active = false;
      filterRequestsRef.current?.abort();
    };
  }, [loadFilters]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onFilterChange({ search, country, group, language, status: '' });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [onFilterChange, search, country, group, language]);

  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  const filterForm = (
    <>
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/30">
            <FilterIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <h2 id="catalog-filters-title" className="text-sm font-extrabold text-zinc-100">
            Filtres
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {(search || country || group || language || showFavoritesOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCountry('');
                setGroup('');
                setLanguage('');
                setShowFavoritesOnly(false);
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded px-1"
            >
              Réinitialiser
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fermer les filtres"
              className="flex lg:hidden h-6 w-6 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-2 text-[11px] text-red-100">
          <div className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadFilters()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-red-300/40 px-2 py-1 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Réessayer
          </button>
        </div>
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        aria-pressed={showFavoritesOnly}
        className={\lex w-full items-center justify-between rounded-lg border px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 \\}
      >
        <span className="flex items-center gap-2">
          <StarIcon className={\h-3.5 w-3.5 \\} aria-hidden="true" />
          <span className="text-xs font-semibold">Mes favoris</span>
        </span>
        {showFavoritesOnly && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" aria-hidden="true" />
        )}
      </motion.button>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-search" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Recherche</label>
        <div className="relative">
          <input
            id="catalog-search"
            type="search"
            placeholder="Rechercher une chaîne…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/70 py-1.5 pl-8 pr-12 text-xs text-zinc-100 placeholder-zinc-500 transition focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
          />
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          {!search ? (
            <kbd className="pointer-events-none absolute right-2 top-1.5 rounded bg-zinc-800 px-1 py-0.5 text-[9px] font-mono font-bold text-zinc-400 border border-zinc-700">
              Ctrl+K
            </kbd>
          ) : (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
            >
              <XIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-group" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Catégorie</label>
        <div className="relative">
          <select
            id="catalog-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            disabled={loading && groups.length === 0}
            className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/70 py-1.5 pl-8 pr-7 text-xs text-zinc-100 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-400/50"
          >
            <option value="">Toutes</option>
            {groups.map((availableGroup) => <option key={availableGroup} value={availableGroup} className="bg-zinc-950 text-zinc-100">{availableGroup}</option>)}
          </select>
          <FilmIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-country" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pays</label>
        <div className="relative">
          <select
            id="catalog-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            disabled={loading && countries.length === 0}
            className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/70 py-1.5 pl-8 pr-7 text-xs text-zinc-100 transition focus-visible:border-red-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500/50"
          >
            <option value="">Tous</option>
            {countries
              .map((code) => ({ code, name: formatCountryName(code, code) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-zinc-950 text-zinc-100">{name}</option>)}
          </select>
          <GlobeIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-language" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Langue</label>
        <div className="relative">
          <select
            id="catalog-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={loading && languages.length === 0}
            className="w-full appearance-none rounded-lg border border-zinc-800 bg-zinc-900/70 py-1.5 pl-8 pr-7 text-xs text-zinc-100 transition focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
          >
            <option value="">Toutes</option>
            {languages
              .map((code) => ({ code, name: formatLanguageName(code, code.toUpperCase()) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-zinc-950 text-zinc-100">{name}</option>)}
          </select>
          <LanguageIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {loading ? 'Chargement des options de filtre.' : 'Options de filtre chargées.'}
      </p>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg and up) */}
      <aside
        aria-labelledby="catalog-filters-title"
        className="hidden lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-y-auto rounded-xl border border-zinc-800/80 bg-zinc-950/90 p-4 shadow-xl backdrop-blur-md"
      >
        {filterForm}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden" role="dialog" aria-modal="true" aria-labelledby="catalog-filters-title">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="relative z-10 flex h-full w-full max-w-[280px] flex-col justify-between overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
          >
            {/* Tricolor top border accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-tricolor-bar" />

            <div className="flex flex-col gap-3 mt-1">
              {filterForm}
            </div>
            
            <div className="mt-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full relative overflow-hidden rounded-lg bg-zinc-900 border border-zinc-700 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-zinc-800 active:scale-[0.98]"
              >
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-tricolor-bar opacity-80" />
                Voir les résultats
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
