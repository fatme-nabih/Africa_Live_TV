'use client';
import { withoutEditionPrefix } from '@/lib/edition-routing';
import EditionSwitcher from './EditionSwitcher';
import { editionCountries, countryName } from '@/lib/country-names';

import { Search } from 'lucide-react';
import { Show } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import BrandLogo from '@/components/BrandLogo';
import GoldRing from '@/components/brand/GoldRing';
import Wordmark from '@/components/brand/Wordmark';
import LocalAccountControls from '@/components/LocalAccountControls';
import { ButtonLink } from '@/components/ui';
import { catalogFilterUrl, catalogFiltersFromUrl } from '@/lib/catalog-filter-state';
import { formatCountryName } from '@/lib/format';
import { radarCountry, radarCountryUrl } from '@/lib/radar-workspace';
import { buildNavItems, countryFromSearch } from '@/lib/shell-nav';
import ClockBadge from './ClockBadge';
import EcoToggle from './EcoToggle';
import CountryPicker from './CountryPicker';
import NavLinks from './NavLinks';
import { useOpenSearch } from './useOpenSearch';
import { OPEN_UNIVERSAL_SEARCH_EVENT } from '@/lib/universal-search';
import { useI18n } from '@/i18n/client';

export type ShellMode = 'member' | 'public' | 'auto';


/**
 * Barre unique de l'application : logo, Radar, TV, recherche, pays, heure, compte.
 * Le pays vit dans l'URL (?country=) : il suit l'utilisateur du Radar à la TV.
 * `mode="public"` : visiteur non connecté — logo et connexion seulement.
 * `mode="auto"` : page publique qui s'adapte à la session Clerk (Tarifs).
 */
export default function AppHeader({ admin, mode = 'member' }: { admin: boolean; mode?: ShellMode }) {
  const { t, edition } = useI18n();
  const pathname = withoutEditionPrefix(usePathname());
  const params = useSearchParams();
  const country = countryFromSearch(params.get('country'));
  const items = useMemo(() => buildNavItems({ pathname, country, admin, labels: t.shell.nav }), [pathname, country, admin, t]);
  const showCountry = pathname === '/app' || pathname === '/app/live';
  // Le Radar ne connaît que les pays africains : un code inconnu y retombe sur la vue Afrique.
  const pickerCountry = pathname === '/app/live' ? radarCountry(country) : country;

  const changeCountry = useCallback((code: string | null) => {
    const current = window.location.pathname + window.location.search + window.location.hash;
    let next = current;
    if (window.location.pathname === '/app/live') {
      next = radarCountryUrl(window.location.href, code);
    } else if (window.location.pathname === '/app') {
      const { filters, favoritesOnly } = catalogFiltersFromUrl(new URLSearchParams(window.location.search));
      next = catalogFilterUrl(window.location.href, { ...filters, country: code ?? '', region: '' }, favoritesOnly);
    }
    if (next !== current) window.history.pushState(null, '', next);
  }, []);

  const publicContent = (
    <>
      <BrandLink href="/" label={t.shell.header.homeAria} />
      <div className="ms-auto flex items-center gap-2">
        <EditionSwitcher />
        <ButtonLink href="/sign-in" variant="ghost" size="sm">{t.shell.header.signIn}</ButtonLink>
        <span className="hidden sm:block">
          <ButtonLink href="/sign-up" variant="secondary" size="sm">{t.shell.header.start}</ButtonLink>
        </span>
      </div>
    </>
  );

  const memberContent = (
    <>
      <BrandLink href="/app/live" label={t.shell.header.dashboardAria} />
      <NavLinks items={items} variant="header" />
      <div className="ms-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none">
        {showCountry && (
          <CountryPicker
            value={pickerCountry}
            valueName={pickerCountry ? displayCountryName(pickerCountry, edition) : undefined}
            countries={editionCountries(edition)}
            onChange={changeCountry}
            className="min-w-0 flex-1 md:w-52 md:flex-none lg:w-64"
          />
        )}
        <SearchButton pathname={pathname} country={country} />
        <EditionSwitcher />
        <EcoToggle />
        <ClockBadge className="hidden h-11 lg:flex" />
        <LocalAccountControls />
      </div>
    </>
  );

  if (mode === 'public') return <HeaderFrame>{publicContent}</HeaderFrame>;
  if (mode === 'auto') {
    return (
      <HeaderFrame>
        <Show when="signed-out">{publicContent}</Show>
        <Show when="signed-in">{memberContent}</Show>
      </HeaderFrame>
    );
  }
  return <HeaderFrame>{memberContent}</HeaderFrame>;
}

/** Nom français du pays ; le code brut si l'environnement ne le connaît pas (« région inconnue »). */
function displayCountryName(code: string, edition: import('@/lib/editions').Edition) {
  const name = edition === 'fr' ? formatCountryName(code) : countryName(code, edition);
  return /inconnu/i.test(name) ? code : name;
}

function HeaderFrame({ children }: { children: React.ReactNode }) {
  return (
    <header
      style={{ viewTransitionName: 'app-header' }}
      className="sticky top-0 z-40 border-b border-line bg-black/80 backdrop-blur-xl"
    >
      <div className="bg-tricolor-bar h-0.5 w-full" aria-hidden="true" />
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-6 md:h-16">{children}</div>
    </header>
  );
}

function BrandLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="flex shrink-0 items-center gap-2.5 rounded-control">
      <GoldRing className="size-10">
        <BrandLogo className="size-9" decorative />
      </GoldRing>
      <span className="hidden sm:block md:hidden lg:block">
        <Wordmark className="text-sm" />
      </span>
    </Link>
  );
}

/**
 * Bouton de recherche (masqué sur mobile : barre basse). Dans l'espace /app il ouvre la recherche universelle, comme Ctrl K ;
 * ailleurs (Compte, Tarifs), où la palette n'existe pas, il conduit à la recherche de la TV.
 */
function SearchButton({ pathname, country }: { pathname: string; country: string | null }) {
  const { t } = useI18n();
  const openCatalogSearch = useOpenSearch(pathname, country);
  const inApp = pathname === '/app' || pathname.startsWith('/app/');
  const onClick = inApp ? () => window.dispatchEvent(new Event(OPEN_UNIVERSAL_SEARCH_EVENT)) : openCatalogSearch;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-keyshortcuts={inApp ? 'Control+K' : undefined}
      className="hidden h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-surface-2 px-3 text-sm font-semibold text-text-muted transition-colors hover:border-line-gold hover:text-text md:inline-flex"
    >
      <Search size={16} aria-hidden="true" className="text-al-gold" />
      {/* Nom accessible = texte visible (« Rechercher ») ; masqué à l'écran entre 768 et 1279 px, lu par les lecteurs d'écran. */}
      <span className="sr-only xl:not-sr-only">{t.shell.header.search}</span>
      {inApp && <kbd aria-hidden="true" className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-text-muted xl:inline">Ctrl K</kbd>}
    </button>
  );
}
