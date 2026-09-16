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
import { STREAM_STATUSES, type ChannelFilters, type StreamStatus } from '@/types/channel';

interface FilterSidebarProps {
  onFilterChange: (filters: ChannelFilters) => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (value: boolean) => void;
}
const statusLabels: Partial<Record<StreamStatus, string>> = {
  BROWSER_OK: 'Navigateur',
  VLC_ONLY: 'VLC',
  UNTESTED: 'Non vérifié',
  OFFLINE: 'Hors ligne',
};

function toFilterStatus(value: string): ChannelFilters['status'] {
  return value === '' || STREAM_STATUSES.includes(value as StreamStatus)
    ? (value as ChannelFilters['status'])
    : '';
}

export default function FilterSidebar({
  onFilterChange,
  showFavoritesOnly,
  setShowFavoritesOnly,
}: FilterSidebarProps) {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [group, setGroup] = useState('');
  const [language, setLanguage] = useState('');
  const [status, setStatus] = useState<ChannelFilters['status']>('');
  const [countries, setCountries] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<StreamStatus[]>([]);
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
      setStatuses(data.statuses);
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
      onFilterChange({ search, country, group, language, status });
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [onFilterChange, search, country, group, language, status]);

  return (
    <aside
      aria-labelledby="catalog-filters-title"
      className="flex h-full flex-col gap-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300 border border-yellow-400/20">
            <FilterIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <h2 id="catalog-filters-title" className="text-base font-extrabold text-zinc-100">
            Filtres
          </h2>
        </div>
        {(search || country || group || language || status || showFavoritesOnly) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCountry('');
              setGroup('');
              setLanguage('');
              setStatus('');
              setShowFavoritesOnly(false);
            }}
            className="text-xs font-bold text-yellow-400 hover:text-yellow-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 rounded px-1"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadFilters()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300/40 px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
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
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${
          showFavoritesOnly
            ? 'border-yellow-400/50 bg-yellow-400/15 text-yellow-200 shadow-lg shadow-yellow-950/30 font-bold'
            : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
        }`}
      >
        <span className="flex items-center gap-3">
          <StarIcon className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current text-yellow-400' : 'text-zinc-400'}`} aria-hidden="true" />
          <span className="text-sm font-semibold">Mes favoris</span>
        </span>
        {showFavoritesOnly && (
          <span className="flex h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]" aria-hidden="true" />
        )}
      </motion.button>

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-search" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Recherche</label>
        <div className="relative">
          <input
            id="catalog-search"
            type="search"
            placeholder="Nom de la chaîne…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-14 text-sm text-zinc-100 placeholder-zinc-500 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30"
          />
          <SearchIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
          {!search ? (
            <kbd className="pointer-events-none absolute right-3 top-2.5 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-zinc-400 border border-zinc-700">
              Ctrl+K
            </kbd>
          ) : (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300"
            >
              <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-group" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Catégorie</label>
        <div className="relative">
          <select
            id="catalog-group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            disabled={loading && groups.length === 0}
            className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-8 text-sm text-zinc-100 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30"
          >
            <option value="">Toutes les catégories</option>
            {groups.map((availableGroup) => <option key={availableGroup} value={availableGroup} className="bg-zinc-950 text-zinc-100">{availableGroup}</option>)}
          </select>
          <FilmIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-country" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pays</label>
        <div className="relative">
          <select
            id="catalog-country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            disabled={loading && countries.length === 0}
            className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-8 text-sm text-zinc-100 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30"
          >
            <option value="">Tous les pays</option>
            {countries
              .map((code) => ({ code, name: formatCountryName(code, code) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-zinc-950 text-zinc-100">{name}</option>)}
          </select>
          <GlobeIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-language" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Langue</label>
        <div className="relative">
          <select
            id="catalog-language"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            disabled={loading && languages.length === 0}
            className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-8 text-sm text-zinc-100 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30"
          >
            <option value="">Toutes les langues</option>
            {languages
              .map((code) => ({ code, name: formatLanguageName(code, code.toUpperCase()) }))
              .sort((left, right) => left.name.localeCompare(right.name, 'fr'))
              .map(({ code, name }) => <option key={code} value={code} className="bg-zinc-950 text-zinc-100">{name}</option>)}
          </select>
          <LanguageIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="catalog-status" className="text-xs font-bold uppercase tracking-wider text-zinc-400">Compatibilité</label>
        <div className="relative">
          <select
            id="catalog-status"
            value={status}
            onChange={(event) => setStatus(toFilterStatus(event.target.value))}
            disabled={loading && statuses.length === 0}
            className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-10 pr-8 text-sm text-zinc-100 transition focus-visible:border-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/30"
          >
            <option value="">Tous les statuts</option>
            {statuses.map((availableStatus) => (
              <option key={availableStatus} value={availableStatus} className="bg-zinc-950 text-zinc-100">{statusLabels[availableStatus] ?? availableStatus}</option>
            ))}
          </select>
          <FilterIcon className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-zinc-400" aria-hidden="true" />
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {loading ? 'Chargement des options de filtre.' : 'Options de filtre chargées.'}
      </p>
    </aside>
  );
}
