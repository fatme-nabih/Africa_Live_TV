'use client';

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
import { AFRICAN_COUNTRIES } from '@/lib/radar-countries';
import { radarCountry, radarCountryUrl } from '@/lib/radar-workspace';
import { buildNavItems, countryFromSearch } from '@/lib/shell-nav';
import ClockBadge from './ClockBadge';
import EcoToggle from './EcoToggle';
import CountryPicker from './CountryPicker';
import NavLinks from './NavLinks';
import { useOpenSearch } from './useOpenSearch';

export type ShellMode = 'member' | 'public' | 'auto';

const COUNTRIES = AFRICAN_COUNTRIES.map(({ code, name }) => ({ code, name }));

/**
 * Barre unique de l'application : logo, Radar, TV, recherche, pays, heure, compte.
 * Le pays vit dans l'URL (?country=) : il suit l'utilisateur du Radar à la TV.
 * `mode="public"` : visiteur non connecté — logo et connexion seulement.
 * `mode="auto"` : page publique qui s'adapte à la session Clerk (Tarifs).
 */
export default function AppHeader({ admin, mode = 'member' }: { admin: boolean; mode?: ShellMode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const country = countryFromSearch(params.get('country'));
  const items = useMemo(() => buildNavItems({ pathname, country, admin }), [pathname, country, admin]);
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
      <BrandLink href="/" label="Africa Live, accueil" />
      <div className="ml-auto flex items-center gap-2">
        <ButtonLink href="/sign-in" variant="ghost" size="sm">Se connecter</ButtonLink>
        <span className="hidden sm:block">
          <ButtonLink href="/sign-up" variant="secondary" size="sm">Commencer</ButtonLink>
        </span>
      </div>
    </>
  );

  const memberContent = (
    <>
      <BrandLink href="/app/live" label="Dashboard Africa Live" />
      <NavLinks items={items} variant="header" />
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none">
        {showCountry && (
          <CountryPicker
            value={pickerCountry}
            valueName={pickerCountry ? displayCountryName(pickerCountry) : undefined}
            countries={COUNTRIES}
            onChange={changeCountry}
            className="min-w-0 flex-1 md:w-52 md:flex-none lg:w-64"
          />
        )}
        <SearchButton pathname={pathname} country={country} />
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
function displayCountryName(code: string) {
  const name = formatCountryName(code);
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
        <BrandLogo className="size-9" />
      </GoldRing>
      <span className="hidden sm:block md:hidden lg:block">
        <Wordmark className="text-sm" />
      </span>
    </Link>
  );
}

/** Bouton de recherche : sur la TV il active la recherche, ailleurs il y conduit. Masqué sur mobile (barre basse). */
function SearchButton({ pathname, country }: { pathname: string; country: string | null }) {
  const onClick = useOpenSearch(pathname, country);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Rechercher une chaîne"
      className="hidden h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-surface-2 px-3 text-sm font-semibold text-text-muted transition-colors hover:border-line-gold hover:text-text md:inline-flex"
    >
      <Search size={16} aria-hidden="true" className="text-al-gold" />
      <span className="hidden xl:inline">Rechercher</span>
      <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-xs text-text-muted xl:inline">Ctrl K</kbd>
    </button>
  );
}
