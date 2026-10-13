import { EDITION_COOKIE, EDITION_COOKIE_MAX_AGE, isEdition, parseEditionCookie, type Edition } from './editions';
import { EDITION_PUBLIC_PAGES, withoutEditionPrefix } from './edition-routing';
import { markEditionChange } from './edition-halo';

/** FR conserve les adresses des anciens onglets ; les autres éditions sont explicites dans les requêtes. */
export function editionApiUrl(path: string, edition: Edition): string {
  if (edition === 'fr') return path;
  return path + (path.includes('?') ? '&' : '?') + 'edition=' + edition;
}
export function editionStorageKey(key: string, edition: Edition): string {
  return edition === 'fr' ? key : `${key}:${edition}`;
}
export function editionNavigationTarget(current: string, edition: Edition): string {
  const url = new URL(current, 'http://localhost');
  const pathname = withoutEditionPrefix(url.pathname);
  const target = EDITION_PUBLIC_PAGES.includes(pathname) && edition !== 'fr' ? `/${edition}${pathname === '/' ? '' : pathname}` : pathname;
  return target + url.search + url.hash;
}
export function editionCookie(edition: Edition, secure: boolean): string {
  return `${EDITION_COOKIE}=${edition}; Path=/; Max-Age=${EDITION_COOKIE_MAX_AGE}; SameSite=Lax${secure ? '; Secure' : ''}`;
}

/**
 * Action appelée uniquement après le choix de l'utilisateur, jamais pendant le rendu : cookie de l'appareil, marque du halo
 * de la carte (EDI-602), choix mémorisé dans le compte quand une session connue est présente (EDI-603), puis navigation complète.
 * `target` ouvre une adresse précise (pont entre éditions, EDI-601) au lieu de la page courante dans la nouvelle édition.
 */
export function chooseEdition(edition: Edition, browser: Window = window, options: { owner?: string | null; target?: string } = {}): void {
  browser.document.cookie = editionCookie(edition, browser.location.protocol === 'https:');
  let session: Storage | null = null;
  try { session = browser.sessionStorage; } catch { /* stockage refusé */ }
  markEditionChange(edition, session);
  if (options.owner) rememberEditionInAccount(edition, options.owner, browser);
  browser.location.assign(options.target ?? editionNavigationTarget(browser.location.href, edition));
}

/** Envoi sans attente (`keepalive` survit à la navigation) ; un échec laisse le cookie de l'appareil, rien d'autre. */
export function rememberEditionInAccount(edition: Edition, owner: string, browser: Pick<Window, 'fetch'> = window): void {
  try {
    void browser.fetch('/api/edition-preference', {
      method: 'PUT', keepalive: true, credentials: 'same-origin',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ edition, owner }),
    }).catch(() => undefined);
  } catch { /* fetch indisponible : préférence non mémorisée */ }
}

/** Cookie d'édition lisible dans `document.cookie` (valeur connue seulement). */
export function cookieEdition(cookies: string): Edition | null {
  for (const part of cookies.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === EDITION_COOKIE) return parseEditionCookie(value.join('='));
  }
  return null;
}

/**
 * Appareil sans choix d'édition (aucun cookie) : l'édition du compte s'applique si elle est active et différente de celle servie.
 * Un cookie présent garde toujours la main (choix de cet appareil ou lien partagé).
 */
export function accountEditionToApply(account: Edition | null | undefined, current: Edition, enabled: readonly Edition[], cookies: string): Edition | null {
  if (!account || account === current || !enabled.includes(account)) return null;
  return cookieEdition(cookies) ? null : account;
}

/** Première langue du navigateur qui correspond à une édition active (`en-GB` → `en`), sinon null (EDI-503). */
export function preferredEdition(languages: readonly string[], enabled: readonly Edition[]): Edition | null {
  for (const language of languages) {
    const primary = language.split('-')[0]?.toLowerCase();
    if (isEdition(primary) && enabled.includes(primary)) return primary;
  }
  return null;
}
