import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { isLocalDevMode, isLocalDevRequest } from './lib/local-dev';
import { isLoopbackAddress } from './lib/local-request';
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
  '/api/open-vlc(.*)',
  '/api/playback/resolutions(.*)',
  '/api/playback-events(.*)',
]);

const authenticatedProxy = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isLocalDevMode()) {
    if (!isLocalDevRequest(req)) return NextResponse.json({ error: 'Accès local uniquement.' }, { status: 403 });
    if (/^\/(admin|api\/admin)(\/|$)/.test(req.nextUrl.pathname)) {
      return NextResponse.json({ error: 'Une session administrateur Clerk est requise.' }, { status: 403 });
    }
    if (/^\/(account|pricing|sign-in|sign-up)(\/|$)/.test(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/app', req.url));
    }
    if (req.nextUrl.pathname.startsWith('/api/webhooks/')) return new NextResponse(null, { status: 404 });
    return NextResponse.next();
  }
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
