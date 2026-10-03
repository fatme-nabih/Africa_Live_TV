'use client';

import { ChevronDown, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import {
  filterCountries,
  flagEmoji,
  parseRecentCountries,
  pushRecentCountry,
  RECENT_COUNTRIES_EVENT,
  type PickerCountry,
} from '@/lib/country-picker';
import { STORAGE_KEYS } from '@/lib/storage-keys';

const RECENTS_EVENT = RECENT_COUNTRIES_EVENT;
const MAX_RECENTS_SHOWN = 3;

function subscribeRecents(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(RECENTS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(RECENTS_EVENT, callback);
  };
}
function readRecentsRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.recentCountries);
  } catch {
    return null;
  }
}
function rememberCountry(code: string, valid: ReadonlySet<string>) {
  try {
    const current = parseRecentCountries(window.localStorage.getItem(STORAGE_KEYS.recentCountries), valid);
    window.localStorage.setItem(STORAGE_KEYS.recentCountries, JSON.stringify(pushRecentCountry(current, code)));
    window.dispatchEvent(new Event(RECENTS_EVENT));
  } catch {
    // Stockage indisponible : le choix reste valable, seul l'historique est perdu.
  }
}

type Option = { id: string; code: string | null; name: string; group: 'all' | 'recent' | 'country' | 'result' };

/**
 * Sélecteur de pays : combobox ARIA (saisie + liste), recherche sans accents,
 * pays récents, drapeaux. Remplace le <select> natif de 54 pays.
 * Clavier : ↑ ↓ naviguent, Entrée choisit, Échap referme et annule la saisie, Tab referme.
 */
export default function CountryPicker({
  value,
  valueName,
  countries,
  onChange,
  allLabel = 'Afrique · tous les pays',
  label = 'Choisir un pays',
  className = '',
}: {
  value: string | null;
  /** Nom à afficher quand le code courant n'est pas dans la liste (ex. pays hors Afrique côté TV). */
  valueName?: string;
  countries: readonly PickerCountry[];
  onChange: (code: string | null) => void;
  allLabel?: string;
  label?: string;
  className?: string;
}) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<{ query: string; base: string | null } | null>(null);
  const [active, setActive] = useState(0);

  const validCodes = useMemo(() => new Set(countries.map(country => country.code)), [countries]);
  const rawRecents = useSyncExternalStore(subscribeRecents, readRecentsRaw, () => null);
  const recents = useMemo(() => parseRecentCountries(rawRecents, validCodes), [rawRecents, validCodes]);

  const selected = value ? countries.find(country => country.code === value) : undefined;
  const selectedName = selected?.name ?? valueName ?? value ?? '';
  const editing = edit && edit.base === value ? edit : null;
  const inputValue = editing ? editing.query : selectedName;

  const options = useMemo<Option[]>(() => {
    const list: Option[] = [];
    const push = (code: string | null, name: string, group: Option['group']) =>
      list.push({ id: `${baseId}-opt-${list.length}`, code, name, group });
    const query = editing?.query ?? '';
    if (query.trim()) {
      for (const country of filterCountries(countries, query)) push(country.code, country.name, 'result');
      return list;
    }
    push(null, allLabel, 'all');
    for (const code of recents.slice(0, MAX_RECENTS_SHOWN)) {
      const country = countries.find(item => item.code === code);
      if (country) push(country.code, country.name, 'recent');
    }
    for (const country of filterCountries(countries, '')) push(country.code, country.name, 'country');
    return list;
  }, [allLabel, baseId, countries, editing?.query, recents]);

  const close = useCallback(() => {
    setOpen(false);
    setEdit(null);
  }, []);

  const choose = useCallback((option: Option) => {
    if (option.code) rememberCountry(option.code, validCodes);
    close();
    onChange(option.code);
    inputRef.current?.focus();
  }, [close, onChange, validCodes]);

  // Fermeture au clic ou au toucher à l'extérieur.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  // Garde l'option active visible pendant la navigation au clavier.
  useEffect(() => {
    if (!open) return;
    document.getElementById(options[active]?.id ?? '')?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, options]);

  const openList = () => {
    if (open) return;
    const index = value ? options.findIndex(option => option.code === value && option.group === 'country') : 0;
    setActive(Math.max(index, 0));
    setOpen(true);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEdit({ query: event.target.value, base: value });
    setActive(0);
    setOpen(true);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openList();
        else setActive(index => (index + 1) % options.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) openList();
        else setActive(index => (index - 1 + options.length) % options.length);
        break;
      case 'Home':
        if (open) { event.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (open) { event.preventDefault(); setActive(options.length - 1); }
        break;
      case 'Enter':
        if (open && options[active]) {
          event.preventDefault();
          choose(options[active]);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  };

  const flag = value ? flagEmoji(value) : '🌍';
  const activeId = open ? options[active]?.id : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base leading-none"
      >
        {flag}
      </span>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
        placeholder={allLabel}
        value={inputValue}
        onChange={onInputChange}
        onKeyDown={onKeyDown}
        onClick={openList}
        onFocus={event => event.currentTarget.select()}
        className="h-11 w-full min-w-0 truncate rounded-control border border-line bg-surface-2 pl-10 pr-16 text-sm font-medium text-text placeholder:text-text-muted hover:border-line-gold focus-visible:border-al-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-al-gold/40"
      />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        {value && !editing && (
          <button
            type="button"
            aria-label="Réinitialiser le pays"
            onClick={() => {
              close();
              onChange(null);
              inputRef.current?.focus();
            }}
            className="inline-flex size-9 items-center justify-center rounded-pill text-text-muted hover:text-text"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => (open ? close() : (inputRef.current?.focus(), openList()))}
          className="inline-flex size-9 items-center justify-center rounded-pill text-text-muted"
        >
          <ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {open ? (options.length === 0 ? 'Aucun pays trouvé' : `${options.length} résultats`) : ''}
      </span>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="fixed inset-x-3 top-[3.75rem] z-[60] max-h-[min(70vh,26rem)] overflow-y-auto overscroll-contain rounded-card border border-line-gold bg-surface-1 p-1.5 shadow-2xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 sm:w-80"
        >
          {options.length === 0 && (
            <li role="presentation" className="px-3 py-4 text-sm text-text-muted">
              Aucun pays ne correspond à « {editing?.query} ».
            </li>
          )}
          {options.map((option, index) => {
            const previous = options[index - 1];
            const heading =
              option.group === 'recent' && previous?.group !== 'recent' ? 'Récents'
              : option.group === 'country' && previous?.group !== 'country' ? 'Tous les pays'
              : null;
            const isSelected = option.code === value;
            return (
              <li key={option.id} role="presentation">
                {heading && (
                  <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-[0.14em] text-al-gold">{heading}</p>
                )}
                <div
                  id={option.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => choose(option)}
                  onMouseMove={() => active !== index && setActive(index)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 text-sm ${
                    index === active ? 'bg-surface-3 text-text' : 'text-text-muted'
                  } ${isSelected ? 'font-semibold text-text' : ''}`}
                >
                  <span aria-hidden="true" className="w-6 text-center text-base leading-none">
                    {option.code ? flagEmoji(option.code) : '🌍'}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  {isSelected && <span aria-hidden="true" className="text-al-gold">✓</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
