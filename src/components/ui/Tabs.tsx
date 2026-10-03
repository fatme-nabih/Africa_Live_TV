'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export type TabItem = { id: string; label: ReactNode; count?: number };

export function tabPanelId(idPrefix: string, id: string) {
  return `${idPrefix}-panel-${id}`;
}

/**
 * Onglets accessibles (rôle tablist, flèches / Début / Fin). Le panneau associé
 * porte `id={tabPanelId(idPrefix, id)}` et `role="tabpanel"`.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  idPrefix,
  ariaLabel,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  idPrefix: string;
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    onChange(tabs[target].id);
    refs.current[target]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('flex flex-wrap gap-1.5', className)}>
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={element => { refs.current[index] = element; }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={event => onKeyDown(event, index)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-xs font-semibold transition-colors duration-200 sm:min-h-10',
              selected
                ? 'border-al-gold bg-al-gold/10 text-text'
                : 'border-line text-text-muted hover:bg-surface-2 hover:text-text',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={cn('tabular-nums', selected ? 'text-al-gold' : 'text-text-muted')}>{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
