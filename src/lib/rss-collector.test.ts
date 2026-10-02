import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearRssCacheForTesting,
  decodeXmlEntities,
  detectCountryCode,
  getRadarRss,
  parseFeedXml,
  RSS_FEEDS,
} from './rss-collector';
import type { FeedConfig } from './rss-collector-types';

test('RW-007: editorial scope belongs to the configured newsroom independently of XML subject', () => {
  for (const [id, category, expected] of [
    ['rfi_monde', 'Monde', 'international'], ['rfi', 'Afrique', 'international'],
    ['f24_afrique', 'Politique', 'international'], ['f24_monde', 'Politique', 'international'],
    ['bbc', 'Afrique', 'international'], ['lemonde_afrique', 'Afrique', 'international'],
    ['malijet', 'International', 'africa'], ['actu_cm', 'International', 'africa'],
  ]) {
    const feed = RSS_FEEDS.find(f => f.id === id)!;
    const [dated, undated] = parseFeedXml(`<rss><channel><item><title>Dakar</title><link>https://example.org/${id}</link><pubDate>Thu, 01 Oct 2026 17:00:00 GMT</pubDate><category>${category}</category></item><item><title>Bamako</title><link>https://example.org/${id}-unknown</link></item></channel></rss>`, feed);
    assert.equal(dated.category, category); assert.equal(dated.editorialScope, expected);
    assert.equal(undated.editorialScope, expected); assert.equal(undated.publishedAt, null);
  }
  assert.equal(RSS_FEEDS.filter(f => f.editorialScope === 'international').length, 6);
});

test('RW-007: duplicate Monde/Afrique URL keeps a deterministic newsroom scope and stable identity', async t => {
  clearRssCacheForTesting();
  const at = Date.parse('2026-10-01T17:30:00Z'); t.mock.method(Date, 'now', () => at);
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    const shared = String(url).includes('rfi.fr');
    return new Response(`<rss><channel><item><title>Dakar</title><link>https://example.org/${shared ? 'shared' : encodeURIComponent(String(url))}</link><pubDate>Thu, 01 Oct 2026 17:00:00 GMT</pubDate><category>Monde</category></item></channel></rss>`);
  });
  try {
    const first = await getRadarRss();
    const shared = first.articles.filter(a => a.url === 'https://example.org/shared');
    assert.equal(shared.length, 1); assert.equal(shared[0].editorialScope, 'international');
    assert.equal((await getRadarRss()).articles.find(a => a.url === shared[0].url)?.id, shared[0].id);
  } finally { clearRssCacheForTesting(); }
});

test('decodeXmlEntities unescapes entities, decodes CDATA and strips HTML tags', () => {
  assert.equal(
    decodeXmlEntities('<![CDATA[Économie &amp; Marché]]>'),
    'Économie & Marché',
  );
  assert.equal(
    decodeXmlEntities('<p>Le président &#171; <b>Macky</b> &#187; s&#39;exprime</p>'),
    "Le président « Macky » s'exprime",
  );
  assert.equal(
    decodeXmlEntities('Titre &quot;important&quot; &lt;alerte&gt;'),
    'Titre "important" <alerte>',
  );
});

test('detectCountryCode resolves countries by keywords and demonyms', () => {
  assert.equal(detectCountryCode('Diphtérie : 13 cas confirmés à Matam'), 'SN');
  assert.equal(detectCountryCode("Marché obligataire en Côte d'Ivoire"), 'CI');
  assert.equal(detectCountryCode('Sommet à Bamako sur la sécurité'), 'ML');
  assert.equal(detectCountryCode('Le Maroc inaugure un nouveau port à Casablanca'), 'MA');
  assert.equal(detectCountryCode('Élection présidentielle au Cameroun'), 'CM');
  assert.equal(detectCountryCode('Rencontre entre Tshisekedi et Kagame'), 'CD');
  assert.equal(detectCountryCode('Sommet de l Union Africaine', 'SN'), 'SN'); // Default fallback
  assert.equal(detectCountryCode('Sommet de l Union Africaine', null), null); // No fallback
});

