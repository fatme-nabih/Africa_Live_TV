import assert from 'node:assert/strict';
import test from 'node:test';

import { migrateLegacyStorage, STORAGE_KEYS } from './storage-keys';

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}

test('les clés iptv_* sont migrées vers al_* et les favoris sont conservés', () => {
  const storage = fakeStorage({
    iptv_favorites: '["chan-1","chan-2"]',
    iptv_favorites_pending: '{"chan-3":true}',
    iptv_favorites_server_migrated: 'true',
    iptv_vlc_notice_dismissed: 'true',
  });
  assert.equal(migrateLegacyStorage(storage), 4);
  assert.equal(storage.getItem(STORAGE_KEYS.favorites), '["chan-1","chan-2"]');
  assert.equal(storage.getItem(STORAGE_KEYS.favoritesPending), '{"chan-3":true}');
  assert.equal(storage.getItem(STORAGE_KEYS.favoritesMigrated), 'true');
  assert.equal(storage.getItem(STORAGE_KEYS.vlcNoticeDismissed), 'true');
  assert.deepEqual([...storage.data.keys()].filter(key => key.startsWith('iptv_')), []);
});

test('une valeur al_* existante n’est jamais écrasée par l’ancienne', () => {
  const storage = fakeStorage({ iptv_favorites: '["old"]', al_favorites: '["new"]' });
  assert.equal(migrateLegacyStorage(storage), 0);
  assert.equal(storage.getItem(STORAGE_KEYS.favorites), '["new"]');
  assert.equal(storage.getItem('iptv_favorites'), null);
});

test('la migration est idempotente et ignore les autres clés', () => {
  const storage = fakeStorage({ iptv_favorites: '["a"]', theme: 'dark' });
  assert.equal(migrateLegacyStorage(storage), 1);
  assert.equal(migrateLegacyStorage(storage), 0);
  assert.equal(storage.getItem(STORAGE_KEYS.favorites), '["a"]');
  assert.equal(storage.getItem('theme'), 'dark');
});

test('un stockage qui lève une exception n’interrompt pas l’application', () => {
  const broken = {
    getItem: () => { throw new Error('SecurityError'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('SecurityError'); },
  };
  assert.equal(migrateLegacyStorage(broken), 0);
});

test('sans ancienne clé, rien n’est écrit', () => {
  const storage = fakeStorage();
  assert.equal(migrateLegacyStorage(storage), 0);
  assert.equal(storage.data.size, 0);
});
