import assert from 'node:assert/strict';
import test from 'node:test';
import { SafeStorage } from './safe-storage';
import { retryAfterDeadline, FAVORITE_MUTATION_LIMIT } from './preference-contracts';
import { acknowledgeFavoriteIntents } from './favorite-sync';
test('B08: Storage getter, all methods, invalid JSON and unavailable SSR retain usable memory', () => {
  const getter = new SafeStorage(() => { throw new Error('SecurityError'); });
  assert.equal(getter.writeJson('key',['SN']),false);
  assert.deepEqual(getter.readJson('key',value => Array.isArray(value) ? value : null,[]).value,['SN']);
  assert.equal(getter.write('key',null),false); assert.equal(getter.read('key').value,null);
  for (const method of ['getItem','setItem','removeItem']) {
    const data = new Map<string,string>([['key','invalid-json']]);
    const storage = { getItem: (key:string) => data.get(key) ?? null, setItem: (key:string,value:string) => { data.set(key,value); }, removeItem: (key:string) => { data.delete(key); } };
    Object.assign(storage,{ [method]: () => { throw new Error('denied'); } });
    const safe = new SafeStorage(() => storage);
    assert.doesNotThrow(() => safe.readJson('key',value => Array.isArray(value) ? value : null,[]));
    safe.writeJson('key',['CI']);
    assert.deepEqual(safe.readJson('key',value => Array.isArray(value) ? value : null,[]).value,['CI']);
    safe.write('key',null); assert.equal(safe.read('key').value,null);
  }
  assert.equal(new SafeStorage(() => null).writeJson('key',[]),false);
});
test('B11: seconds/date deadlines are exact, invalid headers have a finite fallback', () => {
  const now = Date.parse('2026-10-09T10:00:00Z');
  assert.equal(retryAfterDeadline('1',now),now+1000);
  assert.equal(retryAfterDeadline('Fri, 09 Oct 2026 10:00:02 GMT',now),now+2000);
  for (const value of [null,'invalid','-1','Infinity']) assert.equal(retryAfterDeadline(value,now),now+5000);
});
test('B07: acknowledgment removes only unchanged revisions; contract limit remains 100', () => {
  assert.equal(FAVORITE_MUTATION_LIMIT,100);
  assert.deepEqual(acknowledgeFavoriteIntents({ a: { desired:false,revision:'new' }, b: { desired:true,revision:'sent' } }, { a: { desired:true,revision:'old' },b: { desired:true,revision:'sent' } }),{ a: { desired:false,revision:'new' } });
});
