import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogSearchHref, searchArticles, searchCities, searchCountries } from './universal-search';

test('countries match names, codes and common aliases without accents', () => {
  assert.equal(searchCountries('senegal')[0]?.code, 'SN');
  assert.equal(searchCountries('ivory')[0]?.code, 'CI');
  assert.equal(searchCountries('rdc')[0]?.code, 'CD');
  assert.deepEqual(searchCountries('   '), []);
});

test('weather cities match by city name only', () => {
  assert.deepEqual(searchCities('dak'), [{ city: 'Dakar', code: 'SN', countryName: 'Sénégal' }]);
  assert.deepEqual(searchCities('zzz'), []);
});

test('articles need every word, keep https links only, newest first and without duplicates', () => {
  const articles = [
    { title: 'Lions de la Teranga : victoire à Dakar', url: 'https://a.example/1', sourceName: 'A', publishedAt: '2026-10-03T08:00:00Z' },
    { title: 'Les Lions préparent la CAN', url: 'https://b.example/2', sourceName: 'B', publishedAt: '2026-10-03T10:00:00Z' },
    { title: 'Lions : doublon', url: 'https://b.example/2', sourceName: 'B', publishedAt: '2026-10-03T09:00:00Z' },
    { title: 'Lions en http', url: 'http://c.example/3', sourceName: 'C', publishedAt: '2026-10-03T11:00:00Z' },
    { title: 'Lions : relais suivi', url: 'https://b.example/2?utm_source=relais', sourceName: 'B', publishedAt: '2026-10-03T07:00:00Z' },
  ];
  assert.deepEqual(searchArticles(articles, 'lions').map(hit => hit.url), ['https://b.example/2', 'https://a.example/1']);
  assert.deepEqual(searchArticles(articles, 'lions dakar').map(hit => hit.url), ['https://a.example/1']);
  assert.deepEqual(searchArticles(articles, 'l'), []);
});

test('catalog search link is encoded and bounded', () => {
  assert.equal(catalogSearchHref(' Lions & co '), '/app?search=Lions%20%26%20co');
  assert.equal(catalogSearchHref('x'.repeat(300)).length, '/app?search='.length + 200);
});
