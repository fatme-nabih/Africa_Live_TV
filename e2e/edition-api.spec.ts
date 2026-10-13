import { expect, test } from '@playwright/test';
import { RSS_FEEDS } from '../src/lib/rss-collector';

const mvp = process.env.LOCAL_DEV_MODE === 'true';
// Une édition activée par EDITIONS (build et serveur) répond ; toute autre valeur reste refusée en privé.
const active = (process.env.EDITIONS ?? '').split(',').map(edition => edition.trim());
for (const name of ['rss', 'world', 'briefing']) {
  test(`EDI-203: ${name}, édition indisponible reste privée et ne contourne pas l’accès`, async ({ request }) => {
    for (const query of ['', '?edition=en', '?edition=ar', '?edition=invalid']) {
      if (mvp && (query === '' || ['en', 'ar'].some(edition => query === `?edition=${edition}` && active.includes(edition)))) continue;
      const response = await request.get(`/api/live/${name}${query}`);
      expect(response.status()).toBe(mvp ? 400 : 401);
      expect((await response.json()).code).toBe(mvp ? 'EDITION_UNAVAILABLE' : 'AUTHENTICATION_REQUIRED');
      if (mvp) expect(response.headers()['cache-control']).toBe('private, no-store');
    }
  });
}
test('EDI-209: API RSS réelle en MVP, FR implicite et explicite conservent les sources et leurs articles', async ({ request }) => {
  test.skip(!mvp, 'Réception privée locale ; les refus Clerk sont reçus séparément');
  test.setTimeout(60_000);
  const implicit = await request.get('/api/live/rss?limit=2', { timeout: 30_000 });
  expect(implicit.status()).toBe(200); expect(implicit.headers()['cache-control']).toBe('private, no-store');
  const first = await implicit.json();
  expect(first.sources.map((s: { id: string }) => s.id)).toEqual(RSS_FEEDS.filter(f => f.enabled).map(f => f.id));
  const explicit = await request.get('/api/live/rss?edition=fr&limit=2');
  expect(explicit.status()).toBe(200);
  const second = await explicit.json();
  expect(second.articles).toEqual(first.articles); expect(second.sources).toEqual(first.sources);
  expect(second.updatedAt).toBe(first.updatedAt);
});

test('EDI-601: pont réel en MVP, comptes EN tirés du seul cache EN valide ; absent avec la seule édition française', async ({ request }) => {
  test.skip(!mvp, 'Réception privée locale ; les refus Clerk sont reçus séparément');
  test.setTimeout(90_000);
  if (!active.includes('en')) {
    const body = await (await request.get('/api/live/rss?limit=2', { timeout: 30_000 })).json();
    expect(body.bridge).toBeUndefined();
    return;
  }
  const english = await request.get('/api/live/rss?edition=en&limit=2', { timeout: 60_000 });
  expect(english.status()).toBe(200);
  const englishBody = await english.json();
  const french = await (await request.get('/api/live/rss?limit=2', { timeout: 30_000 })).json();
  const bridge = (french.bridge ?? []).find((entry: { edition: string }) => entry.edition === 'en');
  expect(bridge).toBeTruthy();
  expect(bridge.updatedAt).toBe(englishBody.updatedAt);
  expect(Object.keys(bridge.counts).length).toBeGreaterThan(0);
  for (const [code, count] of Object.entries(bridge.counts)) { expect(code).toMatch(/^[A-Z]{2}$/); expect(Number.isInteger(count) && (count as number) > 0).toBe(true); }
  expect((french.bridge ?? []).every((entry: { edition: string }) => entry.edition !== 'fr')).toBe(true);
});
