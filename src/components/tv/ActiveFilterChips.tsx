'use client';

import { X } from 'lucide-react';
import { catalogLanguageLabel, categoryLabel } from '@/lib/catalog-metadata';
import { formatCountryName } from '@/lib/format';
import type { ChannelFilters } from '@/types/channel';

type Chip = { key: string; label: string; next: ChannelFilters; favorites: boolean };

const STATUS_LABELS: Record<string, string> = { BROWSER_OK: 'Dans le navigateur', VLC_ONLY: 'Dans VLC', UNTESTED: 'Non testées' };

/** Pastilles des filtres actifs : chacune se retire d'un geste ; « Tout effacer » remet le catalogue complet. */
export default function ActiveFilterChips({
  filters,
  favoritesOnly,
  onChange,
  onClearAll,
}: {
  filters: ChannelFilters;
  favoritesOnly: boolean;
  onChange: (filters: ChannelFilters, favoritesOnly: boolean) => void;
  onClearAll: () => void;
}) {
  const chips: Chip[] = [];
  const add = (key: string, label: string, patch: Partial<ChannelFilters>, favorites = favoritesOnly) =>
    chips.push({ key, label, next: { ...filters, ...patch }, favorites });
  if (filters.search) add('search', `« ${filters.search} »`, { search: '' });
  if (filters.country) add('country', formatCountryName(filters.country, filters.country), { country: '' });
  if (filters.region === 'africa') add('region', 'Afrique', { region: '' });
  if (filters.group) add('group', categoryLabel(filters.group), { group: '' });
  if (filters.language) add('language', catalogLanguageLabel(filters.language), { language: '' });
  if (filters.status) add('status', STATUS_LABELS[filters.status] ?? filters.status, { status: '' });
  if (favoritesOnly) add('favorites', 'Favoris', {}, false);
  if (chips.length === 0) return null;

  return (
    <div role="group" aria-label="Filtres actifs" className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-text-muted">
        {chips.length} {chips.length > 1 ? 'filtres' : 'filtre'}
      </span>
      {chips.map(chip => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChange(chip.next, chip.favorites)}
          aria-label={`Retirer le filtre ${chip.label}`}
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-pill border border-al-gold bg-al-gold/10 px-3.5 text-xs font-semibold text-text transition-colors hover:bg-al-gold/20 sm:min-h-9"
        >
          <span className="truncate">{chip.label}</span>
          <X className="size-3.5 shrink-0 text-al-gold" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex min-h-11 items-center rounded-control px-3 text-xs font-bold text-al-gold transition-colors hover:text-text sm:min-h-9"
      >
        Tout effacer
      </button>
    </div>
  );
}
