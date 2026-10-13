import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { AFRICA_FEEDS, WORLD_FEEDS_BY_EDITION } from './feeds';
import { getRadarRss, fetchSingleFeed, clearRssCacheForTesting, RSS_FEEDS } from './rss-collector';
import { getWorldDesk, clearWorldCacheForTesting, WORLD_FEEDS } from './world-desk';
import { detectCountryCode } from './country-detector';
import { africanMentions, inferWorldRegion } from './world-desk-data';
import { normalizeText } from './text-normalize';
import { normalizeSearchText, matchesRadarQuery, articleTopics } from './radar-topics';
import type { Edition } from './editions';

const at = Date.parse('2026-10-11T18:00:00Z');
const xml = (title: string, url: string) => `<rss><channel><item><title>${title}</title><link>https://example.org/${encodeURIComponent(url)}</link><pubDate>Sun, 11 Oct 2026 17:00:00 GMT</pubDate></item></channel></rss>`;

test('EDI-209: FR sans paramètre conserve exactement forme, contenu et ordre du moteur avant E2 sur les mêmes flux simulés', async t => {
  clearRssCacheForTesting(); clearWorldCacheForTesting(); t.mock.method(Date, 'now', () => at);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => new Response(`<rss><channel><item><title>Dakar Paris : politique</title><link>https://example.org/${encodeURIComponent(String(url))}</link><pubDate>Sun, 11 Oct 2026 17:00:00 GMT</pubDate><category>Politique</category></item><item><title>Bamako</title><link>https://example.org/undated/${encodeURIComponent(String(url))}</link></item></channel></rss>`));
  const baseline = JSON.parse(readFileSync('src/lib/fixtures/editions/fr-collector-before-e2.json', 'utf8'));
  try {
    assert.deepEqual({ rss: await getRadarRss(), world: await getWorldDesk() }, baseline);
  } finally { clearRssCacheForTesting(); clearWorldCacheForTesting(); }
});

test('EDI-201: registres complets, identifiants uniques, origines, RT Arabic et exception HTTP explicite', () => {
  const feeds = [...Object.values(AFRICA_FEEDS).flat(), ...Object.values(WORLD_FEEDS_BY_EDITION).flat()];
  assert.equal(new Set(feeds.map(f => f.id)).size, feeds.length);
  assert.equal(RSS_FEEDS, AFRICA_FEEDS.fr); assert.equal(WORLD_FEEDS, WORLD_FEEDS_BY_EDITION.fr);
  assert.equal(RSS_FEEDS[0].id, 'aps'); assert.equal(RSS_FEEDS.filter(f => f.editorialScope === 'international').length, 6);
  assert.deepEqual(Object.values(AFRICA_FEEDS).map(f => f.length), [21, 66, 28]);
  assert.deepEqual(Object.values(WORLD_FEEDS_BY_EDITION).map(f => f.length), [15, 19, 13]);
  for (const f of feeds) {
    assert.ok(f.origin.trim());
    assert.ok(f.edition === 'fr' || f.id.startsWith(f.edition + '-'));
    assert.ok(f.url.startsWith('https://') || f.url === 'http://times.co.sz/feed/');
  }
  assert.equal(WORLD_FEEDS_BY_EDITION.ar.find(f => f.name === 'RT Arabic')?.origin, "Russie · média d'État");
});

test('EDI-202: collectes concurrentes FR/EN, dédoublonnage en cours, ordre et caches isolés, huit lectures au plus par édition', async t => {
  clearRssCacheForTesting(); t.mock.method(Date, 'now', () => at);
  const map = new Map(Object.values(AFRICA_FEEDS).flat().map(f => [f.url, f]));
  const active = { fr: 0, en: 0, ar: 0 }, peaks = { ...active }, calls = { ...active };
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const f = map.get(String(input))!; calls[f.edition]++; peaks[f.edition] = Math.max(peaks[f.edition], ++active[f.edition]);
    await new Promise(resolve => setImmediate(resolve)); active[f.edition]--;
    return new Response(xml(f.edition === 'en' ? 'Lagos election' : 'Dakar politique', String(input)));
  });
  try {
    const [fr, en, enAgain] = await Promise.all([getRadarRss(), getRadarRss({ edition: 'en' }), getRadarRss({ edition: 'en' })]);
    assert.deepEqual(enAgain, en); assert.ok(fr.articles.every(a => a.id.startsWith('aps-') || !a.id.startsWith('en-')));
    assert.ok(en.articles.every(a => a.id.startsWith('en-')));
    assert.equal(calls.fr, AFRICA_FEEDS.fr.filter(f => f.enabled).length); assert.equal(calls.en, AFRICA_FEEDS.en.filter(f => f.enabled).length);
    assert.equal(peaks.fr, 8); assert.equal(peaks.en, 8);
    const before = { ...calls }; assert.deepEqual(await getRadarRss({ edition: 'fr' }), fr); await getRadarRss({ edition: 'en' }); assert.deepEqual(calls, before);
    assert.deepEqual(fr.sources.map(f => f.id), RSS_FEEDS.filter(f => f.enabled).map(f => f.id));
  } finally { clearRssCacheForTesting(); }
});

