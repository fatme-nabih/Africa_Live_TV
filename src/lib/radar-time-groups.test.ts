import assert from 'node:assert/strict';
import test from 'node:test';

import { formatRadarClock, groupByTime, radarTimeGroup } from './radar-time-groups';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const iso = (time: number) => new Date(time).toISOString();

test('radar time groups follow the age, then the reader’s calendar day', () => {
  const now = at(2026, 10, 5, 19, 0);
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 18, 30)), now), 'hour');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 18, 0)), now), 'recent');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 16, 1)), now), 'recent');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 8, 0)), now), 'today');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 4, 21, 0)), now), 'yesterday');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 3, 21, 0)), now), 'older');
  // Une heure future (horloge de l'éditeur en avance) reste dans la dernière heure.
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 19, 10)), now), 'hour');
});

test('just after midnight, a dispatch from two hours ago is recent, not yesterday', () => {
  const now = at(2026, 10, 6, 0, 30);
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 22, 45)), now), 'recent');
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 20, 0)), now), 'yesterday');
});

test('unknown dates and an unhydrated clock produce no group', () => {
  assert.equal(radarTimeGroup(null, at(2026, 10, 5, 19)), null);
  assert.equal(radarTimeGroup('pas une date', at(2026, 10, 5, 19)), null);
  assert.equal(radarTimeGroup(iso(at(2026, 10, 5, 18)), 0), null);
  assert.equal(formatRadarClock(iso(at(2026, 10, 5, 18, 5)), 0), '');
  assert.equal(formatRadarClock(iso(at(2026, 10, 5, 18, 5)), at(2026, 10, 5, 19)), '18:05');
});

test('groupByTime keeps the order and merges consecutive dispatches only', () => {
  const now = at(2026, 10, 5, 19, 0);
  const items = [at(2026, 10, 5, 18, 50), at(2026, 10, 5, 18, 20), at(2026, 10, 5, 17, 0), at(2026, 10, 5, 9, 0)].map(iso);
  const sections = groupByTime(items, item => item, now);
  assert.deepEqual(sections.map(section => [section.group, section.items.length]), [['hour', 2], ['recent', 1], ['today', 1]]);
  assert.deepEqual(groupByTime(items, item => item, 0).map(section => [section.group, section.items.length]), [[null, 4]]);
});
