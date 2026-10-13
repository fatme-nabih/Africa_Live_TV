import assert from 'node:assert/strict';
import test from 'node:test';
import { BRIDGE_CURRENT_BELOW, BRIDGE_OTHER_AT_LEAST, countryCountsFromArticles, parseEditionBridge, pickEditionBridge, type EditionBridgeEntry } from './edition-bridge';
import { consumeEditionHalo, EDITION_CHANGE_KEY, editionSphere, markEditionChange } from './edition-halo';
import { accountEditionToApply, chooseEdition, cookieEdition } from './edition-client';
import { clearRssCacheForTesting, editionBridgeCounts, getRadarRss } from './rss-collector';
import { AFRICA_FEEDS } from './feeds';
import { fr } from '@/i18n/fr';
import { en } from '@/i18n/en';
import { ar } from '@/i18n/ar';
import { formatPlural } from '@/i18n/message';

const at = Date.parse('2026-10-13T12:00:00.000Z');
const entry = (edition: EditionBridgeEntry['edition'], counts: Record<string, number>): EditionBridgeEntry => ({ edition, counts, updatedAt: new Date(at).toISOString() });

test('EDI-601: seuils du pont (< 3 dans l’édition courante, ≥ 5 dans une autre), édition la plus fournie, éditions actives seulement', () => {
  assert.equal(BRIDGE_CURRENT_BELOW, 3); assert.equal(BRIDGE_OTHER_AT_LEAST, 5);
  const bridge = [entry('en', { NG: 12, SN: 5, CI: 4 }), entry('ar', { NG: 7, DZ: 30 })];
  assert.deepEqual(pickEditionBridge(bridge, 'NG', 2, 'fr', ['fr', 'en', 'ar']), { edition: 'en', count: 12 });
  assert.deepEqual(pickEditionBridge(bridge, 'NG', 0, 'fr', ['fr', 'ar']), { edition: 'ar', count: 7 });
  assert.deepEqual(pickEditionBridge(bridge, 'SN', 0, 'fr', ['fr', 'en', 'ar']), { edition: 'en', count: 5 });
  assert.equal(pickEditionBridge(bridge, 'NG', 3, 'fr', ['fr', 'en', 'ar']), null, 'trois dépêches suffisent : pas de pont');
  assert.equal(pickEditionBridge(bridge, 'CI', 0, 'fr', ['fr', 'en', 'ar']), null, 'quatre dépêches ailleurs : pas de pont');
  assert.equal(pickEditionBridge(bridge, 'DZ', 0, 'ar', ['fr', 'en', 'ar']), null, 'jamais vers l’édition courante');
  assert.equal(pickEditionBridge(bridge, null, 0, 'fr', ['fr', 'en', 'ar']), null);
  assert.equal(pickEditionBridge(undefined, 'NG', 0, 'fr', ['fr', 'en', 'ar']), null);
});

test('EDI-601: contrat reçu contrôlé ; fenêtre de 24 h identique au fil', () => {
  assert.deepEqual(parseEditionBridge([{ edition: 'en', counts: { NG: 6, ng: 3, XX1: 2, SN: 0, CI: 1.5, GH: '4' }, updatedAt: 'x' }, { edition: 'es', counts: {}, updatedAt: 'x' }, { edition: 'ar', counts: { DZ: 9 } }, null], ['fr', 'en', 'ar']),
    [{ edition: 'en', counts: { NG: 6 }, updatedAt: 'x' }]);
  assert.deepEqual(parseEditionBridge([{ edition: 'en', counts: { NG: 6 }, updatedAt: 'x' }], ['fr']), []);
  assert.deepEqual(parseEditionBridge('not an array', ['fr', 'en']), []);
  const iso = (hours: number) => new Date(at - hours * 3_600_000).toISOString();
  assert.deepEqual(countryCountsFromArticles([
    { countryCode: 'NG', publishedAt: iso(1) }, { countryCode: 'NG', publishedAt: iso(23) }, { countryCode: 'NG', publishedAt: iso(25) },
    { countryCode: 'NG', publishedAt: null }, { countryCode: 'GH', publishedAt: iso(-1) }, { countryCode: null, publishedAt: iso(2) }, { countryCode: 'GH', publishedAt: iso(3) },
  ], at), { NG: 2, GH: 1 });
});