test('EDI-202: 304 avec validateurs, nouveau dernier succès puis repli 45 min, sans contamination d’édition', async t => {
  let now = at, mode: 'ok' | '304' | 'fail' = 'ok'; clearRssCacheForTesting(); t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    if (mode === 'fail') throw new Error('offline');
    if (mode === '304') { const h = new Headers(options?.headers); assert.equal(h.get('if-none-match'), '"version-1"'); assert.equal(h.get('if-modified-since'), 'Sun, 11 Oct 2026 17:00:00 GMT'); return new Response(null, { status: 304 }); }
    return new Response(xml('Dakar', String(input)), { headers: { etag: '"version-1"', 'last-modified': 'Sun, 11 Oct 2026 17:00:00 GMT' } });
  });
  try {
    const first = await getRadarRss(); now += 40 * 60_000; mode = '304'; const refreshed = await getRadarRss();
    assert.deepEqual(refreshed.articles, first.articles); assert.equal(refreshed.stale, false); assert.equal(refreshed.updatedAt, new Date(now).toISOString());
    now += 10 * 60_000; mode = 'fail'; const stale = await getRadarRss(); assert.equal(stale.stale, true); assert.deepEqual(stale.articles, first.articles);
    assert.equal(stale.availability![0].lastSuccessAt, refreshed.updatedAt);
    await assert.rejects(getRadarRss({ edition: 'en' }), { code: 'LIVE_RSS_UNAVAILABLE' });
    now += 36 * 60_000; await assert.rejects(getRadarRss(), { code: 'LIVE_RSS_UNAVAILABLE' });
  } finally { clearRssCacheForTesting(); }
});

test('EDI-202: deux rédactions homonymes gardent chacune leur disponibilité (The Citizen TZ/ZA)', async t => {
  clearRssCacheForTesting(); t.mock.method(Date, 'now', () => at);
  const sources = AFRICA_FEEDS.en.filter(f => f.name === 'The Citizen');
  const failed = sources.find(f => f.defaultCountry === 'ZA')!;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    if (String(input) === failed.url) throw new Error('offline');
    return new Response(xml('African news', String(input)));
  });
  try {
    const snapshot = await getRadarRss({ edition: 'en' });
    const unavailable = snapshot.sources.find(s => s.id === failed.id)!;
    assert.equal(unavailable.count, 0); assert.equal(unavailable.availability?.status, 'unavailable');
    const healthy = snapshot.sources.find(s => s.id === sources.find(f => f.defaultCountry === 'TZ')!.id)!;
    assert.equal(healthy.count, 1); assert.equal(healthy.availability?.status, 'available');
  } finally { clearRssCacheForTesting(); }
});

test('EDI-201/202: les généralistes du bouquet africain gardent les titres parlant de l’Afrique ; FR reste intact', async t => {
  clearRssCacheForTesting(); t.mock.method(Date, 'now', () => at);
  t.mock.method(globalThis, 'fetch', async () => new Response(xml('Nigeria elections', 'africa') + xml('Washington election', 'world')));
  try {
    const en = AFRICA_FEEDS.en.find(f => f.name === 'Al Jazeera English')!;
    assert.equal(en.africaOnly, true);
    assert.deepEqual((await fetchSingleFeed(en)).map(a => a.title), ['Nigeria elections']);
    assert.equal((await fetchSingleFeed(RSS_FEEDS[0])).length, 2);
  } finally { clearRssCacheForTesting(); }
});

