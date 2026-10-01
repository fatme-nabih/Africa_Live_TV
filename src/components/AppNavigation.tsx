'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext } from 'react';
import BrandLogo from './BrandLogo';
import { catalogCountryHref } from '@/lib/catalog-filter-state';

export const NavigationRole = createContext(false);
export function NavigationProvider({ admin, children }: { admin: boolean; children: React.ReactNode }) {
  return <NavigationRole.Provider value={admin}>{children}</NavigationRole.Provider>;
}
export function AppBrand() {
  return <Link href="/app/live" aria-label="Dashboard Africa Live" className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-1"><BrandLogo className="h-full w-full" /></span>
    <span className="hidden text-sm font-bold text-white sm:block">Africa Live</span>
  </Link>;
}
export default function AppNavigation({ country }: { country?: string | null }) {
  const path = usePathname();
  const admin = useContext(NavigationRole);
  const countryTv = catalogCountryHref(country);
  const links = [{ href: countryTv.includes('?') ? countryTv.replace('/app?', '/app/live?') : '/app/live', label: 'Dashboard' }, { href: countryTv, label: 'TV' },
    { href: '/account', label: 'Compte' }, ...(admin ? [{ href: '/admin', label: 'Admin', name: 'Administration' }] : [])];
  return <nav aria-label="Navigation principale" className="flex flex-wrap items-center gap-1">
    {links.map(link => {
      const active = path === link.href.split('?')[0];
      return <Link key={link.label} href={link.href} aria-label={'name' in link ? link.name : link.label} aria-current={active ? 'page' : undefined}
        className={`rounded-lg border px-2 py-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${active ? 'border-amber-300/30 bg-amber-300/10 text-amber-200' : 'border-transparent text-zinc-300 hover:text-white'}`}>{link.label}</Link>;
    })}
  </nav>;
}
