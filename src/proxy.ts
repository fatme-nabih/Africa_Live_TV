import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { isLocalDevMode, isLocalDevRequest } from './lib/local-dev';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
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

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  if (isLocalDevMode()) {
    if (!isLocalDevRequest(req)) return NextResponse.json({ error: 'Accès local uniquement.' }, { status: 403 });
    if (/^\/(account|pricing|sign-in|sign-up)(\/|$)/.test(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/app', req.url));
    }
    if (req.nextUrl.pathname.startsWith('/api/webhooks/')) return new NextResponse(null, { status: 404 });
    return NextResponse.next();
  }
  return authenticatedProxy(req, event);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
