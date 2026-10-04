import assert from 'node:assert/strict';
import test from 'node:test';

import { isClerkFreePublicPage } from './public-static-pages';

test('only exact public static pages skip the Clerk middleware', () => {
  for (const path of ['/', '/pricing', '/cgu', '/privacy', '/contact']) assert.equal(isClerkFreePublicPage(path), true, path);
});

test('protected routes, APIs, auth pages and sub-routes keep the Clerk middleware', () => {
  for (const path of [
    '/app', '/app/live', '/app/mur', '/account', '/admin', '/player/42',
    '/sign-in', '/sign-up', '/pricing/error', '/pricing/success',
    '/api/channels', '/api/checkout/naboopay', '/api/health', '/api/webhooks/clerk', '/__clerk/x',
    '/pricing/', '//', '/PRICING', '/app/../pricing',
  ]) assert.equal(isClerkFreePublicPage(path), false, path);
});
