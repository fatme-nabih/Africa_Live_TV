'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, type ReactNode } from 'react';
import { buildNavItems, countryFromSearch } from '@/lib/shell-nav';
import { Show } from '@clerk/nextjs';
import AppHeader, { type ShellMode } from './AppHeader';
import FollowedCountriesSync from './FollowedCountriesSync';
import NavLinks from './NavLinks';
import { useOpenSearch } from './useOpenSearch';
import AccountPreferences, { type PreferenceIdentity } from './AccountPreferences';

/**
 * Coquille unique des pages connectées (Radar, TV, Compte, Admin) et de la page Tarifs :
 * barre haute commune, barre basse sur mobile, zone de contenu avec lien d'évitement.
 * `admin` vient du serveur (capacité vérifiée) ; il ne se déduit jamais côté client.
 */
export default function AppShell({
  admin = false,
  mode = 'member',
  children,
  preferenceIdentity,
}: {
  admin?: boolean;
  mode?: ShellMode;
  children: ReactNode;
  preferenceIdentity?: PreferenceIdentity;
}) {
  if (preferenceIdentity) return <AccountPreferences identity={preferenceIdentity}><AppShell admin={admin} mode={mode}>{children}</AppShell></AccountPreferences>;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenu"
        className="sr-only z-[100] rounded-control bg-al-yellow px-4 py-2 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Aller au contenu
      </a>
      <Suspense fallback={<div className="h-[calc(0.125rem+3.5rem)] border-b border-line md:h-[calc(0.125rem+4rem)]" aria-hidden="true" />}>
        <AppHeader admin={admin} mode={mode} />
      </Suspense>
      <div
        id="contenu"
        tabIndex={-1}
        className={`flex flex-1 flex-col outline-none ${mode === 'public' ? '' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0'}`}
      >
        {children}
      </div>
      {mode === 'member' && (
        <Suspense fallback={null}>
          <MobileTabBar admin={admin} />
        </Suspense>
      )}
      {/* Pages connectées seulement : pays suivis synchronisés au compte (UX-503b). */}
      {mode === 'member' && <FollowedCountriesSync />}
      {mode === 'auto' && (
        <Show when="signed-in">
          <Suspense fallback={null}>
            <MobileTabBar admin={admin} />
          </Suspense>
        </Show>
      )}
    </div>
  );
}

/** Barre basse mobile : Radar · TV · Recherche · Compte (Admin ajouté seulement pour un administrateur). */
function MobileTabBar({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const country = countryFromSearch(useSearchParams().get('country'));
  const items = useMemo(() => buildNavItems({ pathname, country, admin }), [pathname, country, admin]);
  const onSearch = useOpenSearch(pathname, country);
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <NavLinks items={items} variant="tabs" onSearch={onSearch} />
    </div>
  );
}
