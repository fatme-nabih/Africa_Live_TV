import { Radar, Search, ShieldCheck, Tv, UserRound, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { NavItem, NavItemId } from '@/lib/shell-nav';

const ICONS: Record<NavItemId | 'search', LucideIcon> = {
  radar: Radar,
  tv: Tv,
  account: UserRound,
  admin: ShieldCheck,
  search: Search,
};

type Variant = 'header' | 'tabs';

/** Rendu commun de la navigation principale : barre d'en-tête (≥ 768 px) ou barre basse mobile. */
export default function NavLinks({
  items,
  variant,
  onSearch,
}: {
  items: NavItem[];
  variant: Variant;
  /** Présent uniquement pour la barre basse : insère l'entrée « Recherche » avant « Compte ». */
  onSearch?: () => void;
}) {
  const entries: Array<NavItem | 'search'> = [...items];
  if (onSearch) entries.splice(Math.min(2, entries.length), 0, 'search');

  return (
    <nav
      aria-label="Navigation principale"
      className={variant === 'header' ? 'hidden items-center gap-1 md:flex' : 'md:hidden'}
    >
      <ul className={variant === 'header' ? 'flex items-center gap-1' : 'flex'}>
        {entries.map(entry => {
          if (entry === 'search') {
            const Icon = ICONS.search;
            return (
              <li key="search" className="flex-1">
                <button type="button" onClick={onSearch} className={tabClass(false)}>
                  <Icon size={20} aria-hidden="true" />
                  <span>Recherche</span>
                </button>
              </li>
            );
          }
          const Icon = ICONS[entry.id];
          const current = entry.active ? ('page' as const) : undefined;
          if (variant === 'header') {
            return (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  aria-label={entry.ariaLabel}
                  aria-current={current}
                  className={`inline-flex min-h-11 items-center rounded-control px-3.5 text-sm font-semibold transition-colors ${
                    entry.active ? 'bg-al-yellow/10 text-al-yellow' : 'text-text-muted hover:bg-surface-2 hover:text-text'
                  }`}
                >
                  {entry.label}
                </Link>
              </li>
            );
          }
          return (
            <li key={entry.id} className="flex-1">
              <Link href={entry.href} aria-label={entry.ariaLabel} aria-current={current} className={tabClass(entry.active)}>
                <Icon size={20} aria-hidden="true" />
                <span>{entry.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function tabClass(active: boolean) {
  return `relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
    active
      ? 'text-al-yellow before:absolute before:inset-x-5 before:top-0 before:h-0.5 before:rounded-pill before:bg-al-yellow'
      : 'text-text-muted hover:text-text'
  }`;
}
