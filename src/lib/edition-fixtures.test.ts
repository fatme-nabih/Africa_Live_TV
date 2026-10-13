import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodeFeedBytes, detectCharset, detectLanguage, rawItemDates } from './feed-verify';
import { AFRICAN_COUNTRIES } from './radar-countries';

/**
 * Intégrité des échantillons des éditions (EDI-002). Les règles de détection arrivent en E2 (EDI-204 à EDI-208) ;
 * ici, on vérifie seulement que les annotations sont cohérentes et que les pièges du plan technique (§ 1.5) sont présents.
 */
type Annotated = { id: string; title: string; country: string | null; accept?: string[]; trap?: string };
type RealTitle = Annotated & { feed: string; feedCountry: string | null; role: string; basis: 'title' | 'media' | 'none'; region?: string | null; regionAccept?: (string | null)[];
  africa?: string[]; touchesAfrica?: boolean };
type TitleFixture = { edition: string; titles: RealTitle[]; traps: (Annotated & { synthetic: true })[] };
type ExpectedXml = { referenceNow: string; files: Record<string, { items?: { raw: string; utc: string }[]; encoding?: string; titles?: string[] }> };

const DIR = 'src/lib/fixtures/editions';
const load = (edition: string) => JSON.parse(readFileSync(`${DIR}/titles-${edition}.json`, 'utf8')) as TitleFixture;
const CODES = new Set(AFRICAN_COUNTRIES.map(country => country.code));
const REGIONS = new Set(['europe', 'ameriques', 'moyen-orient', 'asie-pacifique']);
const ROLES = new Set(['national', 'panafrican', 'world']);

const REQUIRED_TRAPS: Record<string, string[]> = {
  en: ['guinea-bissau', 'equatorial-guinea', 'guinea-vs-equatorial-guinea', 'papua-new-guinea', 'niger-delta', 'niger-state', 'niger-vs-nigeria', 'chad-first-name',
    'chad-country', 'congo-alone', 'south-sudan', 'sudan', 'gulf-of-guinea', 'mauritania-vs-mauritius', 'sahara-alone', 'western-sahara'],
  ar: ['masraf-bank', 'masarif-bank', 'masra-death', 'maghrib-prayer', 'maghreb-region', 'maghreb-club', 'sahara-desert', 'western-sahara', 'niger-vs-nigeria',
    'south-sudan', 'sudan', 'maliya-finance', 'somali-contains-mali', 'malaysian-not-mali', 'ribat-ligament', 'proclitic-bi', 'proclitic-wa-bi', 'diacritics', 'hamza-variant', 'eastern-digits'],
};

for (const edition of ['en', 'ar'] as const) {
  test(`EDI-002: the ${edition} sample holds about 200 real, unique, consistently annotated titles`, () => {
    const fixture = load(edition);
    assert.equal(fixture.edition, edition);
    assert.ok(fixture.titles.length >= 200 && fixture.titles.length <= 260, `${fixture.titles.length} titres`);
    const ids = [...fixture.titles, ...fixture.traps].map(row => row.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiants uniques');
    assert.equal(new Set(fixture.titles.map(row => row.title)).size, fixture.titles.length, 'titres uniques');
    for (const row of fixture.titles) {
      assert.ok(ROLES.has(row.role), row.id);
      assert.ok(row.title.trim().length > 0 && row.title.length <= 300, row.id);
      for (const code of [row.country, row.feedCountry, ...(row.accept ?? [])]) if (code !== null) assert.ok(CODES.has(code), `${row.id} : ${code}`);
      if (row.basis === 'media') assert.equal(row.country, row.feedCountry, `${row.id} : le repli est le pays du média`);
      if (row.basis === 'none') assert.equal(row.country, null, row.id);
      if (row.basis === 'title') assert.notEqual(row.country, null, row.id);
      if (row.role === 'national') assert.notEqual(row.feedCountry, null, row.id);
      if (row.role === 'world') {
        assert.ok(row.region === null || REGIONS.has(row.region!), `${row.id} : ${row.region}`);
        for (const region of row.regionAccept ?? []) assert.ok(region === null || REGIONS.has(region), row.id);
        assert.ok(Array.isArray(row.africa), row.id);
        for (const code of row.africa!) assert.ok(CODES.has(code), `${row.id} : ${code}`);
        if (row.africa!.length) assert.equal(row.touchesAfrica, true, row.id);
      }
    }
    for (const row of fixture.traps) {
      assert.equal(row.synthetic, true, row.id);
      for (const code of [row.country, ...(row.accept ?? [])]) if (code !== null) assert.ok(CODES.has(code), `${row.id} : ${code}`);
    }
  });

  test(`EDI-002: the ${edition} sample covers every feed role and the plan's traps`, () => {
    const fixture = load(edition);
    const roles = new Map<string, number>();
    for (const row of fixture.titles) roles.set(row.role, (roles.get(row.role) ?? 0) + 1);
    for (const role of ROLES) assert.ok((roles.get(role) ?? 0) >= 15, `${role} : ${roles.get(role) ?? 0}`);
    assert.ok(new Set(fixture.titles.map(row => row.feed)).size >= 40, 'au moins 40 flux représentés');
    assert.ok(fixture.titles.filter(row => row.basis === 'title').length >= 80, 'assez de pays nommés par le titre');
    assert.ok(fixture.titles.filter(row => row.role === 'world' && row.region === null).length >= 4, 'des titres « monde » sans région');
    const traps = new Set([...fixture.titles, ...fixture.traps].map(row => row.trap).filter(Boolean));
    for (const trap of REQUIRED_TRAPS[edition]) assert.ok(traps.has(trap), `piège absent : ${trap}`);
  });
}

test('EDI-002: titles are in the language of their edition, except the documented French titles of Nawaat', () => {
  const en = load('en').titles, ar = load('ar').titles;
  assert.ok(en.filter(row => detectLanguage([row.title]) === 'ar').length === 0);
  const notArabic = ar.filter(row => detectLanguage([row.title]) !== 'ar');
  assert.deepEqual(notArabic.map(row => row.feed), ['Nawaat', 'Nawaat']);
});

test('EDI-002: synthetic XML files reproduce the measured date formats and windows-1256', () => {
  const expected = JSON.parse(readFileSync(`${DIR}/xml/expected.json`, 'utf8')) as ExpectedXml;
  assert.equal(expected.referenceNow, '2026-10-11T18:00:00.000Z');
  for (const [file, spec] of Object.entries(expected.files)) {
    const bytes = new Uint8Array(readFileSync(`${DIR}/xml/${file}`));
    if (spec.encoding) {
      const head = new TextDecoder('latin1').decode(bytes.slice(0, 200));
      const { charset } = detectCharset(file.includes('no-prolog') ? 'text/xml; charset=windows-1256' : null, head);
      assert.equal(charset, spec.encoding, file);
      const text = decodeFeedBytes(bytes, charset).text;
      for (const title of spec.titles!) assert.ok(text.includes(title), `${file} : ${title}`);
      assert.ok(!new TextDecoder().decode(bytes).includes(spec.titles![0]), `${file} n'est pas de l'UTF-8`);
      continue;
    }
    const raw = rawItemDates(new TextDecoder().decode(bytes));
    assert.deepEqual(raw, spec.items!.map(item => item.raw), file);
    for (const item of spec.items!) assert.ok(Number.isFinite(Date.parse(item.utc)), `${file} : ${item.utc}`);
  }
});
