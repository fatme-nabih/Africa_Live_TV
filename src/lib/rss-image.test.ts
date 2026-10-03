import assert from 'node:assert/strict';
import test from 'node:test';

import { clearRssCacheForTesting, getRadarRss, parseFeedXml, RSS_FEEDS } from './rss-collector';
import { extractImageUrl, safeImageUrl } from './rss-image';

const feed = RSS_FEEDS.find(item => item.id === 'aps')!;
const item = (inner: string) => `<item><title>Dakar</title><link>https://aps.sn/article-1</link>${inner}</item>`;

test('seules les adresses https (ou http relevé en https) sans identifiants sont acceptées', () => {
  assert.equal(safeImageUrl('https://cdn.example.org/a.jpg?w=800&amp;h=450'), 'https://cdn.example.org/a.jpg?w=800&h=450');
  assert.equal(safeImageUrl('http://cdn.example.org/a.jpg'), 'https://cdn.example.org/a.jpg');
  for (const bad of ['http://cdn.example.org:8080/a.jpg', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'https://user:pw@cdn.example.org/a.jpg', 'ftp://x/a.jpg', '', null, undefined]) {
    assert.equal(safeImageUrl(bad as string | null | undefined), null, String(bad));
  }
  assert.equal(safeImageUrl(`https://cdn.example.org/${'a'.repeat(700)}.jpg`), null);
});

test('les adresses relatives se résolvent sur l’article, jamais sur un autre hôte', () => {
  assert.equal(safeImageUrl('/media/une.jpg', 'https://aps.sn/article-1'), 'https://aps.sn/media/une.jpg');
  assert.equal(safeImageUrl('//cdn.aps.sn/une.jpg', 'https://aps.sn/article-1'), 'https://cdn.aps.sn/une.jpg');
  assert.equal(safeImageUrl('/media/une.jpg'), null);
  assert.equal(safeImageUrl('/media/une.jpg', 'http://aps.sn/article-1'), 'https://aps.sn/media/une.jpg');
});

test('média déclaré, vignette, pièce jointe et lien Atom fournissent l’illustration', () => {
  assert.equal(extractImageUrl(item('<media:content url="https://cdn.example.org/m.jpg" medium="image" width="800"/>')), 'https://cdn.example.org/m.jpg');
  assert.equal(extractImageUrl(item('<media:content url="https://cdn.example.org/video.mp4" medium="video"/><media:thumbnail url="https://cdn.example.org/t.jpg"/>')), 'https://cdn.example.org/t.jpg');
  assert.equal(extractImageUrl(item('<enclosure url="https://cdn.example.org/e.png" type="image/png" length="1"/>')), 'https://cdn.example.org/e.png');
  assert.equal(extractImageUrl(item('<enclosure url="https://cdn.example.org/podcast.mp3" type="audio/mpeg"/>')), null);
  assert.equal(extractImageUrl('<entry><link rel="enclosure" type="image/jpeg" href="https://cdn.example.org/atom.jpg"/></entry>'), 'https://cdn.example.org/atom.jpg');
});

test('la première vraie image du texte est reprise, pas les pixels, émojis ni avatars', () => {
  const html = '&lt;p&gt;&lt;img src="https://s.w.org/images/core/emoji/15/72x72/1f600.png" width="16"/&gt;'
    + '&lt;img src="https://cdn.example.org/pixel.gif" width="1" height="1"/&gt;'
    + '&lt;img src="https://secure.gravatar.com/avatar/abc"/&gt;'
    + '&lt;img data-src="https://cdn.example.org/photo.jpg?a=1&amp;amp;b=2" alt=""/&gt;&lt;/p&gt;';
  assert.equal(extractImageUrl(item(`<description>${html}</description>`)), 'https://cdn.example.org/photo.jpg?a=1&b=2');
  assert.equal(extractImageUrl(item('<content:encoded><![CDATA[<p><img src="https://cdn.example.org/cdata.webp" /></p>]]></content:encoded>')), 'https://cdn.example.org/cdata.webp');
  assert.equal(extractImageUrl(item('<description>Texte sans image</description>')), null);
});

test('le flux publie imageUrl seulement quand l’éditeur en fournit une', () => {
  const [withImage, withoutImage] = parseFeedXml(`<rss><channel>${
    item('<media:content url="https://cdn.example.org/une.jpg" medium="image"/>')
  }${item('<description>Rien</description>').replace('article-1', 'article-2')}</channel></rss>`, feed);
  assert.equal(withImage.imageUrl, 'https://cdn.example.org/une.jpg');
  assert.equal('imageUrl' in withoutImage, false);
});

test('un article repris par deux flux garde la première entrée et récupère l’illustration manquante', async t => {
  clearRssCacheForTesting();
  t.mock.method(Date, 'now', () => Date.parse('2026-10-03T10:00:00Z'));
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
    const second = String(url).includes('rfi.fr');
    const image = second ? '<media:content url="https://cdn.example.org/partage.jpg" medium="image"/>' : '';
    return new Response(`<rss><channel><item><title>Dakar</title><link>https://example.org/partage</link><pubDate>Sat, 03 Oct 2026 09:00:00 GMT</pubDate>${image}</item></channel></rss>`);
  });
  try {
    const snapshot = await getRadarRss();
    const shared = snapshot.articles.filter(article => article.url === 'https://example.org/partage');
    assert.equal(shared.length, 1);
    assert.equal(shared[0].imageUrl, 'https://cdn.example.org/partage.jpg');
  } finally {
    clearRssCacheForTesting();
  }
});
