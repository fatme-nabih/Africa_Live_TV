import { fr } from '@/i18n/fr';
import type { Dictionary } from '@/i18n/dictionary';
import { catalogCountryHref } from './catalog-filter-state';
import { radarCountry } from './radar-workspace';

export type NavItemId = 'radar' | 'tv' | 'account' | 'admin';
export type NavItem = { id: NavItemId; label: string; href: string; ariaLabel?: string; active: boolean };

/**
 * Entrées de la navigation principale. Le pays choisi suit l'utilisateur d'un écran à l'autre
 * (paramètre `country`) ; l'entrée Admin n'existe que si le serveur a validé la capacité.
 */
export function buildNavItems({ pathname, country, admin, labels = fr.shell.nav }: {
  pathname: string; country?: string | null; admin: boolean; labels?: Dictionary['shell']['nav'];
}): NavItem[] {
  const tvHref = catalogCountryHref(country);
  const radarCode = radarCountry(country ?? null);
  const radarHref = radarCode ? `/app/live?country=${encodeURIComponent(radarCode)}` : '/app/live';
  const items: NavItem[] = [
    { id: 'radar', label: labels.radar, href: radarHref, active: pathname === '/app/live' },
    { id: 'tv', label: labels.tv, href: tvHref, active: pathname === '/app' },
    { id: 'account', label: labels.account, href: '/account', active: pathname === '/account' },
  ];
  if (admin) items.push({ id: 'admin', label: labels.admin, href: '/admin', ariaLabel: labels.adminAria, active: pathname === '/admin' });
  return items;
}

/** Pays courant lu dans l'URL : code ISO à deux lettres en majuscules, sinon aucun. */
export function countryFromSearch(search: string | null | undefined): string | null {
  const code = search?.trim().toUpperCase() ?? '';
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Événement émis par la barre de navigation pour demander le focus sur la recherche du catalogue TV. */
export const FOCUS_SEARCH_EVENT = 'al_focus_search';

/** Lien vers la TV avec demande de focus sur la recherche (consommé puis retiré de l'URL par la TV). */
export function searchHref(country?: string | null) {
  const code = countryFromSearch(country ?? null);
  return code ? `/app?country=${encodeURIComponent(code)}&focus=search` : '/app?focus=search';
}
