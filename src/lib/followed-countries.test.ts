import assert from 'node:assert/strict';
import test from 'node:test';

import { makePrimaryCountry, MAX_FOLLOWED_COUNTRIES, parseFollowedCountries, toggleFollowedCountry } from './followed-countries';

const VALID = new Set(['SN', 'CI', 'ML', 'GN', 'NG', 'KE', 'MA']);

test('stored value keeps known codes only, uppercased, without duplicates and bounded to 5', () => {
  assert.deepEqual(parseFollowedCountries('["sn","CI","XX","SN",4,"ML","GN","NG","KE"]', VALID), ['SN', 'CI', 'ML', 'GN', 'NG']);
  assert.deepEqual(parseFollowedCountries('pas du json', VALID), []);
  assert.deepEqual(parseFollowedCountries('{"SN":true}', VALID), []);
  assert.deepEqual(parseFollowedCountries(null, VALID), []);
});

test('toggle follows at the end, unfollows, and refuses a sixth country', () => {
  assert.deepEqual(toggleFollowedCountry([], 'SN'), ['SN']);
  assert.deepEqual(toggleFollowedCountry(['SN', 'CI'], 'SN'), ['CI']);
  const full = ['SN', 'CI', 'ML', 'GN', 'NG'];
  assert.equal(full.length, MAX_FOLLOWED_COUNTRIES);
  assert.deepEqual(toggleFollowedCountry(full, 'KE'), full);
});

test('a followed country can become the primary one', () => {
  assert.deepEqual(makePrimaryCountry(['SN', 'CI', 'ML'], 'ML'), ['ML', 'SN', 'CI']);
  assert.deepEqual(makePrimaryCountry(['SN'], 'KE'), ['SN']);
});
