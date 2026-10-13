import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_EDITION, EDITION_COOKIE, EDITION_IDS, EDITIONS, enabledEditions, isEdition, parseEditionCookie, parseEnabledEditions, READY_EDITIONS } from './editions';
import { AFRICAN_COUNTRIES } from './radar-countries';

test('EDI-101: the registry holds the owner decisions D1, D2 and D3', () => {
  assert.deepEqual([...EDITION_IDS], ['fr', 'en', 'ar']);
  assert.equal(DEFAULT_EDITION, 'fr'); assert.equal(EDITION_COOKIE, 'al_edition');
  assert.deepEqual(['fr', 'en', 'ar'].map(id => EDITIONS[id as 'fr'].defaultCountry), ['SN', 'NG', 'DZ']);
  assert.deepEqual(EDITIONS.ar.secondaryCountries, ['MA']);
  assert.deepEqual(['fr', 'en', 'ar'].map(id => EDITIONS[id as 'fr'].dir), ['ltr', 'ltr', 'rtl']);
  assert.deepEqual(['fr', 'en', 'ar'].map(id => EDITIONS[id as 'fr'].clerk), ['frFR', 'enGB', 'arSA']);
  // D3 : chiffres occidentaux en arabe.
  assert.equal(new Intl.NumberFormat(EDITIONS.ar.intl).format(1234.5), '1,234.5');
  // Les défauts d'ICU varient selon la région (`ar-EG`, `ar-SA` : chiffres orientaux) ; `-u-nu-latn` n'en dépend pas.
  assert.equal(new Intl.NumberFormat('ar-EG').format(12), '١٢');
  assert.equal(new Intl.NumberFormat('ar-EG-u-nu-latn').format(12), '12');
  const codes = new Set(AFRICAN_COUNTRIES.map(country => country.code));
  for (const edition of Object.values(EDITIONS)) {
    for (const code of [edition.defaultCountry, edition.weatherDefault, ...edition.secondaryCountries]) assert.ok(codes.has(code), `${edition.id} : ${code}`);
    assert.equal(new Set(edition.worldOrder).size, 4, edition.id);
    assert.doesNotThrow(() => new Intl.DateTimeFormat(edition.intl));
  }
  assert.equal(EDITIONS.ar.label, 'العربية');
});

test('EDI-101: the cookie accepts only known editions', () => {
  assert.equal(parseEditionCookie('en'), 'en'); assert.equal(parseEditionCookie(' AR '), 'ar'); assert.equal(parseEditionCookie('fr'), 'fr');
  for (const value of [undefined, null, '', 'es', 'pt', 'fr-FR', 'en;', '__proto__', 'constructor']) assert.equal(parseEditionCookie(value), null, String(value));
  assert.equal(isEdition('toString'), false); assert.equal(isEdition(1), false);
});

test('EDI-101: EDITIONS defaults to fr, always keeps fr first and ignores unknown values', () => {
  const all = ['fr', 'en', 'ar'] as const;
  assert.deepEqual(parseEnabledEditions(undefined, all), { editions: ['fr'], unknown: [], notReady: [] });
  assert.deepEqual(parseEnabledEditions('', all), { editions: ['fr'], unknown: [], notReady: [] });
  assert.deepEqual(parseEnabledEditions('en', all), { editions: ['fr', 'en'], unknown: [], notReady: [] });
  assert.deepEqual(parseEnabledEditions('ar, EN ,fr,fr', all), { editions: ['fr', 'en', 'ar'], unknown: [], notReady: [] });
  assert.deepEqual(parseEnabledEditions('fr,es,pt,es', all), { editions: ['fr'], unknown: ['es', 'pt'], notReady: [] });
  // Une édition sans dictionnaire est masquée (EDI-107) : EDITIONS=fr,en avant E3 sert seulement le français.
  assert.deepEqual(parseEnabledEditions('fr,en', ['fr']), { editions: ['fr'], unknown: [], notReady: ['en'] });
  // La même garde masque encore toute édition sans dictionnaire, quel que soit le lot.
  assert.deepEqual(parseEnabledEditions('fr,ar', ['fr', 'en']), { editions: ['fr'], unknown: [], notReady: ['ar'] });
  assert.deepEqual([...READY_EDITIONS], ['fr', 'en', 'ar'], 'E4 : les dictionnaires français, anglais et arabe existent');
  const warn = console.warn; const lines: string[] = [];
  console.warn = (line: string) => { lines.push(line); };
  try {
    assert.deepEqual(enabledEditions({ EDITIONS: 'fr,en,ar,klingon' }), ['fr', 'en', 'ar']);
    assert.deepEqual(enabledEditions({ EDITIONS: 'xx' }), ['fr']);
  } finally { console.warn = warn; }
  assert.equal(lines.length, 1, 'un seul avertissement par processus');
  assert.deepEqual(JSON.parse(lines[0]), { ...JSON.parse(lines[0]), event: 'editions_ignored', unknown: 1, notReady: '' });
  assert.ok(!lines[0].includes('klingon'), 'la valeur soumise n’est pas journalisée');
  assert.deepEqual(enabledEditions({}), ['fr']);
});
