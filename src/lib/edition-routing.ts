import { DEFAULT_EDITION, EDITION_COOKIE, EDITION_COOKIE_MAX_AGE, EDITION_IDS, parseEditionCookie, type Edition } from './editions';

/**
 * Routage des éditions (EDI-103), décrit une seule fois et partagé par le proxy et `next.config.ts`.
 * - Pages publiques (`/`, `/pricing`, `/cgu`, `/privacy`, `/contact`) : français sans préfixe, `/en/…` et `/ar/…` explicites.
 * - Espace connecté (`/app`, `/account`…) : adresse inchangée, édition lue dans le cookie `al_edition`.
 * - Le proxy décide des redirections (règles d'accès écrites sur les adresses visibles) ; la réécriture interne vers
 *   `app/[edition]` est faite par `rewrites()` de `next.config.ts`. Une réécriture renvoyée par le proxy deviendrait
 *   un relais HTTP quand le serveur écoute sur 127.0.0.1 (Next normalise l'adresse en `localhost`) : mesuré le 11/10/2026.
 * Les API, Clerk, les fichiers et les adresses inconnues ne sont jamais réécrits (404 par `app/global-not-found.tsx`).
 */
export const EDITION_PUBLIC_PAGES: readonly string[] = ['/', '/pricing', '/cgu', '/privacy', '/contact'];
/** Racines de l'espace connecté : la racine elle-même et toutes ses sous-pages. */
export const EDITION_CONNECTED_ROOTS: readonly string[] = ['/app', '/account', '/admin', '/player', '/sign-in', '/sign-up', '/pricing/success', '/pricing/error'];

const PUBLIC = new Set(EDITION_PUBLIC_PAGES);

export type EditionDecision =
  | { kind: 'pass' }
  | { kind: 'rewrite'; pathname: string; edition: Edition }
  | { kind: 'redirect'; pathname: string; status: 307 | 308; setCookie?: Edition };

const PREFIX = new RegExp(`^/(${EDITION_IDS.join('|')})(?=/|$)`);

export function isConnectedPage(pathname: string) {
  return EDITION_CONNECTED_ROOTS.some(root => pathname === root || pathname.startsWith(root + '/'));
}

const withEdition = (edition: Edition, path: string) => `/${edition}${path === '/' ? '' : path}`;

/**
 * Lien interne écrit dans une page d'édition (EDI-501) : le français garde ses adresses courtes. Une autre édition préfixe
 * les pages publiques (`/en/cgu`, rendu natif) et l'espace connecté (`/ar/sign-in` : le proxy mémorise l'édition puis
 * redirige vers l'adresse courte). Ancres, adresses externes et autres chemins sont rendus tels quels.
 */
/**
 * `prefetch` d'un lien : `false` pour un lien préfixé vers l'espace connecté (`/en/sign-in`), dont la requête mémorise
 * l'édition dans un cookie (règle 3 ci-dessus). Un préchargement par Next.js changerait l'édition d'un visiteur qui n'a
 * rien cliqué (mesuré le 13/10/2026 : `/en` puis `/` redirigeait vers `/en`). Sinon `undefined` : comportement par défaut.
 */