test('parseFeedXml parses RSS 2.0 items accurately', () => {
  const feed: FeedConfig = {
    id: 'test-feed',
    name: 'Test News',
    domain: 'example.com',
    url: 'https://example.com/rss',
    defaultCountry: null,
    category: 'Général',
    editorialScope: 'africa',
    enabled: true,
  };

  const sampleRss = `
    <?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Exemple</title>
        <item>
          <title><![CDATA[Nouveau port à Dakar : investissement record]]></title>
          <link>https://example.com/articles/dakar-port?utm_source=rss&amp;utm_medium=feed</link>
          <pubDate>Wed, 30 Sep 2026 14:00:00 GMT</pubDate>
          <category>Infrastructure</category>
        </item>
        <item>
          <title>Article avec lien non sécurisé ignoré</title>
          <link>javascript:alert(1)</link>
        </item>
      </channel>
    </rss>
  `;

  const articles = parseFeedXml(sampleRss, feed);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, 'Nouveau port à Dakar : investissement record');
  assert.equal(articles[0].domain, 'example.com');
  assert.equal(articles[0].countryCode, 'SN');
  assert.equal(articles[0].category, 'Infrastructure');
  assert.equal(articles[0].sourceType, 'rss');
  // utm tracking parameters stripped
  assert.equal(articles[0].url, 'https://example.com/articles/dakar-port');
});

test('parseFeedXml parses Atom 1.0 entries accurately', () => {
  const feed: FeedConfig = {
    id: 'atom-feed',
    name: 'Atom News',
    domain: 'atom.org',
    url: 'https://atom.org/feed',
    defaultCountry: 'CI',
    category: 'Afrique',
    editorialScope: 'africa',
    enabled: true,
  };

  const sampleAtom = `
    <?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom Feed</title>
      <entry>
        <title>Nouvelle récolte de cacao à Abidjan</title>
        <link href="https://atom.org/news/cacao-2026" rel="alternate"/>
        <updated>2026-09-30T12:00:00Z</updated>
        <category term="Agriculture"/>
      </entry>
    </feed>
  `;

  const articles = parseFeedXml(sampleAtom, feed);
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, 'Nouvelle récolte de cacao à Abidjan');
  assert.equal(articles[0].url, 'https://atom.org/news/cacao-2026');
  assert.equal(articles[0].countryCode, 'CI');
  assert.equal(articles[0].publishedAt, null);
  assert.equal(articles[0].updatedAt, '2026-09-30T12:00:00.000Z');
});

test('getRadarRss fetches, caches, and filters articles by source or country', async () => {
  clearRssCacheForTesting();

  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  const sampleXml = `
    <rss version="2.0">
      <channel>
        <item>
          <title>Croissance économique au Sénégal</title>
          <link>https://aps.sn/article-1</link>
          <pubDate>${new Date(Date.now() - 60000).toUTCString()}</pubDate>
        </item>
        <item>
          <title>Marché boursier à Abidjan</title>
          <link>https://agenceecofin.com/article-2</link>
          <pubDate>${new Date(Date.now() - 120000).toUTCString()}</pubDate>
        </item>
      </channel>
    </rss>
  `;

  globalThis.fetch = (async () => {
    fetchCount += 1;
    return new Response(sampleXml, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
  }) as typeof fetch;

  try {
    const snapshot = await getRadarRss();
    assert.equal(snapshot.articles.length > 0, true);
    assert.equal(snapshot.stale, false);
    assert.equal(fetchCount, RSS_FEEDS.filter((f) => f.enabled).length);

    // Second call within TTL serves from cache without refetching
    const cachedSnapshot = await getRadarRss();
    assert.equal(fetchCount, RSS_FEEDS.filter((f) => f.enabled).length);
    assert.equal(cachedSnapshot.articles.length, snapshot.articles.length);

    // Filter by country
    const senegalOnly = await getRadarRss({ country: 'SN' });
    assert.equal(senegalOnly.articles.every((a) => a.countryCode === 'SN'), true);

    // Filter by source
    const apsOnly = await getRadarRss({ source: 'aps' });
    assert.equal(apsOnly.articles.every((a) => a.domain.includes('aps')), true);
  } finally {
    globalThis.fetch = originalFetch;
    clearRssCacheForTesting();
  }
});
