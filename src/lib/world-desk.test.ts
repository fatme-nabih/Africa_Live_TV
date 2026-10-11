import test from 'node:test';
import assert from 'node:assert/strict';
import { africanMentions, inferWorldRegion, parseWorldSnapshot } from './world-desk-data';
import { clearWorldCacheForTesting, getWorldDesk, WORLD_FEEDS } from './world-desk';

test('the region of a general-news title follows its strongest geographic signal, never a guess on a tie', () => {
  assert.equal(inferWorldRegion('Furieux contre Zelensky, Trump veut un nouveau président en Ukraine'), 'europe');
  assert.equal(inferWorldRegion('Un puissant séisme secoue le Panama'), 'ameriques');
  assert.equal(inferWorldRegion('Riyad : évacuations après une attaque attribuée aux Houthis'), 'moyen-orient');
  assert.equal(inferWorldRegion('Des milliers d’arrestations à New Delhi'), 'asie-pacifique');
  assert.equal(inferWorldRegion('Trump reçoit Xi Jinping'), null, 'one Americas signal against one Asia signal is a tie');
  assert.equal(inferWorldRegion('Prix Nobel de la paix : la lauréate récompensée'), null);
});

test('African mentions are strict: longest country names win and ambiguous words are not countries', () => {
  assert.deepEqual(africanMentions('Élections en Guinée-Bissau').countries, ['GW']);
  assert.deepEqual(africanMentions('La Guinée et le Niger signent avec le Nigeria').countries.sort(), ['GN', 'NE', 'NG']);
  assert.deepEqual(africanMentions('Kinshasa accuse Kigali, la RDC saisit l’ONU').countries.sort(), ['CD']);
  assert.deepEqual(africanMentions('Prix Nobel : la Sud-Africaine Navanethem Pillay récompensée').countries, ['ZA']);
  assert.deepEqual(africanMentions('Maurice Lévy quitte Publicis').countries, [], 'a first name is not Mauritius');
  assert.equal(africanMentions('Maurice Lévy quitte Publicis').touchesAfrica, false);
  assert.deepEqual(africanMentions('Tempête sur l’île Maurice').countries, ['MU']);
  assert.equal(africanMentions('Victoria Beckham à Londres').touchesAfrica, false);
  const continent = africanMentions('Des contraceptifs destinés à plusieurs pays africains bloqués en Belgique');
  assert.deepEqual(continent, { countries: [], touchesAfrica: true });
  assert.equal(africanMentions('Sommet de l’Union africaine').touchesAfrica, true);
});

const now = Date.parse('2026-10-11T08:00:00Z');
const article = (over: Record<string, unknown> = {}) => ({ id: 'a', title: 'Titre', url: 'https://example.test/a?utm_source=x', sourceName: 'RFI', origin: 'France',
  publishedAt: '2026-10-11T07:00:00Z', region: 'europe', regionBasis: 'source', africanCountries: [], touchesAfrica: false, ...over });

test('the client snapshot drops invalid rows, unsafe links, unknown codes, stale envelopes and old news', () => {
  const parsed = parseWorldSnapshot({ updatedAt: '2026-10-11T07:59:00Z', availability: [], articles: [
    article(), article({ id: 'b', url: 'javascript:alert(1)' }), article({ id: 'c', region: 'mars' }), article({ id: 'd', region: null, africanCountries: ['SN', 'XX'] }),
    article({ id: 'e', publishedAt: '2026-10-09T07:00:00Z' }), article({ id: 'f', title: '' }) ] }, now)!;
  assert.deepEqual(parsed.articles.map(item => item.id), ['a', 'd']);
  assert.equal(parsed.articles[0].url, 'https://example.test/a');
  assert.deepEqual(parsed.articles[1].africanCountries, ['SN']); assert.equal(parsed.articles[1].touchesAfrica, true);
  assert.equal(parseWorldSnapshot({ updatedAt: '2026-10-11T03:00:00Z', articles: [] }, now), null, 'older than two hours');
  assert.equal(parseWorldSnapshot({ updatedAt: '2026-10-11T09:00:00Z', articles: [] }, now), null, 'future');
  assert.equal(parseWorldSnapshot({ articles: 'x', updatedAt: '2026-10-11T07:59:00Z' }, now), null);
});

const rss = (items: [string, string][]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items.map(([title, link]) =>
  `<item><title>${title}</title><link>${link}</link><pubDate>${new Date(now - 3600_000).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;

test('the collector keeps editor regions, infers general feeds, keeps only African stories without region, deduplicates, and survives outages', async t => {
  clearWorldCacheForTesting();
  let down = false;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input);
    if (down || url.includes('lemonde')) throw new Error('offline');
    if (url.includes('rfi.fr/fr/europe')) return new Response(rss([['Berlin et Paris discutent', 'https://rfi.test/1'], ['Doublon', 'https://same.test/x']]));
    if (url.includes('radio-canada')) return new Response(rss([['Séisme au Panama', 'https://rc.test/1'], ['La Sud-Africaine Pillay récompensée', 'https://rc.test/2'], ['Un concert ce soir', 'https://rc.test/3'], ['Doublon', 'https://same.test/x']]));
    return new Response(rss([]));
  });
  try {
    const first = await getWorldDesk();
    const byUrl = new Map(first.articles.map(item => [item.url, item]));
    assert.equal(byUrl.get('https://rfi.test/1')?.region, 'europe'); assert.equal(byUrl.get('https://rfi.test/1')?.regionBasis, 'source');
    assert.equal(byUrl.get('https://rc.test/1')?.region, 'ameriques'); assert.equal(byUrl.get('https://rc.test/1')?.regionBasis, 'inferred');
    assert.equal(byUrl.get('https://rc.test/2')?.region, null); assert.deepEqual(byUrl.get('https://rc.test/2')?.africanCountries, ['ZA']);
    assert.equal(byUrl.has('https://rc.test/3'), false, 'no region and no Africa: not shown');
    assert.equal(first.articles.filter(item => item.url === 'https://same.test/x').length, 1);
    assert.equal(byUrl.get('https://same.test/x')?.sourceName, 'RFI', 'the regional desk wins over the general feed');
    assert.equal(first.availability.filter(source => source.status === 'unavailable').length, 4, 'the four Le Monde desks are reported down');
    assert.equal(first.availability.length, WORLD_FEEDS.length);
    down = true;
    const retained = await getWorldDesk({ forceRefresh: true });
    assert.equal(retained.articles.length, first.articles.length); assert.ok(retained.availability.some(source => source.status === 'stale'));
    clearWorldCacheForTesting();
    await assert.rejects(getWorldDesk(), /injoignables/);
  } finally { clearWorldCacheForTesting(); }
});

test('every world feed is https, unique, and distinct from the African collector', async () => {
  const { RSS_FEEDS } = await import('./rss-collector');
  const african = new Set(RSS_FEEDS.map(feed => feed.url));
  for (const feed of WORLD_FEEDS) { assert.ok(feed.url.startsWith('https://'), feed.id); assert.ok(!african.has(feed.url), feed.id); }
  assert.equal(new Set(WORLD_FEEDS.map(feed => feed.id)).size, WORLD_FEEDS.length);
});
