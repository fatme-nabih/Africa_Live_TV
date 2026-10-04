/**
 * Pages publiques statiques qui ne lisent jamais la session côté serveur (aucun `auth()`) : le middleware Clerk n'y sert à
 * rien et, à la première visite, sa poignée de main ajoute plusieurs redirections avant le premier octet (≈ 1,2 à 2,3 s
 * mesurés sur staging, 4G lente). L'état de connexion y est lu côté client par les composants Clerk.
 * Chemin exact uniquement : aucune sous-route, aucune API, aucune route protégée.
 */
export const CLERK_FREE_PUBLIC_PAGES: ReadonlySet<string> = new Set(['/', '/pricing', '/cgu', '/privacy', '/contact']);

export function isClerkFreePublicPage(pathname: string) {
  return CLERK_FREE_PUBLIC_PAGES.has(pathname);
}
