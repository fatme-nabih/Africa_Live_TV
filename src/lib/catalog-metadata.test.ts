import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryCodes, categoryLabel, catalogLanguageCodes, catalogLanguageLabel, metadataValuesMatching } from './catalog-metadata';
import { catalogFiltersFromUrl, catalogFilterUrl, catalogPreset, EMPTY_CATALOG_FILTERS, catalogCountryHref } from './catalog-filter-state';
import { catalogCursorContext, encodeCatalogCursor, decodeCatalogCursor } from './catalog-query';

test('category facets and matching share composites, aliases, accents, case and unknowns without altering raw values', () => {
  const raw = ['Business;News', ' ACTUALITÉS ', 'news;News', 'Undefined', '', null, 'Local Shows'];
  assert.deepEqual(metadataValuesMatching(raw, 'News', 'category'), raw.slice(0, 3));
  assert.deepEqual(metadataValuesMatching(raw, 'unknown', 'category'), ['Undefined', '', null]);
  assert.deepEqual(categoryCodes('Business;Actualités| news'), ['Business', 'News']);
  assert.equal(categoryLabel(categoryCodes('Local Shows')[0]), 'Catégorie non reconnue (local shows)');
  assert.deepEqual(raw, ['Business;News', ' ACTUALITÉS ', 'news;News', 'Undefined', '', null, 'Local Shows']);
});
test('languages canonicalize ISO aliases and combinations, expose null and unfamiliar codes honestly', () => {
  assert.deepEqual(catalogLanguageCodes('fra;FR|eng, français'), ['fr', 'en']);
  assert.deepEqual(metadataValuesMatching(['fra', 'fr;en', 'French', 'deu', null], 'fr', 'language'), ['fra', 'fr;en', 'French']);
  assert.deepEqual(catalogLanguageCodes(null), ['unknown']);
  assert.deepEqual(catalogLanguageCodes('Undefined'), ['unknown']);
  assert.match(catalogLanguageLabel('zzz'), /inconnu/);
  assert.match(catalogLanguageLabel('fr'), /français/);
});
test('catalog URL state synchronizes combined controls, presets, reset and context without losing unrelated params', () => {
  const state = catalogFiltersFromUrl(new URLSearchParams('country=sn&group=ACTUALITÉS&language=fra&region=africa&favorites=1'));
  assert.equal(state.filters.country, 'SN'); assert.equal(state.filters.group, 'News'); assert.equal(state.filters.language, 'fr');
  assert.equal(catalogPreset(state.filters, true), 'favorites'); assert.equal(catalogPreset(state.filters, false), 'news');
  assert.equal(catalogFilterUrl('http://localhost:3001/app?country=SN&context=radar#catalogue', EMPTY_CATALOG_FILTERS, false), '/app?context=radar#catalogue');
  assert.equal(catalogCountryHref('SN'), '/app?country=SN'); assert.equal(catalogCountryHref(null), '/app');
  assert.equal(catalogFiltersFromUrl(new URLSearchParams('country=bad&region=world')).filters.country, '');
});
test('pagination cursor binds African scope as well as combined filters and favorites', () => {
  const base = { ...EMPTY_CATALOG_FILTERS, userId: 'test', clerkSessionId: null, favoritesOnly: false };
  const all = catalogCursorContext(base), africa = catalogCursorContext({ ...base, region: 'africa' });
  assert.notEqual(all, africa);
  const cursor = encodeCatalogCursor({ name: 'Test', id: 'test' }, all);
  assert.throws(() => decodeCatalogCursor(cursor, africa), /INVALID_CATALOG_CURSOR/);
});
