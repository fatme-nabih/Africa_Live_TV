import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { categoryCodes } from '../../src/lib/catalog-metadata';

// Catalogue, favoris et lecture simulés : les parcours TV de P2 ne dépendent ni des flux amont ni de l'état de la base.
export type FixtureChannel = {
  id: string;
  name: string;
  countryCode: string | null;
  groupTitle: string | null;
  logoUrl: string | null;
  playbackMode: 'BROWSER' | 'EXTERNAL';
  availabilityStatus: 'READY';
};

const channel = (id: string, name: string, countryCode: string | null, groupTitle: string | null, extra: Partial<FixtureChannel> = {}): FixtureChannel => ({
  id, name, countryCode, groupTitle, logoUrl: null, playbackMode: 'BROWSER', availabilityStatus: 'READY', ...extra,
});

export const LOGO_HOST = 'https://logos.fixture.test';

export const FIXTURE_CHANNELS: FixtureChannel[] = [
  channel('sn-1', 'Alpha Sénégal', 'SN', 'News', { logoUrl: `${LOGO_HOST}/alpha.png` }),
  channel('sn-2', 'Beta Sénégal', 'SN', 'Sports'),
  channel('sn-3', 'Gamma Sénégal', 'SN', 'Music'),
  channel('sn-4', 'Delta Sénégal', 'SN', 'Undefined'),
  channel('ci-1', 'Canal Ivoire', 'CI', 'Business;News'),
  channel('ma-1', '2M Monde', 'MA', 'News'),
  channel('ma-2', '2M Monde', 'MA', 'News'),
  channel('fr-1', 'Zeta France', 'FR', 'News', { playbackMode: 'EXTERNAL' }),
];

const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/** Simule /api/filters, /api/favorites, /api/channels (accueil par rangées compris) et les logos de chaînes. */
export async function fixtureCatalog(page: Page, options: { favorites?: string[]; channels?: FixtureChannel[] } = {}) {
  const channels = options.channels ?? FIXTURE_CHANNELS;
  const favorites = new Set(options.favorites ?? []);
  const requests: Array<Record<string, unknown>> = [];
  const logoRequests: string[] = [];
  await page.route('**/api/filters', route => route.fulfill({ json: { countries: ['SN', 'CI', 'MA', 'FR'], groups: ['News', 'Sports', 'Music', 'Business;News', 'Undefined'], languages: ['fr'], statuses: [] } }));
  await page.route('**/api/favorites', async route => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      for (const id of body.add ?? []) favorites.add(id);
      for (const id of body.remove ?? []) favorites.delete(id);
    }
    await route.fulfill({ json: { favorites: [...favorites] } });
  });
  await page.route('**/api/channels', async route => {
    const body = route.request().postDataJSON();
    requests.push(body);
    const rows = channels.filter(item =>
      (!body.search || item.name.toLowerCase().includes(String(body.search).toLowerCase())) &&
      (!body.country || item.countryCode === body.country) &&
      (!body.group || categoryCodes(item.groupTitle).includes(body.group)) &&
      (!body.favoritesOnly || favorites.has(item.id)));
    const limit = Number(body.limit ?? 30);
    const start = Number(body.cursor ?? 0);
    const slice = rows.slice(start, start + limit);
    const hasMore = start + limit < rows.length;
    await route.fulfill({ json: { channels: slice, hasMore, limit, canPlay: true, nextCursor: hasMore ? String(start + limit) : null } });
  });
  await page.route(`${LOGO_HOST}/**`, route => {
    logoRequests.push(route.request().url());
    return route.fulfill({ body: PIXEL, contentType: 'image/png' });
  });
  return { requests, logoRequests, favorites };
}

/** Requêtes d'une rangée d'accueil : 12 chaînes, jamais la page de 30 du catalogue complet. */
export const rowRequests = (requests: Array<Record<string, unknown>>) => requests.filter(request => request.limit === 12);

export function resolved(channelId: string, sourceUrl: string, name = 'Chaîne de test') {
  return { playbackSessionId: randomUUID(), attemptId: randomUUID(), channel: { id: channelId, name }, sourceUrl };
}

/** VLC et télémétrie simulés ; retourne la liste des lancements demandés. */
export async function mockVlc(page: Page) {
  const intents: Array<{ channelId: string; launchId: string }> = [];
  await page.route('**/api/open-vlc', async route => {
    intents.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, json: { ok: true } });
  });
  await page.route('**/api/playback-events', route => route.fulfill({ status: 200, json: { ok: true } }));
  return intents;
}

/** Sert les segments HLS synthétiques ; retourne les fichiers réclamés (pour prouver qu'aucun segment n'est chargé avant le clic). */
export async function serveVideo(page: Page) {
  const served: string[] = [];
  await page.route('https://media.fixture.test/**', async route => {
    const name = path.basename(new URL(route.request().url()).pathname);
    served.push(name);
    const body = await readFile(path.join(process.cwd(), 'e2e/fixtures/hls', name));
    await route.fulfill({
      body,
      contentType: name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : name.endsWith('.mp4') ? 'video/mp4' : 'video/mp2t',
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  });
  return served;
}

/** Résolution de lecture : les identifiants listés exigent VLC, tous les autres se lisent dans le navigateur. */
export async function mockResolutions(page: Page, options: { external?: string[] } = {}) {
  const resolutions: string[] = [];
  await page.route('**/api/playback/resolutions', async route => {
    const { channelId } = route.request().postDataJSON();
    resolutions.push(channelId);
    if (options.external?.includes(channelId)) {
      await route.fulfill({ status: 409, json: { error: 'Lecteur externe requis.', code: 'WEB_PLAYBACK_UNAVAILABLE' } });
      return;
    }
    const name = FIXTURE_CHANNELS.find(item => item.id === channelId)?.name ?? 'Chaîne de test';
    await route.fulfill({ json: resolved(channelId, 'https://media.fixture.test/index.m3u8', name) });
  });
  return resolutions;
}
