import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogRequestSchema } from './api-contracts';
import { EMPTY_CATALOG_FILTERS } from './catalog-filter-state';
import {
  clearTvRowCache,
  isCatalogHome,
  readTvRowCache,
  TV_ROW_IDS,
  TV_ROW_LIMIT,
  TV_ROWS_CACHE_TTL_MS,
  tvRowCacheKey,
  tvRowRequest,
  tvRowTitle,
  writeTvRowCache,
} from './tv-rows';
import type { Channel } from '@/types/channel';

const channel = (id: string): Channel => ({ id, name: id, logoUrl: null, groupTitle: 'News', countryCode: 'SN', playbackMode: 'BROWSER', availabilityStatus: 'READY' });

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

test('chaque rangée est une requête valide du catalogue existant, bornée à 12 chaînes', () => {
  for (const id of TV_ROW_IDS) {
    const parsed = catalogRequestSchema.parse(tvRowRequest(id, 'CI'));
    assert.equal(parsed.limit, TV_ROW_LIMIT);
    assert.equal(parsed.cursor, null);
    assert.equal(parsed.search, '');
  }
  assert.equal(tvRowRequest('favorites').favoritesOnly, true);
  assert.equal(tvRowRequest('country', 'CI').country, 'CI');
  assert.equal(tvRowRequest('country').country, 'SN');
  assert.deepEqual(['news', 'sports', 'music'].map(id => catalogRequestSchema.parse(tvRowRequest(id as 'news', 'SN')).group), ['News', 'Sports', 'Music']);
});

test('les titres de rangées sont humains et nomment le pays suivi', () => {
  assert.equal(tvRowTitle('country', 'Côte d’Ivoire'), 'Côte d’Ivoire en direct');
  assert.deepEqual(TV_ROW_IDS.filter(id => id !== 'country').map(id => tvRowTitle(id)), ['Mes favoris', 'Info', 'Sport', 'Musique']);
});

test('l’accueil est l’état sans recherche, filtre ni favoris seuls', () => {
  assert.equal(isCatalogHome(EMPTY_CATALOG_FILTERS, false), true);
  assert.equal(isCatalogHome(EMPTY_CATALOG_FILTERS, true), false);
  for (const patch of [{ search: 'tf' }, { country: 'SN' }, { group: 'News' }, { language: 'fr' }, { status: 'VLC_ONLY' as const }, { region: 'africa' as const }]) {
    assert.equal(isCatalogHome({ ...EMPTY_CATALOG_FILTERS, ...patch }, false), false, JSON.stringify(patch));
  }
});

test('le cache de rangées expire après cinq minutes et ignore les entrées invalides', () => {
  const storage = memory();
  writeTvRowCache(storage, 'news', [channel('a'), channel('b')], 1_000);
  assert.deepEqual(readTvRowCache(storage, 'news', 1_000 + TV_ROWS_CACHE_TTL_MS)?.map(item => item.id), ['a', 'b']);
  assert.equal(readTvRowCache(storage, 'news', 1_001 + TV_ROWS_CACHE_TTL_MS), null);
  assert.equal(readTvRowCache(storage, 'sports', 1_000), null);
  storage.setItem('al_tv_rows', JSON.stringify({ news: { at: 1_000, channels: [channel('a'), { id: 'b' }, 7] } }));
  assert.deepEqual(readTvRowCache(storage, 'news', 1_001)?.map(item => item.id), ['a']);
  storage.setItem('al_tv_rows', 'pas du json');
  assert.equal(readTvRowCache(storage, 'news', 1_001), null);
});

test('le cache du pays suivi est propre à chaque pays ; il peut être vidé', () => {
  assert.equal(tvRowCacheKey('country', 'SN'), 'country:SN');
  assert.equal(tvRowCacheKey('news', 'SN'), 'news');
  const storage = memory();
  writeTvRowCache(storage, 'country:SN', [channel('a')]);
  writeTvRowCache(storage, 'country:CI', [channel('b')]);
  assert.deepEqual(readTvRowCache(storage, 'country:CI')?.map(item => item.id), ['b']);
  clearTvRowCache(storage);
  assert.equal(readTvRowCache(storage, 'country:CI'), null);
  assert.doesNotThrow(() => writeTvRowCache({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }, 'news', [channel('a')]));
});
