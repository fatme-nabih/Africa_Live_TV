/**
 * Origine de l'API frontale Clerk déduite de la clé publique (`pk_test_` / `pk_live_` + base64 de « hôte$ »).
 * Instance de développement : `*.clerk.accounts.dev` ; instance de production : domaine propre (`clerk.africatv.sn`).
 * La CSP doit l'autoriser, sinon le navigateur bloque le script Clerk (« failed_to_load_clerk_js »).
 */
export function clerkFrontendApiOrigin(publishableKey: string | undefined) {
  const match = /^pk_(?:test|live)_([A-Za-z0-9+/=]+)$/.exec(publishableKey ?? '');
  if (!match) return null;
  const host = Buffer.from(match[1], 'base64').toString('utf8').replace(/\$$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) ? `https://${host}` : null;
}

/** Cloudflare Turnstile : protection anti-robot des formulaires Clerk (instance de production). */
export const CLERK_CAPTCHA_ORIGIN = 'https://challenges.cloudflare.com';
