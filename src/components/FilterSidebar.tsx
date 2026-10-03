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
} from 'lucide-react';

import {
  filterOptionsResponseSchema,
  messageForApiError,
  readApiResponse,
} from '@/lib/api-contracts';
import { formatCountryName } from '@/lib/format';
import { categoryCodes, categoryLabel, catalogLanguageCodes, catalogLanguageLabel } from '@/lib/catalog-metadata';
import { uniqueFilterOptions } from '@/lib/radar-data';
import { LatestRequestController } from '@/lib/latest-request';
import { ErrorState } from '@/components/ui';
import type { ChannelFilters } from '@/types/channel';

interface FilterSidebarProps {
  filters: ChannelFilters;
  onReset: () => void;
  onFilterChange: (filters: ChannelFilters) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (value: boolean) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}
export default function FilterSidebar({
  filters, onReset, onFilterChange,
  showFavoritesOnly,
  setShowFavoritesOnly,
  isOpenMobile = false,
  onCloseMobile,
}: FilterSidebarProps) {
  const { search, country, group, language } = filters;
  const setSearch = (search: string) => onFilterChange({ ...filters, search });
  const setCountry = (country: string) => onFilterChange({ ...filters, country });
  const setGroup = (group: string) => onFilterChange({ ...filters, group });
  const setLanguage = (language: string) => onFilterChange({ ...filters, language });
  const [countries, setCountries] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterRequestsRef = useRef<LatestRequestController | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  if (filterRequestsRef.current === null) filterRequestsRef.current = new LatestRequestController();

  const loadFilters = useCallback(async () => {
    const request = filterRequestsRef.current!.begin();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/filters', { signal: request.signal, cache: 'no-store' });
      const data = await readApiResponse(response, filterOptionsResponseSchema);
      if (!filterRequestsRef.current!.isCurrent(request.id)) return;
      setCountries(uniqueFilterOptions(data.countries));
      setGroups(uniqueFilterOptions(data.groups.flatMap(categoryCodes)));
      setLanguages(uniqueFilterOptions(data.languages.flatMap(catalogLanguageCodes)));
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
    if (!isOpenMobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = drawerRef.current;
    const controls = () => Array.from(drawer?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]') ?? []);
    controls()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile?.();
      if (event.key === 'Tab') {
        const items = controls(), first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) onCloseMobile?.(); };
    desktop.addEventListener('change', closeOnDesktop);
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); desktop.removeEventListener('change', closeOnDesktop); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [isOpenMobile, onCloseMobile]);

  const filterForm = (
    <>
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-al-gold/10 text-al-gold border border-al-gold/25">
            <FilterIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <h2 id="catalog-filters-title" className="text-xs sm:text-sm font-bold text-text">
            Filtres
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {(search || country || group || language || filters.region || showFavoritesOnly) && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs font-bold text-al-gold hover:text-al-gold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold rounded px-1"
            >
              Réinitialiser
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fermer les filtres"
              className="flex lg:hidden h-7 w-7 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-text-muted hover:text-text hover:border-white/20"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <ErrorState className="p-3 sm:p-3" title="Filtres momentanément indisponibles" description={error} onRetry={() => void loadFilters()} />
      )}

      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        aria-pressed={showFavoritesOnly}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold ${
          showFavoritesOnly
            ? 'border-al-gold/40 bg-al-gold/15 text-text shadow-md font-bold'
            : 'border-line bg-white/[0.02] text-text hover:border-white/20 hover:bg-white/[0.04]'
        }`}
      >
        <span className="flex items-center gap-2">
          <StarIcon className={`h-3.5 w-3.5 ${showFavoritesOnly ? 'fill-current text-al-gold' : 'text-text-muted'}`} aria-hidden="true" />
          <span className="text-xs font-semibold">Mes favoris</span>
        </span>
        {showFavoritesOnly && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-al-yellow shadow-[0_0_8px_rgba(252,209,22,0.8)]" aria-hidden="true" />
        )}
      </motion.button>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-search" className="text-xs font-bold uppercase tracking-wider text-text-muted">Recherche</label>
        <div className="relative">
          <input
            id="catalog-search"
            type="search"
            placeholder="Rechercher une chaîne…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-white/[0.03] py-1.5 pl-8 pr-12 text-xs text-text placeholder:text-text-muted transition hover:border-white/20 focus-visible:border-al-gold/60 focus-visible:bg-surface-1/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold/30"
          />
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
          {!search ? (
            <kbd className="pointer-events-none absolute right-2 top-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-mono font-bold text-text-muted border border-line">
              Ctrl+K
            </kbd>
          ) : (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md text-text-muted transition hover:bg-white/10 hover:text-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold"
            >
              <XIcon className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-group" className="text-xs font-bold uppercase tracking-wider text-text-muted">Catégorie</label>
        <div className="relative">
          <select
            id="catalog-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            disabled={loading && groups.length === 0}
            className="w-full appearance-none rounded-xl border border-line bg-white/[0.03] py-1.5 pl-8 pr-7 text-xs text-text transition hover:border-white/20 focus-visible:border-al-gold/60 focus-visible:bg-surface-1/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold/30"
          >
            <option value="" className="bg-black text-text">Toutes</option>
            {uniqueFilterOptions([...groups, ...(group ? [group] : [])]).map((availableGroup) => <option key={availableGroup} value={availableGroup} className="bg-black text-text">{categoryLabel(availableGroup)}</option>)}
          </select>
          <FilmIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-country" className="text-xs font-bold uppercase tracking-wider text-text-muted">Pays</label>
        <div className="relative">
          <select
            id="catalog-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            disabled={loading && countries.length === 0}
            className="w-full appearance-none rounded-xl border border-line bg-white/[0.03] py-1.5 pl-8 pr-7 text-xs text-text transition hover:border-white/20 focus-visible:border-al-gold/60 focus-visible:bg-surface-1/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold/30"
          >
            <option value="" className="bg-black text-text">Tous</option>
            {uniqueFilterOptions([...countries, ...(country ? [country] : [])])
              .map((code) => ({ code, name: formatCountryName(code, code) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-black text-text">{name}</option>)}
          </select>
          <GlobeIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="catalog-language" className="text-xs font-bold uppercase tracking-wider text-text-muted">Langue</label>
        <div className="relative">
          <select
            id="catalog-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={loading && languages.length === 0}
            className="w-full appearance-none rounded-xl border border-line bg-white/[0.03] py-1.5 pl-8 pr-7 text-xs text-text transition hover:border-white/20 focus-visible:border-al-gold/60 focus-visible:bg-surface-1/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-al-gold/30"
          >
            <option value="" className="bg-black text-text">Toutes</option>
            {uniqueFilterOptions([...languages, ...(language ? [language] : [])])
              .map((code) => ({ code, name: catalogLanguageLabel(code) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-black text-text">{name}</option>)}
          </select>
          <LanguageIcon className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
        </div>
      </div>

      {filters.region === 'africa' && <p className="text-xs text-text">Périmètre : Afrique</p>}
      {search.trim().length === 1 && <p className="text-xs text-text-muted">Saisissez au moins deux caractères.</p>}
      <p className="sr-only" aria-live="polite">
        {loading ? 'Chargement des options de filtre.' : 'Options de filtre chargées.'}
      </p>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg and up) */}
      {!isOpenMobile && <aside
        aria-labelledby="catalog-filters-title"
        className="hidden lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-black/40 p-4 shadow-2xl backdrop-blur-2xl"
      >
        {filterForm}
      </aside>}

      {/* Mobile Slide-over Drawer */}
      {isOpenMobile && (
        <div ref={drawerRef} className="fixed inset-0 z-50 flex justify-end lg:hidden" role="dialog" aria-modal="true" aria-labelledby="catalog-filters-title">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            className="relative z-10 flex h-full w-full max-w-[280px] flex-col justify-between overflow-y-auto border-l border-line bg-black/90 p-4 shadow-2xl"
          >
            {/* Tricolor top border accent */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-tricolor-bar opacity-80" />

            <div className="flex flex-col gap-3 mt-2">
              {filterForm}
            </div>
            
            <div className="mt-3 pt-3 border-t border-line">
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-full relative overflow-hidden rounded-xl border border-al-gold/30 bg-al-gold/10 hover:bg-al-gold/20 py-2.5 text-xs font-bold text-text shadow-lg transition active:scale-[0.98]"
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
