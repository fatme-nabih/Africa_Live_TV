import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
// Moteur de correspondance utilisé par le routeur de Next pour `rewrites()`.
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { EDITION_CONNECTED_ROOTS, EDITION_PUBLIC_PAGES, editionCookieOptions, editionRewrites, isConnectedPage, resolveEditionRequest, withoutEditionPrefix } from './edition-routing';
import type { Edition } from './editions';

const ONLY_FR: Edition[] = ['fr'];
const FR_EN: Edition[] = ['fr', 'en'];
const ALL: Edition[] = ['fr', 'en', 'ar'];
const decide = (pathname: string, cookie: string | undefined, enabled: Edition[]) => resolveEditionRequest({ pathname, cookie, enabled });

test('EDI-103: /fr/… always redirects (308) to the short address and remembers fr', () => {
  for (const enabled of [ONLY_FR, ALL]) for (const cookie of [undefined, 'fr', 'en', 'xx']) {
    assert.deepEqual(decide('/fr', cookie, enabled), { kind: 'redirect', pathname: '/', status: 308, setCookie: 'fr' });
    assert.deepEqual(decide('/fr/cgu', cookie, enabled), { kind: 'redirect', pathname: '/cgu', status: 308, setCookie: 'fr' });
    assert.deepEqual(decide('/fr/app/live', cookie, enabled), { kind: 'redirect', pathname: '/app/live', status: 308, setCookie: 'fr' });
  }
  assert.deepEqual(decide('/franchise', undefined, ALL), { kind: 'pass' }, 'un mot qui commence par fr n’est pas un préfixe');
});

test('EDI-103: an active edition serves its public pages natively and carries connected links through the cookie', () => {
  for (const cookie of [undefined, 'fr', 'ar', 'bad']) {
    for (const page of EDITION_PUBLIC_PAGES) assert.deepEqual(decide(page === '/' ? '/en' : '/en' + page, cookie, FR_EN), { kind: 'pass' }, page);
    assert.deepEqual(decide('/en/app/live', cookie, FR_EN), { kind: 'redirect', pathname: '/app/live', status: 307, setCookie: 'en' });
    assert.deepEqual(decide('/en/pricing/success', cookie, FR_EN), { kind: 'redirect', pathname: '/pricing/success', status: 307, setCookie: 'en' });
  }
  assert.deepEqual(decide('/ar/player/42', undefined, ALL), { kind: 'redirect', pathname: '/player/42', status: 307, setCookie: 'ar' });
  assert.deepEqual(decide('/en/inconnue', undefined, FR_EN), { kind: 'pass' });
});

test('EDI-103: an inactive edition keeps its 404 for public pages and sends connected links to French without a cookie', () => {
  for (const cookie of [undefined, 'en', 'fr']) {
    assert.deepEqual(decide('/en', cookie, ONLY_FR), { kind: 'pass' });
    assert.deepEqual(decide('/en/cgu', cookie, ONLY_FR), { kind: 'pass' });
    assert.deepEqual(decide('/ar/app/live', cookie, FR_EN), { kind: 'redirect', pathname: '/app/live', status: 307 });
  }
  assert.deepEqual(decide('/es', undefined, ALL), { kind: 'pass' }, 'pas d’espagnol (D1)');
});

test('EDI-103: unprefixed public pages are French unless an active edition is remembered', () => {
  for (const page of EDITION_PUBLIC_PAGES) {
    const french = { kind: 'rewrite', pathname: page === '/' ? '/fr' : '/fr' + page, edition: 'fr' };
    for (const cookie of [undefined, 'fr', 'xx', 'es']) assert.deepEqual(decide(page, cookie, ALL), french, `${page} ${cookie}`);
    assert.deepEqual(decide(page, 'en', ONLY_FR), french, 'édition mémorisée mais inactive');
    assert.deepEqual(decide(page, 'en', FR_EN), { kind: 'redirect', pathname: page === '/' ? '/en' : '/en' + page, status: 307 });
    assert.deepEqual(decide(page, 'ar', ALL), { kind: 'redirect', pathname: page === '/' ? '/ar' : '/ar' + page, status: 307 });
  }
  assert.deepEqual(decide('/', ' AR ', ALL), { kind: 'redirect', pathname: '/ar', status: 307 }, 'valeur de cookie normalisée');
});