test('EDI-601: comptes tirés des seuls caches valides des autres éditions, sans aucune collecte déclenchée', async t => {
  let now = at, calls = 0;
  clearRssCacheForTesting(); t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    calls++;
    return new Response(`<rss><channel><item><title>Lagos traffic and markets</title><link>https://example.org/${encodeURIComponent(String(input))}</link><pubDate>Tue, 13 Oct 2026 11:00:00 GMT</pubDate></item></channel></rss>`);
  });
  try {
    assert.deepEqual(editionBridgeCounts('fr', ['fr', 'en', 'ar']), [], 'aucun cache : rien, et aucune lecture');
    assert.equal(calls, 0);
    const english = await getRadarRss({ edition: 'en' });
    const afterCollect = calls;
    assert.equal(afterCollect, AFRICA_FEEDS.en.filter(feed => feed.enabled).length);
    const [bridge, ...rest] = editionBridgeCounts('fr', ['fr', 'en', 'ar']);
    assert.equal(rest.length, 0, 'l’arabe sans cache valide est absent');
    assert.equal(bridge.edition, 'en');
    assert.equal(bridge.updatedAt, english.updatedAt);
    assert.equal(Object.values(bridge.counts).reduce((sum, count) => sum + count, 0), english.articles.filter(article => article.countryCode).length);
    assert.ok((bridge.counts.NG ?? 0) >= 1);
    assert.deepEqual(editionBridgeCounts('en', ['fr', 'en', 'ar']), [], 'jamais l’édition demandée elle-même');
    assert.deepEqual(editionBridgeCounts('fr', ['fr']), [], 'édition inactive ignorée');
    assert.equal(calls, afterCollect, 'lire le pont ne lance aucune collecte');
    now += 5 * 60_000;
    assert.deepEqual(editionBridgeCounts('fr', ['fr', 'en', 'ar']), [], 'cache expiré : absent');
    assert.equal(calls, afterCollect);
  } finally { clearRssCacheForTesting(); }
});

test('EDI-601: textes du pont dans les trois éditions, gabarits et pluriels arabes', () => {
  const values = { country: 'Nigeria', language: fr.radar.feed.bridgeLanguages.en };
  assert.equal(formatPlural(fr.radar.feed.bridge, 12, values, 'fr'), 'Nigeria se raconte surtout en anglais : 12 dépêches dans l’édition {edition}');
  assert.equal(formatPlural(en.radar.feed.bridge, 5, { country: 'Senegal', language: en.radar.feed.bridgeLanguages.fr }, 'en'), 'Senegal is mostly covered in French: 5 stories in the {edition} edition');
  assert.match(formatPlural(ar.radar.feed.bridge, 11, { country: 'نيجيريا', language: ar.radar.feed.bridgeLanguages.en }, 'ar'), /^تُروى أخبار نيجيريا أكثر بالإنجليزية: 11 خبرًا في نسخة \{edition\}$/);
  for (const dictionary of [fr, en, ar]) for (const message of Object.values(dictionary.radar.feed.bridge)) assert.ok(message.includes('{edition}') && message.includes('{country}') && message.includes('{language}'));
});

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('EDI-602: sphère de l’édition et marque consommée une seule fois ; rien en Éco ou mouvement réduit', () => {
  const arabic = editionSphere('ar');
  for (const code of ['DZ', 'MA', 'EG', 'TN', 'EH', 'TD']) assert.ok(arabic.includes(code), code);
  assert.ok(!arabic.includes('SN')); assert.ok(editionSphere('fr').includes('SN')); assert.ok(editionSphere('en').includes('NG'));
  const storage = new MemoryStorage();
  assert.equal(consumeEditionHalo('ar', storage, false), null, 'sans changement d’édition : pas de halo');
  markEditionChange('ar', storage);
  assert.deepEqual(consumeEditionHalo('ar', storage, false), arabic);
  assert.equal(consumeEditionHalo('ar', storage, false), null, 'une seule fois');
  markEditionChange('ar', storage);
  assert.equal(consumeEditionHalo('ar', storage, true), null, 'Éco ou mouvement réduit');
  assert.equal(storage.getItem(EDITION_CHANGE_KEY), null, 'marque retirée même sans animation');
  markEditionChange('en', storage);
  assert.equal(consumeEditionHalo('fr', storage, false), null, 'marque d’une autre édition');
  assert.equal(storage.getItem(EDITION_CHANGE_KEY), null);
  const refused = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  markEditionChange('ar', refused);
  assert.equal(consumeEditionHalo('ar', refused, false), null);
  assert.equal(consumeEditionHalo('ar', null, false), null);
});

