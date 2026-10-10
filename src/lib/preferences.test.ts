import assert from 'node:assert/strict';
import test from 'node:test';
import { SafeStorage } from './safe-storage';
import { retryAfterDeadline, FAVORITE_MUTATION_LIMIT } from './preference-contracts';
import { acknowledgeFavoriteIntents } from './favorite-sync';
import { EMPTY_PREFERENCES } from './preference-store';
import { legacyChoicesReady, missingLegacyChoices, settleLegacyImport, type LegacyImport } from './legacy-preferences';
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

const imported: LegacyImport = { countries:['CI'],favorites:['old'],status:'pending',remainingCountries:[],remainingFavorites:[] };
test('legacy: a persisted optimistic cache never replaces the current account read', () => {
  const cached = { ...EMPTY_PREFERENCES,countries:['CI'],favorites:['old'],legacyImport:imported };
  assert.equal(legacyChoicesReady(imported,cached),false);
  assert.equal(settleLegacyImport(cached).legacyImport?.status,'pending');
  assert.deepEqual(missingLegacyChoices({countries:['SN','CI'],favorites:['old','new']},cached),{countries:['SN'],favorites:['new']});
});
test('legacy: confirmation requires both server replies and acknowledged intentions', () => {
  const ready = { ...EMPTY_PREFERENCES,loaded:{countries:true,favorites:true},countries:['CI'],favorites:['old'],legacyImport:imported };
  assert.equal(settleLegacyImport({...ready,favoriteIntents:{old:{desired:true,revision:'pending'}}}).legacyImport?.status,'pending');
  assert.equal(settleLegacyImport({...ready,errors:{countries:null,favorites:'outage'}}).legacyImport?.status,'pending');
  assert.equal(settleLegacyImport(ready).legacyImport?.status,'complete');
  assert.equal(settleLegacyImport(ready).legacyHandled,true);
});
test('legacy: a partial import records missing countries and favorites without claiming success', () => {
  const result = settleLegacyImport({ ...EMPTY_PREFERENCES,loaded:{countries:true,favorites:true},legacyImport:imported,rejectedFavorites:['old'] });
  assert.equal(result.legacyHandled,false);
  assert.deepEqual(result.legacyImport,{...imported,status:'partial',remainingCountries:['CI'],remainingFavorites:['old']});
});
test('legacy: a favorite id matching an Object method cannot keep a completed import pending', () => {
  const result = settleLegacyImport({ ...EMPTY_PREFERENCES,loaded:{countries:false,favorites:true},favorites:['toString'],legacyImport:{...imported,countries:[],favorites:['toString']} });
  assert.equal(result.legacyImport?.status,'complete');
});
test('legacy: resolving a partial import through another preference control updates the confirmation', () => {
  const partial: LegacyImport = {...imported,status:'partial',remainingCountries:[],remainingFavorites:['old']};
  const base = {...EMPTY_PREFERENCES,loaded:{countries:true,favorites:true},countries:['CI'],legacyImport:partial};
  const retried = settleLegacyImport({...base,favoriteIntents:{old:{desired:true,revision:'retry'}}});
  assert.equal(retried.legacyImport?.status,'pending');
  const confirmed = settleLegacyImport({...retried,favoriteIntents:{},favorites:['old']});
  assert.equal(confirmed.legacyImport?.status,'complete');
  assert.deepEqual(confirmed.legacyImport?.remainingFavorites,[]);
});