test('EDI-103: connected pages keep their address and follow the cookie; API, Clerk, files and unknown pages pass', () => {
  for (const path of ['/app', '/app/live', '/app/mur', '/account', '/admin', '/player/abc', '/sign-in', '/sign-in/factor-one', '/sign-up', '/pricing/success', '/pricing/error']) {
    assert.deepEqual(decide(path, undefined, ALL), { kind: 'rewrite', pathname: '/fr' + path, edition: 'fr' });
    assert.deepEqual(decide(path, 'en', ONLY_FR), { kind: 'rewrite', pathname: '/fr' + path, edition: 'fr' });
    assert.deepEqual(decide(path, 'en', FR_EN), { kind: 'rewrite', pathname: '/en' + path, edition: 'en' });
    assert.deepEqual(decide(path, 'ar', ALL), { kind: 'rewrite', pathname: '/ar' + path, edition: 'ar' });
  }
  for (const path of ['/api/health', '/api/live/rss', '/api/admin/contact-requests/1', '/__clerk/v1/client', '/trpc/x', '/sw.js', '/manifest.webmanifest',
    '/icon.png', '/page-inexistante', '/a/b', '/application', '/accounts', '/pricingx']) {
    for (const cookie of [undefined, 'en']) assert.deepEqual(decide(path, cookie, ALL), { kind: 'pass' }, `${path} ${cookie}`);
  }
});

/** Applique les règles `rewrites()` comme le routeur de Next (première règle dont la source et le cookie correspondent). */
function applyRewrites(rules: ReturnType<typeof editionRewrites>, pathname: string, cookie: string | undefined) {
  for (const rule of rules) {
    const params = getPathMatch(rule.source, { removeUnnamedParams: true })(pathname);
    if (!params) continue;
    if (rule.has && !rule.has.every(item => cookie !== undefined && new RegExp(`^${item.value}$`).test(cookie))) continue;
    const rest = (params as Record<string, string[] | undefined>).rest;
    return rule.destination.replace('/:rest*', rest?.length ? '/' + rest.join('/') : '');
  }
  return null;
}

test('EDI-103: next.config rewrites produce exactly the rewrites decided by resolveEditionRequest', () => {
  const paths = ['/', '/cgu', '/privacy', '/contact', '/pricing', '/pricing/success', '/pricing/error', '/app', '/app/live', '/app/mur', '/app/ui', '/account',
    '/admin', '/player/abc', '/sign-in', '/sign-in/sso-callback', '/sign-up', '/api/health', '/page-inexistante', '/en', '/en/cgu', '/ar', '/application', '/fr'];
  for (const enabled of [ONLY_FR, FR_EN, ALL]) {
    const rules = editionRewrites(enabled);
    for (const path of paths) for (const cookie of [undefined, 'fr', 'en', 'ar', 'xx', ' EN ', 'AR']) {
      const decision = decide(path, cookie, enabled);
      const rewritten = applyRewrites(rules, path, cookie);
      if (decision.kind === 'rewrite') assert.equal(rewritten, decision.pathname, `${enabled} ${path} ${cookie}`);
      // Une redirection du proxy part avant les réécritures ; sinon, aucune règle ne doit s'appliquer.
      if (decision.kind === 'pass') assert.equal(rewritten, null, `${enabled} ${path} ${cookie}`);
    }
  }
  assert.equal(editionRewrites(ONLY_FR).some(rule => rule.has), false, 'avec EDITIONS=fr, aucune règle de cookie');
});

test('EDI-103: every page folder of app/[edition] is a public page or a connected root', () => {
  const folders = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .flatMap(entry => /^\(.*\)$/.test(entry.name) ? folders(`${dir}/${entry.name}`) : [entry.name]);
  for (const name of folders('src/app/[edition]')) {
    const path = '/' + name;
    assert.ok(EDITION_PUBLIC_PAGES.includes(path) || EDITION_CONNECTED_ROOTS.includes(path) || isConnectedPage(path), `dossier non routé : ${path}`);
  }
});

test('EDI-103: cookie attributes and prefix stripping', () => {
  assert.deepEqual(editionCookieOptions(true), { path: '/', maxAge: 31_536_000, sameSite: 'lax', secure: true });
  assert.equal(editionCookieOptions(false).secure, false);
  assert.equal(withoutEditionPrefix('/en/cgu'), '/cgu'); assert.equal(withoutEditionPrefix('/ar'), '/'); assert.equal(withoutEditionPrefix('/cgu'), '/cgu');
  assert.equal(withoutEditionPrefix('/english'), '/english');
});
