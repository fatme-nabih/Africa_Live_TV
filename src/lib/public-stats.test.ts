import assert from 'node:assert/strict';
import test from 'node:test';

import { formatCount, summarizePublicStats } from './public-stats';

test('public stats count channels, African countries and categories from aggregated rows', () => {
  const stats = summarizePublicStats([
    { countryCode: 'SN', groupTitle: 'News', count: 12 },
    { countryCode: 'sn', groupTitle: 'Music;Entertainment', count: 3 },
    { countryCode: 'CI', groupTitle: 'Sports', count: 4 },
    { countryCode: 'FR', groupTitle: 'News;Business', count: 20 },
    { countryCode: null, groupTitle: null, count: 5 },
    { countryCode: 'NG', groupTitle: 'Movies', count: 2 },
    { countryCode: 'NG', groupTitle: 'Series', count: 1 },
  ], new Date('2026-10-03T12:00:00Z'));
  assert.equal(stats.totalChannels, 47);
  assert.equal(stats.africanChannels, 22);
  assert.equal(stats.africanCountries, 3);
  assert.deepEqual(stats.categories, { news: 32, sports: 4, music: 3, movies: 3 });
  assert.equal(stats.updatedAt, '2026-10-03T12:00:00.000Z');
});

test('public stats ignore empty or invalid counts', () => {
  const stats = summarizePublicStats([
    { countryCode: 'SN', groupTitle: 'News', count: 0 },
    { countryCode: 'GH', groupTitle: 'News', count: Number.NaN },
    { countryCode: 'KE', groupTitle: 'News', count: -4 },
  ]);
  assert.equal(stats.totalChannels, 0);
  assert.equal(stats.africanCountries, 0);
});

test('public counts use French digit grouping', () => {
  assert.match(formatCount(14205), /^14\s205$/u);
  assert.equal(formatCount(42), '42');
});
