import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  analyzeFeed,
  classifyFeed,
  compareMeasures,
  declaredZone,
  detectCharset,
  detectLanguage,
  failedMeasure,
  parseFeedList,
  parseStudyAnnexes,
  rawItemDates,
  type FeedCandidate,
} from './feed-verify';

const NOW = Date.parse('2026-10-11T18:00:00Z');
const candidate: FeedCandidate = { edition: 'ar', role: 'national', country: 'EG', name: 'Fixture', url: 'https://feed.fixture.test/rss', tier: 'core' };
const facts = { status: 200, finalUrl: 'https://feed.fixture.test/rss', contentType: 'application/rss+xml', etag: true, lastModified: false, ms: 10 };
const rss = (items: [string, string][]) => new TextEncoder().encode('<?xml version="1.0"?><rss><channel>' + items.map(([title, date], index) =>
  `<item><title>${title}</title><link>https://feed.fixture.test/a/${index}</link><pubDate>${date}</pubDate></item>`).join('') + '</channel></rss>');
const fixture = (name: string) => new Uint8Array(readFileSync(`src/lib/fixtures/editions/xml/${name}`));

test('EDI-001: the feed list keeps the study format and refuses malformed lines', () => {
  const rows = parseFeedList('# commentaire\n\nen|africa|NG|Punch|https://rss.punchng.com/v1/category/latest_news|tier=noyau\nar|intl|AF|Asharq Africa?|https://aawsat.com/feed/africa\nfr|world|-|Euronews|https://fr.euronews.com/rss|region=europe|origin=Europe');
  assert.deepEqual(rows.map(row => [row.edition, row.role, row.country, row.tier ?? null]), [['en', 'national', 'NG', 'core'], ['ar', 'panafrican', null, null], ['fr', 'world', null, null]]);
  assert.equal(rows[2].region, 'europe'); assert.equal(rows[2].origin, 'Europe');
  assert.throws(() => parseFeedList('es|africa|SN|Inconnu|https://example.test/feed'), /Ligne 1/);
  assert.throws(() => parseFeedList('en|africa|NG|Sans URL|ftp://example.test/feed'), /Ligne 1/);
});

test('EDI-001: the study annexes give edition, role, country, tier and origin', () => {
  const rows = parseStudyAnnexes(['## Annexe A — anglais', '### A.1 Presse', '| Pays | Source | Rang | Flux | Remarque |', '|---|---|---|---|---|',
    '| NG | Punch | noyau | https://rss.punchng.com/v1/category/latest_news | |', '| BW | Sunday Standard | complément | https://www.sundaystandard.info/feed/ | |',
    '### A.3 Monde', '| Région | Source | Rang | Art. 24 h | Flux |', '|---|---|---|---|---|', '| Europe | BBC | noyau | 4 | https://feeds.bbci.co.uk/news/world/europe/rss.xml |',
    '## Annexe B — arabe', '### B.3 Orient', '| Source | Origine | Art. 24 h | Flux | Remarque |', '|---|---|---|---|---|',
    '| RT Arabic | Russie · média d\'État | 100 | https://rtarabic.com/rss/ | inclus par D6 |', '| ONU Info | Nations unies | 0 | https://news.un.org/feed/subscribe/ar/news/all/rss.xml | complément |',
    '## Annexe C — écartées', '| Source | Flux |', '|---|---|', '| Écarté | https://ignored.test/feed |'].join('\n'));
  assert.deepEqual(rows.map(row => [row.edition, row.role, row.country, row.tier]), [['en', 'national', 'NG', 'core'], ['en', 'national', 'BW', 'complement'], ['en', 'world', null, 'core'], ['ar', 'world', null, 'core'], ['ar', 'world', null, 'complement']]);
  assert.equal(rows[2].region, 'Europe'); assert.equal(rows[3].origin, 'Russie · média d\'État');
});

test('EDI-001: the declared charset comes from the header, then the XML prolog, else UTF-8', () => {
  assert.deepEqual(detectCharset('text/xml; charset=Windows-1256', '<?xml version="1.0" encoding="utf-8"?>'), { charset: 'windows-1256', source: 'header' });
  assert.deepEqual(detectCharset('text/xml', '<?xml version="1.0" encoding="windows-1256"?>'), { charset: 'windows-1256', source: 'prolog' });
  assert.deepEqual(detectCharset(null, '<rss>'), { charset: 'utf-8', source: 'default' });
});

test('EDI-001/002: a windows-1256 feed is decoded from its prolog, an unknown label falls back to UTF-8', () => {
  const measure = analyzeFeed({ ...candidate, url: 'https://feed.fixture.test/1256' }, fixture('windows-1256.xml'), { ...facts, contentType: 'text/xml' }, NOW);
  assert.equal(measure.charset, 'windows-1256'); assert.equal(measure.charsetSource, 'prolog'); assert.equal(measure.charsetFallback, false);
  assert.equal(measure.language, 'ar'); assert.match(measure.sampleTitle, /^عنوان تجريبي/);
  const unknown = analyzeFeed(candidate, rss([['Test title of the day', 'Sun, 11 Oct 2026 17:00:00 +0000']]), { ...facts, contentType: 'text/xml; charset=x-inconnu' }, NOW);
  assert.equal(unknown.charsetFallback, true); assert.equal(unknown.items, 1);
});

test('EDI-001: language is measured on titles, not announced by the feed', () => {
  assert.equal(detectLanguage(['الرئيس يستقبل وزير الخارجية', 'ارتفاع أسعار النفط']), 'ar');
  assert.equal(detectLanguage(['Tinubu signs the budget after a long debate in the Senate']), 'en');
  assert.equal(detectLanguage(['Le président reçoit les ministres pour la rentrée']), 'fr');
  assert.equal(detectLanguage(['Madaxweyne Xasan ayaa ka hadlay dalka iyo amniga']), 'so');
  assert.equal(detectLanguage(['', '123']), '?');
});

