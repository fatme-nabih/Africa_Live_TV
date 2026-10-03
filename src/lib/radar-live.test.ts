import assert from 'node:assert/strict';
import test from 'node:test';

import { featuredKeys, pickFeatured } from './radar-featured';
import { splitArrivals } from './radar-fresh';
import { countSince, isNewSince, parseVisit, visitIsBeyondWindow } from './radar-visit';
import { formatAgo } from './relative-time';
import { weatherAlert } from './weather-alert';
import type { RadarArticle } from './live-osint-types';

const BASE = Date.parse('2026-10-03T12:00:00Z');
const at = (minutesAgo: number) => new Date(BASE - minutesAgo * 60_000).toISOString();
const article = (id: string, minutesAgo: number, extra: Partial<RadarArticle> = {}): RadarArticle => ({
  title: id, url: `https://example.org/${id}`, domain: 'example.org', sourceName: `Rédaction ${id}`,
  indexedAt: at(minutesAgo), publishedAt: at(minutesAgo), countryCode: 'SN', ...extra,
});

test('l’âge d’une dépêche se lit en langage courant', () => {
  assert.equal(formatAgo(at(0), BASE), 'à l’instant');
  assert.equal(formatAgo(at(12), BASE), 'il y a 12 min');
  assert.equal(formatAgo(at(60), BASE), 'il y a 1 h');
  assert.equal(formatAgo(at(5 * 60 + 30), BASE), 'il y a 5 h');
  assert.equal(formatAgo(at(26 * 60), BASE), 'hier');
  assert.equal(formatAgo(at(50 * 60), BASE), 'il y a 2 j');
  assert.equal(formatAgo(at(-30), BASE), 'à l’instant');
  assert.equal(formatAgo(null, BASE), '');
  assert.equal(formatAgo('pas une date', BASE), '');
  assert.equal(formatAgo(at(5), 0), '');
});

test('« À la une » varie les rédactions et garde l’ordre chronologique', () => {
  const list = [
    article('a1', 5, { sourceName: 'APS' }), article('a2', 10, { sourceName: 'APS' }),
    article('b1', 20, { sourceName: 'RFI' }), article('c1', 30, { sourceName: 'Ecofin' }),
  ];
  assert.deepEqual(pickFeatured(list).map(item => item.title), ['a1', 'b1', 'c1']);
  const sameSource = [article('x1', 5, { sourceName: 'APS' }), article('x2', 6, { sourceName: 'APS' }), article('x3', 7, { sourceName: 'APS' }), article('x4', 8, { sourceName: 'APS' })];
  assert.deepEqual(pickFeatured(sameSource).map(item => item.title), ['x1', 'x2', 'x3']);
  assert.deepEqual(pickFeatured([]), []);
  assert.deepEqual(pickFeatured([article('seul', 1)]).map(item => item.title), ['seul']);
});

test('une dépêche illustrée récente prend la tête si la première n’a pas d’image', () => {
  const list = [
    article('texte', 5, { sourceName: 'APS' }),
    article('photo', 40, { sourceName: 'RFI', imageUrl: 'https://cdn.example.org/p.jpg' }),
    article('ancienne-photo', 400, { sourceName: 'BBC', imageUrl: 'https://cdn.example.org/q.jpg' }),
  ];
  assert.deepEqual(pickFeatured(list).map(item => item.title), ['photo', 'texte', 'ancienne-photo']);
  const far = [article('texte', 5, { sourceName: 'APS' }), article('ancienne-photo', 400, { sourceName: 'BBC', imageUrl: 'https://cdn.example.org/q.jpg' })];
  assert.deepEqual(pickFeatured(far).map(item => item.title), ['texte', 'ancienne-photo']);
  assert.equal(featuredKeys(pickFeatured(list)).has('https://example.org/photo'), true);
});

test('la dernière visite n’est reconnue que si elle est plausible', () => {
  assert.equal(parseVisit(String(BASE - 3_600_000), BASE), BASE - 3_600_000);
  for (const raw of [null, '', 'abc', '0', '-5', String(BASE + 1)]) assert.equal(parseVisit(raw, BASE), null, String(raw));
});

