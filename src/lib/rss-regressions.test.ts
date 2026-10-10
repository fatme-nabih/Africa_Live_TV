import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeXmlEntities, detectCountryCode, parseFeedXml, RSS_FEEDS } from './rss-collector';
import { requestRadarJson } from './radar-request';
const feed = RSS_FEEDS[0];
test('B18: specific countries, apostrophes, accents and hyphens precede homonyms', () => {
  for (const [title, code] of [['Guinée-Bissau','GW'],['Guinée équatoriale','GQ'],['Soudan du Sud','SS'],['Côte d’Ivoire','CI'],['Guinee–Bissau','GW'],['South Sudan','SS'],['Guinée','GN'],['Soudan','SD'],['Nigeria','NG'],['Niger','NE']] as const) assert.equal(detectCountryCode(title),code,title);
});
test('B19: Atom chooses the alternate human article independently of link order', () => {
  const [article] = parseFeedXml('<feed><entry><title>Test</title><link rel="self" href="https://news.fixture.test/api/entry"/><link href="https://news.fixture.test/article" type="text/html" rel="alternate"/></entry></feed>',feed);
  assert.equal(article.url,'https://news.fixture.test/article');
});
test('B20: non-BMP entities remain valid code points, including the Unicode upper bound', () => {
  assert.equal(decodeXmlEntities('&#128680; &#x1F6A8;'),'🚨 🚨');
  assert.equal(decodeXmlEntities('&#x10FFFF;'),String.fromCodePoint(0x10ffff));
});
test('B18: boundaries, deterministic multi-country choice and newsroom fallback remain explicit', () => {
  assert.equal(detectCountryCode('nigerian'), 'NG'); assert.equal(detectCountryCode('un mot inconnu','SN'),'SN');
  assert.equal(detectCountryCode('Guinée et Guinée-Bissau'),'GW');
  const [article] = parseFeedXml('<rss><item><title>Un sujet sans pays</title><link>https://news.fixture.test/article</link></item></rss>',{ ...feed, defaultCountry:'CM' });
  assert.equal(article.countryCode,'CM'); assert.equal(article.countryBasis,'media');
});
test('B19: alternate/no-rel HTML or XHTML links, declared bases and unsafe/technical links', () => {
  const xml = (links:string) => '<feed xml:base="https://news.fixture.test/root/"><entry xml:base="articles/"><title>Test</title>' + links + '</entry></feed>';
  for (const links of ['<link href="item?a=1&amp;b=2"/>','<link rel="self" href="api"/><link type="application/xhtml+xml" rel="alternate" href="item?a=1&amp;b=2"/>']) {
    assert.equal(parseFeedXml(xml(links),feed)[0].url,'https://news.fixture.test/root/articles/item?a=1&b=2');
  }
  for (const links of ['<link rel="self" href="https://news.fixture.test/api"/>','<link rel="enclosure" href="https://news.fixture.test/video"/>','<link href="javascript:alert(1)"/>','<link href="file:///tmp/a"/>','<link href="https://user:password@news.fixture.test/article"/>']) assert.equal(parseFeedXml(xml(links),feed).length,0);
});
test('B20: invalid scalar policy, CDATA and one decoding pass preserve escaped text and title boundaries', () => {
  for (const value of ['&#0;','&#xD800;','&#xDFFF;','&#1114112;','&#xZZ;']) assert.equal(decodeXmlEntities(value),'�');
  assert.equal(decodeXmlEntities('<![CDATA[é &#x1F6A8;]]>'),'é 🚨');
  assert.equal(decodeXmlEntities('&amp;#106;avascript:'),'&#106;avascript:');
  assert.equal(decodeXmlEntities('&lt;script&gt;alert(1)&lt;/script&gt;'),'<script>alert(1)</script>');
  const [article] = parseFeedXml('<rss><item><title>' + 'a'.repeat(299) + '&#128680;</title><link>https://news.fixture.test/article</link></item></rss>',feed);
  assert.equal(article.title.length,299); assert.doesNotMatch(article.title,/[\uD800-\uDBFF]$/);
});
test('B13: API deadline includes a hanging body and the old request can be aborted without a fallback', async () => {
  const parent = new AbortController();
  const fetcher = (async () => ({ ok:true,json:() => new Promise(() => {}) })) as unknown as typeof fetch;
  await assert.rejects(requestRadarJson('/api/live/rss',parent.signal,{ timeoutMs:10,fetcher }),{ name:'AbortError' });
  parent.abort(); await assert.rejects(requestRadarJson('/api/live/rss',parent.signal,{ timeoutMs:10,fetcher }),{ name:'AbortError' });
});
