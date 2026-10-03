'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { FOCUS_SEARCH_EVENT, searchHref } from '@/lib/shell-nav';

/** Sur la TV, active la recherche du catalogue ; ailleurs, conduit à la TV avec le focus demandé. */
export function useOpenSearch(pathname: string, country: string | null) {
  const router = useRouter();
  return useCallback(() => {
    if (pathname === '/app') window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
    else router.push(searchHref(country));
  }, [pathname, country, router]);
}