export function editionLinkPrefetch(href: string): false | undefined {
  const pathname = href.split(/[?#]/)[0];
  const prefix = PREFIX.exec(pathname)?.[1];
  if (!prefix || prefix === DEFAULT_EDITION) return undefined;
  return isConnectedPage(pathname.slice(prefix.length + 1) || '/') ? false : undefined;
}

export function editionHref(href: string, edition: Edition): string {
  if (edition === DEFAULT_EDITION || !href.startsWith('/') || href.startsWith('//')) return href;
  const end = href.search(/[?#]/);
  const pathname = end < 0 ? href : href.slice(0, end);
  if (!PUBLIC.has(pathname) && !isConnectedPage(pathname)) return href;
  return withEdition(edition, pathname) + (end < 0 ? '' : href.slice(end));
}

export function resolveEditionRequest(input: { pathname: string; cookie: string | null | undefined; enabled: readonly Edition[] }): EditionDecision {
  const { pathname, enabled } = input;
  const cookie = parseEditionCookie(input.cookie);
  const preferred: Edition = cookie && cookie !== DEFAULT_EDITION && enabled.includes(cookie) ? cookie : DEFAULT_EDITION;
  const prefix = PREFIX.exec(pathname)?.[1] as Edition | undefined;

  if (prefix) {
    const rest = pathname.slice(prefix.length + 1) || '/';
    // 1. Le français n'a pas de préfixe visible : `/fr/…` redirige vers l'adresse courte et mémorise le choix.
    if (prefix === DEFAULT_EDITION) return { kind: 'redirect', pathname: rest, status: 308, setCookie: DEFAULT_EDITION };
    if (!enabled.includes(prefix)) {
      // Édition inactive : un lien vers l'espace connecté garde son usage, en français, sans changer le choix mémorisé
      // (rendue sous `[edition]`, une page dynamique d'édition inactive n'aurait qu'une page d'erreur brute).
      if (isConnectedPage(rest)) return { kind: 'redirect', pathname: rest, status: 307 };
      // Pages publiques et adresses inconnues : 404 (`dynamicParams = false`, puis `global-not-found`).
      return { kind: 'pass' };
    }
    // 2. Page publique d'une autre édition : route native `app/[edition]`.
    if (PUBLIC.has(rest)) return { kind: 'pass' };
    // 3. Lien partagé vers l'espace connecté (`/ar/app/live`) : le cookie porte l'édition, l'adresse reste courte.
    if (isConnectedPage(rest)) return { kind: 'redirect', pathname: rest, status: 307, setCookie: prefix };
    return { kind: 'pass' };
  }

  if (PUBLIC.has(pathname)) {
    // 4. Page publique sans préfixe : l'édition choisie a sa propre adresse, sinon le français (réécriture interne).
    if (preferred !== DEFAULT_EDITION) return { kind: 'redirect', pathname: withEdition(preferred, pathname), status: 307 };
    return { kind: 'rewrite', pathname: withEdition(DEFAULT_EDITION, pathname), edition: DEFAULT_EDITION };
  }
  // 5. Espace connecté : réécriture interne selon le cookie, invisible dans la barre d'adresse.
  if (isConnectedPage(pathname)) return { kind: 'rewrite', pathname: withEdition(preferred, pathname), edition: preferred };
  // API, Clerk, fichiers et adresses inconnues.
  return { kind: 'pass' };
}

type RewriteRule = { source: string; destination: string; has?: { type: 'cookie'; key: string; value: string }[] };

/**
 * Règles `rewrites()` (afterFiles) équivalentes aux réécritures de `resolveEditionRequest` : d'abord le cookie de chaque
 * édition active autre que le français, pour l'espace connecté seulement, puis le français par défaut.
 */
export function editionRewrites(enabled: readonly Edition[]): RewriteRule[] {
  const connected = EDITION_CONNECTED_ROOTS.map(root => ({ source: `${root}/:rest*`, destination: (edition: Edition) => `/${edition}${root}/:rest*` }));
  const rules: RewriteRule[] = [];
  for (const edition of enabled) {
    if (edition === DEFAULT_EDITION) continue;
    // Même tolérance que parseEditionCookie (casse et espaces) : le proxy et le routeur doivent choisir la même édition.
    const cookiePattern = `\\s*${[...edition].map(letter => `[${letter}${letter.toUpperCase()}]`).join('')}\\s*`;
    for (const route of connected) rules.push({ source: route.source, destination: route.destination(edition), has: [{ type: 'cookie', key: EDITION_COOKIE, value: cookiePattern }] });
  }
  for (const page of EDITION_PUBLIC_PAGES) rules.push({ source: page, destination: withEdition(DEFAULT_EDITION, page) });
  for (const route of connected) rules.push({ source: route.source, destination: route.destination(DEFAULT_EDITION) });
  return rules;
}

/** Attributs du cookie d'édition (un an, tout le site, `Secure` en https ; lisible par le sélecteur d'édition). */
export function editionCookieOptions(secure: boolean) {
  return { path: '/', maxAge: EDITION_COOKIE_MAX_AGE, sameSite: 'lax' as const, secure };
}

/** Chemin de la page sans préfixe d'édition, pour les règles d'accès écrites sur les adresses visibles. */
export function withoutEditionPrefix(pathname: string) {
  const prefix = PREFIX.exec(pathname)?.[1];
  return prefix ? pathname.slice(prefix.length + 1) || '/' : pathname;
}
