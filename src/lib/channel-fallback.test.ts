import assert from 'node:assert/strict';
import test from 'node:test';

import { channelInitials, FALLBACK_TONES, fallbackTone } from './channel-fallback';

test('les initiales viennent des deux premiers mots, sans accents ni ponctuation', () => {
  assert.equal(channelInitials('Radio Télévision Sénégalaise'), 'RT');
  assert.equal(channelInitials('&TV International'), 'TI');
  assert.equal(channelInitials('2STV'), '2S');
  assert.equal(channelInitials('Canal+ Afrique'), 'CA');
  assert.equal(channelInitials('Été-Sport'), 'ES');
});

test('un nom sans lettre exploitable donne « TV » ; un mot seul donne ses deux premières lettres', () => {
  assert.equal(channelInitials(''), 'TV');
  assert.equal(channelInitials('   '), 'TV');
  assert.equal(channelInitials('***'), 'TV');
  assert.equal(channelInitials('Africanews'), 'AF');
});

test('la teinte est stable par pays, insensible à la casse, et reste dans la palette de la marque', () => {
  assert.equal(fallbackTone('SN'), fallbackTone('sn'));
  assert.ok((FALLBACK_TONES as readonly string[]).includes(fallbackTone('SN')));
  assert.ok(new Set(['SN', 'CI', 'ML', 'CM', 'GH', 'KE', 'NG', 'MA'].map(fallbackTone)).size > 1);
  assert.equal(fallbackTone(null), 'from-surface-3 via-surface-2 to-surface-1');
});
