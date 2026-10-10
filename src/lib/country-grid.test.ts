import assert from 'node:assert/strict';
import test from 'node:test';

import { channelCountLabel, countryPlayback, filterCountryGrid, GRID_REGIONS, gridCountryName, orderCountryGrid, regionCounts } from './country-grid';

const countries = [
  { code: 'NG', name: 'Nigéria' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: 'Côte d’Ivoire' },
  { code: 'SO', name: 'Somalie' },
  { code: 'AO', name: 'Angola' },
];
const counts = { NG: { channelCount: 50 }, SN: { channelCount: 19 }, CI: { channelCount: 25 }, SO: { channelCount: 7 } };
const codes = (list: { code: string }[]) => list.map(country => country.code);

test('les pays suivis passent en tête, dans l’ordre choisi, sans doublon dans le reste', () => {
  const { pinned, others } = orderCountryGrid(countries, counts, ['SN', 'CI', 'SN']);
  assert.deepEqual(codes(pinned), ['SN', 'CI']);
  assert.deepEqual(codes(others), ['NG', 'SO']);
});

test('sans pays suivi, la grille reste triée par nombre de chaînes', () => {
  const { pinned, others } = orderCountryGrid(countries, counts, []);
  assert.deepEqual(pinned, []);
  assert.deepEqual(codes(others), ['NG', 'CI', 'SN', 'SO']);
});

test('un pays suivi sans chaîne ou inconnu n’est pas épinglé, et les pays vides restent masqués', () => {
  const { pinned, others } = orderCountryGrid(countries, counts, ['AO', 'XX']);
  assert.deepEqual(pinned, []);
  assert.ok(!codes(others).includes('AO'));
  assert.deepEqual(orderCountryGrid(countries, undefined, ['SN']), { pinned: [], others: [] });
});

test('la carte met en avant la lecture navigateur, et annonce VLC quand il n’y en a aucune', () => {
  assert.deepEqual(countryPlayback({ channelCount: 19, directWebCount: 6 }),
    { total: 19, inBrowser: 6, primary: '6 dans le navigateur', totalLabel: '19 chaînes' });
  assert.deepEqual(countryPlayback({ channelCount: 7, directWebCount: 0 }),
    { total: 7, inBrowser: 0, primary: 'Avec VLC', totalLabel: '7 chaînes' });
  assert.equal(countryPlayback({ channelCount: 2, directWebCount: 5 }).inBrowser, 2);
  assert.equal(countryPlayback(undefined).totalLabel, '0 chaîne');
});

test('pluriel et noms courts de la grille', () => {
  assert.equal(channelCountLabel(1), '1 chaîne');
  assert.equal(channelCountLabel(2), '2 chaînes');
  assert.equal(gridCountryName({ code: 'CD', name: 'République démocratique du Congo' }), 'RD Congo');
  assert.equal(gridCountryName({ code: 'SN', name: 'Sénégal' }), 'Sénégal');
});

const regional = [
  { code: 'SN', name: 'Sénégal', region: 'Afrique de l’Ouest' },
  { code: 'CI', name: 'Côte d’Ivoire', region: 'Afrique de l’Ouest' },
  { code: 'CD', name: 'République démocratique du Congo', region: 'Afrique centrale' },
  { code: 'CF', name: 'République centrafricaine', region: 'Afrique centrale' },
  { code: 'MA', name: 'Maroc', region: 'Afrique du Nord' },
];
const grid = { pinned: [regional[0]], others: regional.slice(1) };

test('la recherche ignore accents et casse, accepte le code pays et les noms d’usage', () => {
  assert.deepEqual(codes(filterCountryGrid(grid, 'senegal', null).pinned), ['SN']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'COTE', null).others), ['CI']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'ma', null).others), ['MA']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'rdc', null).others), ['CD']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'RD Congo', null).others), ['CD']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'centrafrique', null).others), ['CF']);
  assert.deepEqual(filterCountryGrid(grid, 'zzz', null), { pinned: [], others: [] });
});

test('le filtre par région s’applique aux pays suivis comme aux autres, et se combine à la recherche', () => {
  assert.deepEqual(filterCountryGrid(grid, '', 'Afrique centrale'), { pinned: [], others: [regional[2], regional[3]] });
  assert.deepEqual(codes(filterCountryGrid(grid, '', 'Afrique de l’Ouest').pinned), ['SN']);
  assert.deepEqual(codes(filterCountryGrid(grid, 'congo', 'Afrique centrale').others), ['CD']);
  assert.deepEqual(filterCountryGrid(grid, '  ', null), grid);
});

test('chaque région connaît son nombre de pays ; les cinq régions du catalogue sont couvertes', () => {
  assert.deepEqual(regionCounts(regional), { 'Afrique de l’Ouest': 2, 'Afrique centrale': 2, 'Afrique du Nord': 1 });
  assert.equal(GRID_REGIONS.length, 5);
});