test('EDI-001: raw dates and declared zones are kept for the date adapters', () => {
  const xml = '<rss><item><title>a</title><pubDate>17:24 | 11-10-2026</pubDate></item><item><title>b</title><pubDate><![CDATA[الأحد، 11 أكتوبر 2026 08:50 م]]></pubDate></item></rss>';
  assert.deepEqual(rawItemDates(xml), ['17:24 | 11-10-2026', 'الأحد، 11 أكتوبر 2026 08:50 م']);
  assert.deepEqual(rawItemDates('<feed><entry><title>c</title><updated>2026-10-11T10:00:00+01:00</updated></entry></feed>'), ['2026-10-11T10:00:00+01:00']);
  for (const [raw, zone] of [['Sun, 11 Oct 2026 19:16:09 +0000', '+0000'], ['Sun, 11 Oct 2026 20:32:06 GMT', 'GMT'], ['2026-10-11T10:00:00+01:00', '+0100'],
    ['2026-10-11T10:00:00Z', 'Z'], ['17:24 | 11-10-2026', 'none'], ['10/11/2026 9:18:17 PM', 'none'], ['الأحد، 11 أكتوبر 2026 08:50 م', 'none']] as const) assert.equal(declaredZone(raw), zone, raw);
});

test('EDI-001: a local clock labelled UTC is measured as a lead, fresh feeds are core', () => {
  const ahead = analyzeFeed(candidate, rss([['خبر أول عن مصر', 'Sun, 11 Oct 2026 20:54:00 GMT'], ['خبر ثان', 'Sun, 11 Oct 2026 20:40:00 GMT'], ['خبر ثالث', 'Sun, 11 Oct 2026 20:30:00 GMT']]), facts, NOW);
  assert.equal(ahead.future, 3); assert.equal(ahead.leadHours, 2.9); assert.equal(ahead.newestAgeHours, null);
  assert.equal(ahead.last24, 3); assert.equal(ahead.last24Strict, 0); assert.equal(ahead.verdict, 'core');
  assert.deepEqual(ahead.declaredZones, ['GMT']); assert.equal(ahead.etag, true);
  const tooFar = analyzeFeed(candidate, rss([['خبر', 'Mon, 12 Oct 2026 02:00:00 GMT']]), facts, NOW);
  assert.equal(tooFar.leadHours, 8); assert.equal(tooFar.verdict, 'stale');
});

test('EDI-001: verdicts separate core, complement, stale, unreadable dates and failures', () => {
  const base = { status: 200, format: 'rss' as const, items: 10, dated: 10, last24: 3, future: 0, leadHours: null, newestAgeHours: 2, error: null };
  assert.equal(classifyFeed(base), 'core');
  assert.equal(classifyFeed({ ...base, last24: 2 }), 'complement');
  assert.equal(classifyFeed({ ...base, last24: 0, newestAgeHours: 30 }), 'complement');
  assert.equal(classifyFeed({ ...base, last24: 0, newestAgeHours: 80 }), 'stale');
  assert.equal(classifyFeed({ ...base, dated: 0, newestAgeHours: null }), 'date-issue');
  assert.equal(classifyFeed({ ...base, status: 403 }), 'ko');
  assert.equal(classifyFeed({ ...base, items: 0 }), 'ko');
  const unreadable = analyzeFeed(candidate, rss([['خبر', 'الأحد، 11 أكتوبر 2026 08:50 م']]), facts, NOW);
  assert.equal(unreadable.items, 1); assert.equal(unreadable.dated, 0); assert.equal(unreadable.verdict, 'date-issue');
  assert.equal(analyzeFeed(candidate, new TextEncoder().encode('<html>non</html>'), facts, NOW).verdict, 'ko');
});

test('EDI-001: drifts compare the study tier and the previous measure', () => {
  const failed = failedMeasure({ ...candidate, url: 'https://nation.fixture.test/rss' }, 'HTTP_404', 100, 404);
  const fresh = analyzeFeed({ ...candidate, edition: 'en', tier: 'complement' }, rss([['Egypt opens a new bridge in Cairo', 'Sun, 11 Oct 2026 17:00:00 +0000']]), facts, NOW);
  const drifts = compareMeasures([failed, fresh], [{ url: 'https://nation.fixture.test/rss', status: 200, valid: true, items: 10, last24: 10, ageH: 1 }]);
  assert.deepEqual(drifts.map(drift => drift.changes), [['rang core → ko', 'statut 200 → 404'], []].filter(changes => changes.length));
  const mismatch = analyzeFeed({ ...candidate, edition: 'en' }, rss([['Madaxweyne ayaa ka hadlay dalka iyo amniga', 'Sun, 11 Oct 2026 17:00:00 +0000']]), facts, NOW);
  assert.deepEqual(compareMeasures([mismatch], [])[0].changes, ['rang core → complement', 'langue so (attendu en)']);
});

test('EDI-001: titles are kept only on request', () => {
  const bytes = rss([['Kenya: Ruto signs the bill', 'Sun, 11 Oct 2026 17:00:00 +0000']]);
  assert.equal(analyzeFeed(candidate, bytes, facts, NOW).titles, undefined);
  assert.deepEqual(analyzeFeed(candidate, bytes, facts, NOW, true).titles, [{ title: 'Kenya: Ruto signs the bill', publishedAt: '2026-10-11T17:00:00.000Z' }]);
});
