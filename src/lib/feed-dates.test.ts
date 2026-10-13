import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseFeedDate, clampFeedClockLead } from './feed-dates';
import { readBoundedText } from './feed-text';
import type { FeedDateOptions } from './feeds/types';
import { parseFeedXml, fetchSingleFeed, RSS_FEEDS, clearRssCacheForTesting } from './rss-collector';
import { temporalWindow } from './radar-data';

type Spec = FeedDateOptions & { items?: (FeedDateOptions & { raw: string; utc: string })[]; titles?: string[] };
const dir = 'src/lib/fixtures/editions/xml';
const expected = JSON.parse(readFileSync(`${dir}/expected.json`, 'utf8')) as { referenceNow: string; files: Record<string, Spec> };
for (const [file, spec] of Object.entries(expected.files)) if (spec.items) {
  test(`EDI-204: dates UTC exactes du XML ${file}`, () => {
    const xml = readFileSync(`${dir}/${file}`, 'utf8');
    for (const item of spec.items!) {
      assert.ok(xml.includes(item.raw), 'le cas vient du XML');
      assert.equal(parseFeedDate(item.raw, { ...spec, ...item }), item.utc, item.raw);
    }
  });
}
test('EDI-204: les changements d’heure ICU du Caire et de Londres sont appliqués sans dépendre du poste', () => {
  assert.equal(parseFeedDate('2026-10-29T12:00:00', { timeZone: 'Africa/Cairo' }), '2026-10-29T09:00:00.000Z');
  assert.equal(parseFeedDate('2026-10-30T12:00:00', { timeZone: 'Africa/Cairo' }), '2026-10-30T10:00:00.000Z');
  assert.equal(parseFeedDate('Sat, 24 Oct 2026 12:00:00 GMT', { wallClockTimeZone: 'Europe/London' }), '2026-10-24T11:00:00.000Z');
  assert.equal(parseFeedDate('Sun, 25 Oct 2026 12:00:00 GMT', { wallClockTimeZone: 'Europe/London' }), '2026-10-25T12:00:00.000Z');
  assert.equal(parseFeedDate('02/31/2026 1:00 PM', { dateFormat: 'us-12h' }), null);
  assert.equal(parseFeedDate('2026-10-11T12:00:00'), null);
  assert.equal(parseFeedDate('2026-10-11T12:00:00+02:00', { timeZone: 'Africa/Lagos' }), '2026-10-11T10:00:00.000Z');
});
test('EDI-204: la garde +3h est réservée à la collecte RSS, y compris FR ; +5h reste futur', async t => {
  const now = Date.parse(expected.referenceNow); t.mock.method(Date, 'now', () => now);
  const xml = readFileSync(`${dir}/clock-lead.xml`, 'utf8');
  const original = parseFeedXml(xml, RSS_FEEDS[0]);
  assert.equal(original[0].publishedAt, '2026-10-11T20:00:00.000Z');
  const bounded = parseFeedXml(xml, RSS_FEEDS[0], RSS_FEEDS[0].url, now);
  assert.equal(bounded[0].publishedAt, expected.referenceNow);
  assert.equal(bounded[1].publishedAt, '2026-10-11T23:00:00.000Z');
  assert.equal(clampFeedClockLead('2026-10-11T21:00:00.000Z', now), expected.referenceNow);
  assert.equal(temporalWindow(original, a => a.publishedAt, now).recent.length, 1);
  clearRssCacheForTesting(); t.mock.method(globalThis, 'fetch', async () => new Response(xml));
  try { assert.deepEqual(await fetchSingleFeed(RSS_FEEDS[0]), bounded); } finally { clearRssCacheForTesting(); }
});
test('EDI-205: windows-1256 selon en-tête, XML ou registre, priorité HTTP, repli UTF-8', async () => {
  const prolog = readFileSync(`${dir}/windows-1256.xml`), plain = readFileSync(`${dir}/windows-1256-no-prolog.xml`);
  const title = expected.files['windows-1256.xml'].titles![0];
  assert.ok((await readBoundedText(new Response(prolog), 1_000_000)).includes(title));
  assert.ok((await readBoundedText(new Response(plain, { headers: { 'content-type': 'text/xml; charset=windows-1256' } }), 1_000_000)).includes(title));
  assert.ok((await readBoundedText(new Response(plain), 1_000_000, 'windows-1256')).includes(title));
  assert.ok(!(await readBoundedText(new Response(prolog, { headers: { 'content-type': 'text/xml; charset=utf-8' } }), 1_000_000, 'windows-1256')).includes(title));
  assert.equal(await readBoundedText(new Response('عنوان', { headers: { 'content-type': 'text/xml; charset=unknown' } }), 1_000_000), 'عنوان');
});
test('EDI-205: limite exacte de 1Mo en octets, même pour un corps découpé ou une longueur mensongère', async () => {
  assert.equal((await readBoundedText(new Response('a'.repeat(1_000_000)), 1_000_000)).length, 1_000_000);
  await assert.rejects(readBoundedText(new Response('é'.repeat(500_001)), 1_000_000), /exceeded/);
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(600_000)); c.enqueue(new Uint8Array(400_001)); }, cancel() { cancelled = true; } });
  await assert.rejects(readBoundedText(new Response(body, { headers: { 'content-length': '2' } }), 1_000_000), /exceeded/);
  assert.equal(cancelled, true);
  await assert.rejects(readBoundedText(new Response('x', { headers: { 'content-length': '1000001' } }), 1_000_000), /exceeded/);
});