test('les nouvelles depuis la visite ne comptent que les dépêches publiées après', () => {
  const since = BASE - 60 * 60_000;
  const list = [article('n1', 10), article('n2', 59), article('o1', 61), article('o2', 600)];
  assert.equal(countSince(list, since), 2);
  assert.equal(countSince(list, null), null);
  assert.equal(countSince([], since), 0);
  assert.equal(isNewSince(list[0], since), true);
  assert.equal(isNewSince(list[2], since), false);
  assert.equal(isNewSince(list[0], null), false);
  assert.equal(visitIsBeyondWindow(BASE - 30 * 3_600_000, BASE), true);
  assert.equal(visitIsBeyondWindow(BASE - 2 * 3_600_000, BASE), false);
  assert.equal(visitIsBeyondWindow(null, BASE), false);
});

test('l’alerte météo ne signale que les phénomènes marquants, jamais un ciel ordinaire', () => {
  const calm = { weatherCode: 0, weatherIcon: 'clear' as const, windSpeedKmh: 12, precipitationMm: 0, temperatureC: 31 };
  assert.equal(weatherAlert(calm), null);
  assert.equal(weatherAlert({ ...calm, weatherCode: 61, weatherIcon: 'rain', precipitationMm: 1.2 }), null);
  assert.equal(weatherAlert({ ...calm, weatherCode: 95, weatherIcon: 'storm' })?.label, 'Orage');
  assert.equal(weatherAlert({ ...calm, weatherCode: null, weatherIcon: 'storm' })?.label, 'Orage');
  assert.equal(weatherAlert({ ...calm, weatherCode: 82, weatherIcon: 'rain', precipitationMm: 9 })?.label, 'Fortes pluies');
  assert.equal(weatherAlert({ ...calm, precipitationMm: 8 })?.label, 'Fortes pluies');
  assert.deepEqual(weatherAlert({ ...calm, windSpeedKmh: 72 }), { label: 'Vent fort', detail: '72 km/h' });
  assert.equal(weatherAlert({ ...calm, temperatureC: 46 })?.label, 'Chaleur extrême');
  assert.equal(weatherAlert({ ...calm, weatherIcon: 'storm', windSpeedKmh: 90 })?.label, 'Orage');
});

test('les arrivées en attente ne bougent pas la liste lue', () => {
  const key = (value: string) => value;
  const released = new Set(['b', 'c']);
  assert.deepEqual(splitArrivals(['a', 'b', 'c'], key, released), { shown: ['b', 'c'], pending: ['a'] });
  assert.deepEqual(splitArrivals(['a', 'b'], key, null), { shown: ['a', 'b'], pending: [] });
  assert.deepEqual(splitArrivals(['c'], key, released), { shown: ['c'], pending: [] });
  assert.deepEqual(splitArrivals([], key, released), { shown: [], pending: [] });
});

test('l’activité 24 h règle la pulsation : rien, discret, actif, très actif', async () => {
  const { activityTier } = await import('./radar-activity');
  assert.deepEqual([0, 1, 2, 3, 7, 8, 40].map(activityTier), [0, 1, 1, 2, 2, 3, 3]);
  assert.equal(activityTier(-4), 0);
  assert.equal(activityTier(Number.NaN), 0);
});

test('la chaîne du direct du pays est une chaîne prête qui se lit dans le navigateur', async () => {
  const { pickLiveChannel } = await import('./country-live');
  const channel = (id: string, playbackMode: 'BROWSER' | 'EXTERNAL', availabilityStatus: 'READY' | 'OFFLINE' | 'TEMPORARY_FAILURE') => ({
    id, name: id, logoUrl: null, groupTitle: null, countryCode: 'SN', playbackMode, availabilityStatus,
  });
  assert.equal(pickLiveChannel([]), null);
  assert.equal(pickLiveChannel([channel('vlc', 'EXTERNAL', 'READY'), channel('web-ko', 'BROWSER', 'TEMPORARY_FAILURE'), channel('web', 'BROWSER', 'READY')])?.id, 'web');
  assert.equal(pickLiveChannel([channel('off', 'BROWSER', 'OFFLINE'), channel('vlc', 'EXTERNAL', 'READY')])?.id, 'vlc');
  assert.equal(pickLiveChannel([channel('off', 'BROWSER', 'OFFLINE')])?.id, 'off');
  assert.equal(pickLiveChannel([channel('a', 'BROWSER', 'READY'), channel('b', 'BROWSER', 'READY')])?.id, 'a');
});
