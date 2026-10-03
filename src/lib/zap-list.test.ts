import assert from 'node:assert/strict';
import test from 'node:test';

import { readZapList, saveZapList, zapNeighbors } from './zap-list';
import type { Channel } from '@/types/channel';

const channel = (id: string): Channel => ({
  id, name: `Chaîne ${id}`, logoUrl: null, groupTitle: 'News', countryCode: 'SN', playbackMode: 'BROWSER', availabilityStatus: 'READY',
});

function memory() {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

test('la liste enregistrée ne garde que les champs publics du catalogue, jamais d’URL de flux', () => {
  const storage = memory();
  const polluted = { ...channel('a'), sourceUrl: 'https://flux.example/a.m3u8', streams: [{ url: 'x' }] } as unknown as Channel;
  saveZapList([polluted, channel('b')], storage, 1_000);
  const raw = storage.getItem('al_zap_list')!;
  assert.ok(!raw.includes('m3u8') && !raw.includes('sourceUrl') && !raw.includes('streams'));
  assert.deepEqual(readZapList(storage, 2_000).map(item => item.id), ['a', 'b']);
});

test('la liste expire après six heures', () => {
  const storage = memory();
  saveZapList([channel('a')], storage, 0);
  assert.equal(readZapList(storage, 6 * 3_600_000).length, 1);
  assert.equal(readZapList(storage, 6 * 3_600_000 + 1).length, 0);
});

test('la lecture ignore le bruit et les doublons ; la liste est bornée à 60 chaînes', () => {
  const storage = memory();
  storage.setItem('al_zap_list', JSON.stringify({ savedAt: 1, entries: [channel('a'), { ...channel('a'), name: 'doublon' }, { id: 3 }, null, channel('b')] }));
  assert.deepEqual(readZapList(storage, 2).map(item => item.id), ['a', 'b']);
  storage.setItem('al_zap_list', 'pas du json');
  assert.deepEqual(readZapList(storage, 2), []);
  const big = memory();
  saveZapList(Array.from({ length: 250 }, (_, index) => channel(String(index))), big, 1);
  assert.equal(readZapList(big, 2).length, 60);
});

test('un stockage qui échoue ne bloque pas l’ouverture du lecteur', () => {
  assert.doesNotThrow(() => saveZapList([channel('a')], { setItem: () => { throw new Error('QuotaExceededError'); } }));
  assert.deepEqual(readZapList({ getItem: () => { throw new Error('SecurityError'); } }), []);
});

test('les voisins suivent la liste ; hors liste, il n’y a pas de zapping', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(zapNeighbors(list, 'b'), { previous: { id: 'a' }, next: { id: 'c' } });
  assert.deepEqual(zapNeighbors(list, 'a'), { previous: null, next: { id: 'b' } });
  assert.deepEqual(zapNeighbors(list, 'c'), { previous: { id: 'b' }, next: null });
  assert.deepEqual(zapNeighbors(list, 'z'), { previous: null, next: null });
});