function fakeBrowser(href = 'http://localhost:3001/app/live?country=SN') {
  const cookies: string[] = [], assigned: string[] = [], requests: { url: string; init: RequestInit }[] = [];
  const session = new MemoryStorage();
  const browser = {
    document: { set cookie(value: string) { cookies.push(value); } },
    location: { href, protocol: 'http:', assign: (url: string) => assigned.push(url) },
    sessionStorage: session,
    fetch: async (url: string, init: RequestInit) => { requests.push({ url, init }); return new Response('{}'); },
  };
  return { browser: browser as unknown as Window, cookies, assigned, requests, session };
}

test('EDI-601/602/603: le geste pose le cookie, la marque du halo, mémorise le compte connu puis navigue', () => {
  const connected = fakeBrowser();
  chooseEdition('en', connected.browser, { owner: 'account:u1' });
  assert.deepEqual(connected.cookies, ['al_edition=en; Path=/; Max-Age=31536000; SameSite=Lax']);
  assert.equal(connected.session.getItem(EDITION_CHANGE_KEY), 'en');
  assert.deepEqual(connected.assigned, ['/app/live?country=SN']);
  assert.equal(connected.requests.length, 1);
  assert.equal(connected.requests[0].url, '/api/edition-preference');
  assert.equal(connected.requests[0].init.method, 'PUT');
  assert.equal(connected.requests[0].init.keepalive, true);
  assert.deepEqual(JSON.parse(String(connected.requests[0].init.body)), { edition: 'en', owner: 'account:u1' });
  const bridge = fakeBrowser('http://localhost:3001/app/live');
  chooseEdition('ar', bridge.browser, { owner: null, target: '/app/live?country=DZ' });
  assert.deepEqual(bridge.assigned, ['/app/live?country=DZ']);
  assert.equal(bridge.requests.length, 0, 'visiteur ou compte non confirmé : rien n’est envoyé');
  const visitor = fakeBrowser('http://localhost:3001/en/cgu');
  chooseEdition('fr', visitor.browser);
  assert.deepEqual(visitor.assigned, ['/cgu']);
  assert.equal(visitor.requests.length, 0);
});

test('EDI-603: l’édition du compte s’applique seulement sur un appareil sans cookie, active et différente', () => {
  assert.equal(cookieEdition('a=1; al_edition=ar; b=2'), 'ar');
  assert.equal(cookieEdition('al_edition=es'), null);
  assert.equal(cookieEdition(''), null);
  assert.equal(accountEditionToApply('en', 'fr', ['fr', 'en'], 'theme=dark'), 'en');
  assert.equal(accountEditionToApply('en', 'fr', ['fr', 'en'], 'al_edition=fr'), null, 'choix de l’appareil prioritaire');
  assert.equal(accountEditionToApply('en', 'en', ['fr', 'en'], ''), null);
  assert.equal(accountEditionToApply('ar', 'fr', ['fr', 'en'], ''), null, 'édition inactive sur ce serveur');
  assert.equal(accountEditionToApply(null, 'fr', ['fr', 'en'], ''), null);
});
