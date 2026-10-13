import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { isAnonymousE2EMode, isLocalDevMode, isLocalDevRequest } from './lib/local-dev';
import { isLoopbackAddress } from './lib/local-request';
import { isClerkFreePublicPage } from './lib/public-static-pages';
import { EDITION_COOKIE, enabledEditions } from './lib/editions';
import { editionCookieOptions, resolveEditionRequest, withoutEditionPrefix, type EditionDecision } from './lib/edition-routing';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/admin(.*)',
  '/app(.*)',
  '/player(.*)',
  '/account(.*)',
  '/api/channels(.*)',
  '/api/filters(.*)',
  '/api/favorites(.*)',
  '/api/followed-countries(.*)',
  '/api/edition-preference(.*)',
  '/api/open-vlc(.*)',
  '/api/playback/resolutions(.*)',
  '/api/playback-events(.*)',
]);

const authenticatedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

/**
 * Redirections d'édition (EDI-103). Le proxy ne réécrit rien : la réécriture interne vers `app/[edition]` est faite par
 * `rewrites()` de next.config.ts (src/lib/edition-routing.ts). Les règles d'accès restent écrites sur les adresses visibles.
 */
function editionRedirect(req: NextRequest): NextResponse | null {
  const decision: EditionDecision = resolveEditionRequest({ pathname: req.nextUrl.pathname, cookie: req.cookies.get(EDITION_COOKIE)?.value, enabled: enabledEditions() });
  if (decision.kind !== 'redirect') return null;
  const url = req.nextUrl.clone();
  url.pathname = decision.pathname;
  const response = NextResponse.redirect(url, decision.status);
  if (decision.setCookie) response.cookies.set(EDITION_COOKIE, decision.setCookie, editionCookieOptions(req.nextUrl.protocol === 'https:'));
  return response;
}

function isLoopbackTarget(req: NextRequest) {
  const host = req.headers.get('host');
  if (!host || !isLoopbackAddress(req.nextUrl.hostname)) return false;
  try {
    return isLoopbackAddress(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isAnonymousE2EMode()) {
    if (!isLoopbackTarget(req)) return NextResponse.json({ error: 'Accès local uniquement.' }, { status: 403 });
    // CI has no real Clerk session. Reject Radar APIs here as well, so their
    // handlers cannot call auth() without Clerk middleware context.
    if (isProtectedRoute(req) || /^\/api\/live(?:\/|$)/.test(req.nextUrl.pathname)) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Authentification requise.', code: 'AUTHENTICATION_REQUIRED' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
    return editionRedirect(req) ?? NextResponse.next();
  }
  if (isLocalDevMode()) {
    if (!isLocalDevRequest(req)) return NextResponse.json({ error: 'Accès local uniquement.' }, { status: 403 });
    if (/^\/(admin|api\/admin)(\/|$)/.test(req.nextUrl.pathname)) {
      return NextResponse.json({ error: 'Une session administrateur Clerk est requise.' }, { status: 403 });
    }
    if (/^\/(account|pricing|sign-in|sign-up)(\/|$)/.test(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/app/live', req.url));
    }
    if (req.nextUrl.pathname.startsWith('/api/webhooks/')) return new NextResponse(null, { status: 404 });
    return editionRedirect(req) ?? NextResponse.next();
  }
  // Une redirection d'édition ne sert aucun contenu : la requête suivante repasse par Clerk.
  const redirect = editionRedirect(req);
  if (redirect) return redirect;
  if (isClerkFreePublicPage(withoutEditionPrefix(req.nextUrl.pathname))) return NextResponse.next();
  const response = await authenticatedProxy(req, event);
  const rewrite = response?.headers?.get('x-middleware-rewrite');
  if (response && rewrite) {
    try {
      const rewriteUrl = new URL(rewrite);
      if (
        (rewriteUrl.origin === req.nextUrl.origin ||
          (isLoopbackAddress(rewriteUrl.hostname) && isLoopbackAddress(req.nextUrl.hostname) && rewriteUrl.port === req.nextUrl.port)) &&
        rewriteUrl.pathname === req.nextUrl.pathname &&
        rewriteUrl.search === req.nextUrl.search
      ) {
        response.headers.delete('x-middleware-rewrite');
        response.headers.set('x-middleware-next', '1');
      }
    } catch {
      // non-URL destination
    }
  }
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
