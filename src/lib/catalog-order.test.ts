import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AFRICAN_COUNTRY_CODES,
  africaRank,
  catalogCursorContext,
  decodeCatalogCursor,
  encodeCatalogCursor,
  usesAfricaFirstOrder,
} from './catalog-query';
import { AFRICAN_COUNTRIES } from './radar-countries';

const context = catalogCursorContext({
  userId: 'u', clerkSessionId: null, search: '', country: '', group: '', language: '', status: '', favoritesOnly: false,
});

test('l’ordre « Afrique d’abord » est le défaut ; une recherche ou les favoris gardent l’ordre par nom', () => {
  assert.equal(usesAfricaFirstOrder({ search: '', favoritesOnly: false }), true);
  assert.equal(usesAfricaFirstOrder({ search: '   ', favoritesOnly: false }), true);
  assert.equal(usesAfricaFirstOrder({ search: 'tf1', favoritesOnly: false }), false);
  assert.equal(usesAfricaFirstOrder({ search: '', favoritesOnly: true }), false);
});

test('le rang place l’Afrique avant le reste du monde, pays absent compris', () => {
  assert.equal(africaRank('SN'), 0);
  assert.equal(africaRank('ci'), 0);
  assert.equal(africaRank('FR'), 1);
  assert.equal(africaRank(null), 1);
  assert.equal(africaRank(undefined), 1);
  assert.equal(africaRank(''), 1);
  assert.equal(AFRICAN_COUNTRY_CODES.length, AFRICAN_COUNTRIES.length);
  assert.ok(AFRICAN_COUNTRY_CODES.every(code => africaRank(code) === 0));
});

test('le curseur transporte le rang et rejette un rang hors bornes ou altéré', () => {
  const encoded = encodeCatalogCursor({ name: 'Canal', id: 'c1', rank: 1 }, context);
  assert.deepEqual(decodeCatalogCursor(encoded, context), { name: 'Canal', id: 'c1', rank: 1 });
  assert.throws(() => encodeCatalogCursor({ name: 'Canal', id: 'c1', rank: 2 }, context));
  const [payload, signature] = encoded.split('.');
  const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url').toString()), rank: 0 })).toString('base64url');
  assert.throws(() => decodeCatalogCursor(`${tampered}.${signature}`, context), /INVALID_CATALOG_CURSOR/);
});

test('un curseur sans rang garde exactement sa forme historique', () => {
  const encoded = encodeCatalogCursor({ name: 'Canal', id: 'c1' }, context);
  assert.deepEqual(decodeCatalogCursor(encoded, context), { name: 'Canal', id: 'c1' });
  assert.ok(!('rank' in decodeCatalogCursor(encoded, context)!));
});
