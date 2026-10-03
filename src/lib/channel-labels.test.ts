import assert from 'node:assert/strict';
import test from 'node:test';

import { uniqueChannelLabels } from './channel-labels';

const c = (id: string, name: string, countryCode: string | null) => ({ id, name, countryCode });

test('les noms déjà uniques restent inchangés', () => {
  const labels = uniqueChannelLabels([c('1', 'RTS 1', 'SN'), c('2', '2STV', 'SN')]);
  assert.equal(labels.get('1'), 'RTS 1');
  assert.equal(labels.get('2'), '2STV');
});

test('deux chaînes de même nom se distinguent par leur pays', () => {
  const labels = uniqueChannelLabels([c('1', 'Canal Info', 'SN'), c('2', 'Canal Info', 'CI'), c('3', 'RTS 1', 'SN')]);
  assert.equal(labels.get('1'), 'Canal Info, Sénégal');
  assert.equal(labels.get('2'), 'Canal Info, Côte d’Ivoire');
  assert.equal(labels.get('3'), 'RTS 1');
});

test('même nom et même pays : numérotation stable dans l’ordre de la liste', () => {
  const labels = uniqueChannelLabels([c('1', '2M Monde', 'MA'), c('2', '2M Monde', 'MA'), c('3', '2M Monde', 'FR')]);
  assert.equal(labels.get('1'), '2M Monde, Maroc n° 1');
  assert.equal(labels.get('2'), '2M Monde, Maroc n° 2');
  assert.equal(labels.get('3'), '2M Monde, France');
});

test('un pays absent est désigné « International » ; tous les libellés produits sont uniques', () => {
  const list = [c('1', 'Mix', null), c('2', 'Mix', null), c('3', 'Mix', 'SN'), c('4', 'A', 'SN')];
  const labels = uniqueChannelLabels(list);
  assert.equal(labels.get('1'), 'Mix, International n° 1');
  assert.equal(new Set(labels.values()).size, list.length);
});
