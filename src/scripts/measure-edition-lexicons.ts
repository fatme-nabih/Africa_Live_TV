/** Réception linguistique déterministe, sans réseau : titres E0, pays nommés/replis/pièges séparés. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { detectCountryCode } from '../lib/country-detector';
import { africanMentions, inferWorldRegion } from '../lib/world-desk-data';

type Row = { id: string; title: string; country: string | null; accept?: string[]; feedCountry?: string | null; basis?: string; trap?: string;
  role?: string; sourceRegion?: string | null; region?: string | null; regionAccept?: (string | null)[]; africa?: string[]; touchesAfrica?: boolean };
const results = [];
for (const edition of ['en', 'ar'] as const) {
  const fixture = JSON.parse(readFileSync(`src/lib/fixtures/editions/titles-${edition}.json`, 'utf8')) as { titles: Row[]; traps: Row[] };
  const evaluate = (rows: Row[]) => {
    const misses = rows.flatMap(row => { const actual = detectCountryCode(row.title, row.feedCountry ?? null, edition);
      return actual === row.country || row.accept?.includes(actual ?? '') ? [] : [{ id: row.id, expected: row.country, actual }]; });
    return { total: rows.length, correct: rows.length - misses.length, percent: Math.round((rows.length - misses.length) / rows.length * 10_000) / 100, misses };
  };
  const regions = fixture.titles.filter(row => row.role === 'world');
  const regionMisses = regions.flatMap(row => { const actual = row.sourceRegion ?? inferWorldRegion(row.title, edition);
    return actual === row.region || row.regionAccept?.includes(actual) ? [] : [{ id: row.id, expected: row.region, actual }]; });
  const mentionMisses = regions.filter(row => { const actual = africanMentions(row.title, edition);
    return actual.touchesAfrica !== row.touchesAfrica || JSON.stringify([...actual.countries].sort()) !== JSON.stringify([...row.africa!].sort()); }).map(r => r.id);
  results.push({ edition, all: evaluate(fixture.titles), named: evaluate(fixture.titles.filter(row => row.basis === 'title')),
    fallback: evaluate(fixture.titles.filter(row => row.basis === 'media')), syntheticTraps: evaluate(fixture.traps), realTraps: evaluate(fixture.titles.filter(row => row.trap)),
    world: { total: regions.length, regionsCorrect: regions.length - regionMisses.length, regionMisses, mentionMisses } });
}
mkdirSync('.local-logs/editions-e2', { recursive: true });
writeFileSync('.local-logs/editions-e2/lexicon-final.json', JSON.stringify({ note: 'Annotations E0 par agent ; relecture arabe native D7 toujours attendue en E4.', results }, null, 2));
for (const row of results) console.log(JSON.stringify(row));
