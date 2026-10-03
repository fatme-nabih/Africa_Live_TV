'use client';

import { Search, X } from 'lucide-react';

/**
 * Recherche du catalogue TV, toujours visible dans la barre d'outils (UX-209 : les filtres sont dans un tiroir unique).
 * Ctrl K ouvre la recherche universelle ; ce champ filtre seulement le catalogue.
 */
export default function CatalogSearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <label htmlFor="catalog-search" className="sr-only">Recherche</label>
      <input
        id="catalog-search"
        type="search"
        placeholder="Rechercher une chaîne…"
        value={value}
        onChange={event => onChange(event.target.value)}
        autoComplete="off"
        enterKeyHint="search"
        aria-describedby={value.trim().length === 1 ? 'catalog-search-hint' : undefined}
        className="h-11 w-full rounded-control border border-line bg-surface-2 pr-10 pl-9 text-sm text-text placeholder:text-text-muted transition-colors hover:border-line-gold focus-visible:border-al-gold focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-al-gold" aria-hidden="true" />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
      {value.trim().length === 1 && (
        <p id="catalog-search-hint" className="absolute top-full left-0 z-10 mt-1 rounded-control bg-surface-2 px-2 py-1 text-xs text-text-muted">
          Saisissez au moins deux caractères.
        </p>
      )}
    </div>
  );
}