test('EDI-202/208: monde FR/AR isolé, généraliste arabe sur Gaza/Kyiv, titre sans indice écarté et 304 réutilisé', async t => {
  clearWorldCacheForTesting(); t.mock.method(Date, 'now', () => at);
  let mode = 'ok';
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => mode === '304' ? new Response(null, { status: 304 }) : new Response(
    xml('قصف على غزة', String(input) + 'gaza') + xml('محادثات في كييف', String(input) + 'kyiv') + xml('افتتاح معرض جديد', String(input) + 'none'), { headers: { etag: 'v1' } }));
  try {
    const [fr, ar] = await Promise.all([getWorldDesk(), getWorldDesk({ edition: 'ar' })]);
    assert.ok(fr.articles.every(a => !a.id.startsWith('ar-'))); assert.equal(ar.articles.length, 26);
    assert.ok(ar.articles.every(a => a.region === 'moyen-orient' || a.region === 'europe'));
    mode = '304'; assert.deepEqual(await getWorldDesk({ edition: 'ar', forceRefresh: true }), ar);
    assert.equal(await getWorldDesk(), fr);
  } finally { clearWorldCacheForTesting(); }
});

type Row = { id: string; title: string; country: string | null; accept?: string[]; trap?: string; feedCountry?: string | null; basis?: string; role?: string; sourceRegion?: string | null; region?: string | null; regionAccept?: (string | null)[]; africa?: string[]; touchesAfrica?: boolean };
for (const edition of ['en', 'ar'] as const) {
  const fixture = JSON.parse(readFileSync(`src/lib/fixtures/editions/titles-${edition}.json`, 'utf8')) as { titles: Row[]; traps: Row[] };
  const correct = (row: Row) => { const value = detectCountryCode(row.title, row.feedCountry ?? null, edition); return value === row.country || row.accept?.includes(value ?? '') === true; };
  test(`EDI-206: ${edition}, >=90% sur les titres réels et sur les pays nommés, zéro erreur sur les pièges`, () => {
    for (const rows of [fixture.titles, fixture.titles.filter(r => r.basis === 'title')]) {
      const misses = rows.filter(r => !correct(r));
      assert.ok((rows.length - misses.length) / rows.length >= .9, JSON.stringify(misses));
    }
    for (const row of [...fixture.traps, ...fixture.titles.filter(r => r.trap)]) assert.ok(correct(row), row.id + ': ' + row.title);
    for (const row of fixture.titles.filter(r => r.role === 'world')) {
      const mentions = africanMentions(row.title, edition);
      assert.deepEqual([...mentions.countries].sort(), [...row.africa!].sort(), row.id);
      assert.equal(mentions.touchesAfrica, row.touchesAfrica, row.id);
    }
  });
}
test('EDI-206/208: frontières arabes et régions sans sous-chaînes, ambiguïtés explicites', () => {
  assert.equal(normalizeText('إِفْرِيقِيَّةـ ٢٠۲۶', 'ar'), 'افريقيه 2026');
  assert.equal(detectCountryCode('مصرف ومصرع ومالية وماليا وماليزي', null, 'ar'), null);
  assert.equal(detectCountryCode('القمة بالجزائر', null, 'ar'), 'DZ');
  assert.equal(detectCountryCode('بالمغرب', null, 'ar'), 'MA');
  assert.equal(detectCountryCode('Papua New Guinea floods', null, 'en'), null);
  assert.equal(inferWorldRegion('اتفاق لوقف إطلاق النار في غزة', 'ar'), 'moyen-orient');
  assert.equal(inferWorldRegion('محادثات جديدة في كييف', 'ar'), 'europe');
  assert.equal(inferWorldRegion('افتتاح معرض جديد', 'ar'), null);
});
test('EDI-207: recherche arabe effective, chiffres/accents/proclitiques et rubriques par langue', () => {
  const article = { title: 'انتخابات رئاسية بالجزائر في ٢٠٢٦', domain: 'example.org', sourceName: 'صحيفة', category: '' };
  assert.notEqual(normalizeSearchText('الجزائر', 'ar').trim(), '');
  assert.equal(matchesRadarQuery(article, 'الجزائر 2026', undefined, 'ar'), true);
  assert.equal(matchesRadarQuery({ ...article, title: 'الجزائر' }, 'بالجزائر', undefined, 'ar'), true);
  assert.equal(matchesRadarQuery(article, 'تونس', undefined, 'ar'), false);
  assert.equal(matchesRadarQuery({ ...article, title: 'مصرف ليبيا' }, 'مصر', undefined, 'ar'), false);
  assert.deepEqual(articleTopics(article, 'ar'), ['politique']);
  assert.deepEqual(articleTopics({ title: 'Inflation and elections as army attacks', category: '' }, 'en'), ['politique', 'economie', 'securite']);
  assert.deepEqual(articleTopics({ title: 'كرة القدم: كأس أمم أفريقيا', category: '' }, 'ar'), ['sport']);
  for (const edition of ['en', 'ar'] as Edition[]) assert.deepEqual(articleTopics({ title: 'Canary artisticity armedness مصرف', category: '' }, edition), []);
});
