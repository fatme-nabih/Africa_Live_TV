import assert from 'node:assert/strict';
import test from 'node:test';

import { filterCountries, flagEmoji, normalizeSearch, parseRecentCountries, pushRecentCountry } from './country-picker';
import { AFRICAN_COUNTRIES } from './radar-countries';

const countries = AFRICAN_COUNTRIES.map(({ code, name }) => ({ code, name }));
const codes = (query: string) => filterCountries(countries, query).map(country => country.code);

test('les drapeaux sont construits depuis le code ISO, un code invalide donne une chaîne vide', () => {
  assert.equal(flagEmoji('SN'), '🇸🇳');
  assert.equal(flagEmoji('ci'), '🇨🇮');
  assert.equal(flagEmoji('SEN'), '');
  assert.equal(flagEmoji(null), '');
});

test('la recherche ignore accents, apostrophes, tirets et majuscules', () => {
  assert.equal(normalizeSearch('  Côte d’Ivoire '), 'cote d ivoire');
  assert.equal(normalizeSearch('Guinée-Bissau'), 'guinee bissau');
  assert.deepEqual(codes('senegal').slice(0, 1), ['SN']);
  assert.deepEqual(codes('cote d ivoire').slice(0, 1), ['CI']);
  assert.deepEqual(codes('SÃO').slice(0, 1), ['ST']);
});

test('le début du nom passe avant une simple inclusion, le code exact avant tout', () => {
  const guinee = codes('guinee');
  assert.deepEqual(guinee.slice(0, 3).sort(), ['GN', 'GQ', 'GW']);
  assert.equal(codes('ne')[0], 'NE');
  assert.equal(codes('sn')[0], 'SN');
});

test('les noms d’usage sont reconnus (RDC, noms anglais)', () => {
  assert.equal(codes('rdc')[0], 'CD');
  assert.equal(codes('ivory')[0], 'CI');
  assert.equal(codes('south africa')[0], 'ZA');
});

test('sans requête la liste est complète et alphabétique en français ; une requête sans résultat est vide', () => {
  const all = filterCountries(countries, '');
  assert.equal(all.length, AFRICAN_COUNTRIES.length);
  assert.equal(all[0].name, 'Afrique du Sud');
  assert.deepEqual(codes('zzzz'), []);
});

test('les pays récents sont dédoublonnés, bornés et le dernier choisi passe en tête', () => {
  assert.deepEqual(pushRecentCountry(['SN', 'CI'], 'CI'), ['CI', 'SN']);
  assert.deepEqual(pushRecentCountry(['A1', 'B2', 'C3', 'D4', 'E5'], 'F6'), ['F6', 'A1', 'B2', 'C3', 'D4']);
});

test('la lecture des récents ignore le bruit, les doublons et les codes inconnus', () => {
  const valid = new Set(['SN', 'CI', 'GH']);
  assert.deepEqual(parseRecentCountries('["SN","XX","CI","SN",3]', valid), ['SN', 'CI']);
  assert.deepEqual(parseRecentCountries('pas du json', valid), []);
  assert.deepEqual(parseRecentCountries('{"a":1}', valid), []);
  assert.deepEqual(parseRecentCountries(null, valid), []);
});
