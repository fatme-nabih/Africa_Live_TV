import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_RECENT_CHANNELS, parseRecentChannels, pushRecentChannel, removeRecentChannel } from './recent-channels';
import type { Channel } from '@/types/channel';

const channel = (id: string, extra: Partial<Channel> = {}): Channel => ({
  id, name: `Chaîne ${id}`, logoUrl: null, groupTitle: 'News', countryCode: 'SN',
  playbackMode: 'BROWSER', availabilityStatus: 'READY', ...extra,
});

test('la dernière chaîne regardée passe en tête, sans doublon', () => {
  const list = pushRecentChannel(pushRecentChannel([], channel('a')), channel('b'));
  assert.deepEqual(list.map(item => item.id), ['b', 'a']);
  assert.deepEqual(pushRecentChannel(list, channel('a')).map(item => item.id), ['a', 'b']);
});

test('l’historique est borné à dix chaînes', () => {
  let list: Channel[] = [];
  for (let index = 0; index < 14; index += 1) list = pushRecentChannel(list, channel(String(index)));
  assert.equal(list.length, MAX_RECENT_CHANNELS);
  assert.equal(list[0].id, '13');
  assert.equal(list.at(-1)?.id, '4');
});

test('seuls les champs publics du catalogue sont conservés (aucune URL de flux)', () => {
  const polluted = { ...channel('a'), sourceUrl: 'https://flux.example/live.m3u8', streams: [{ url: 'x' }] } as unknown as Channel;
  const [stored] = pushRecentChannel([], polluted);
  assert.deepEqual(Object.keys(stored).sort(), ['availabilityStatus', 'countryCode', 'groupTitle', 'id', 'logoUrl', 'name', 'playbackMode']);
  assert.ok(!JSON.stringify(stored).includes('m3u8'));
});

test('la lecture ignore le bruit, les doublons, les entrées invalides et les logos non http(s)', () => {
  const raw = JSON.stringify([
    channel('a'),
    { id: 'b' },
    channel('a'),
    channel('c', { logoUrl: 'https://logo.example/c.png' }),
    { ...channel('d'), extra: true },
    42,
  ]);
  assert.deepEqual(parseRecentChannels(raw).map(item => item.id), ['a', 'c']);
  assert.deepEqual(parseRecentChannels(JSON.stringify([channel('e', { logoUrl: 'ftp://logo.example/e.png' })])), []);
  assert.deepEqual(parseRecentChannels('pas du json'), []);
  assert.deepEqual(parseRecentChannels('{"a":1}'), []);
  assert.deepEqual(parseRecentChannels(null), []);
});

test('une chaîne peut être retirée de l’historique', () => {
  const list = [channel('a'), channel('b')];
  assert.deepEqual(removeRecentChannel(list, 'a').map(item => item.id), ['b']);
  assert.deepEqual(removeRecentChannel(list, 'zzz').map(item => item.id), ['a', 'b']);
});
