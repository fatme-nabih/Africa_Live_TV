import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/db';
import * as schema from '@/db/schema';
import * as errors from './api-errors';
import { loadSource } from '../../e2e/helpers/load-source';
import { assertIntegrationTarget } from './integration-test-safety';
import { countryListVersion } from './country-version';
import { replaceAccountCountries } from './followed-countries-store';
import { SafeStorage } from './safe-storage';
import type { PreferenceStore } from './preference-store';
const enabled = process.env.L3_INTEGRATION_TEST === '1', ids: string[] = [];
before(async () => { if (enabled) await assertIntegrationTarget(pool); });
after(async () => { if (enabled) { for (const id of ids) await db.delete(schema.users).where(eq(schema.users.id,id)); await pool.end(); } });
async function user() { const id = randomUUID(); ids.push(id); await db.insert(schema.users).values({ id, clerkUserId: 'fixture-' + id }); return id; }
function handlers(file: string, userId: string) {
  const authorize = async () => ({ ok: true, user: { id: userId } });
  return loadSource(file,{ '@/db': { db }, '@/db/schema': schema, '@/lib/api-errors': errors, '@/lib/require-app-access': { authorizeAppRequest: authorize, authorizeCatalogRequest: authorize }, '@/lib/local-dev': { isLocalDevMode: () => false } }) as Record<string,(request: Request,context: unknown)=>Promise<Response>>;
}
const request = (path:string, method:string, body:unknown) => new Request('http://localhost:3001/api/' + path,{ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('B09: real country handler compares the version inside the account transaction and returns current state', { skip: !enabled },async () => {
  await assertIntegrationTarget(pool); const id = await user(), owner = 'account:' + id;
  const first = await replaceAccountCountries(id,['SN','CI'],countryListVersion([]));
  await replaceAccountCountries(id,['CI'],first.version);
  const api = handlers('app/api/followed-countries/route.ts',id);
  const conflict = await api.PUT(request('followed-countries','PUT',{ owner, countries: ['SN','CI'], baseVersion: first.version }),{});
  assert.equal(conflict.status,409); const body = await conflict.json(); assert.deepEqual(body.countries,['CI']);
  const empty = await api.PUT(request('followed-countries','PUT',{ owner,countries: [],baseVersion: body.version }),{});
  assert.equal(empty.status,200); assert.deepEqual((await empty.json()).countries,[]);
  assert.equal((await api.PUT(request('followed-countries','PUT',{ owner,countries: ['SN'] }),{})).status,409);
});
test('B10: client owner A never writes under server account B, for countries or favorites', { skip: !enabled },async () => {
  await assertIntegrationTarget(pool); const a = await user(), b = await user();
  const countries = handlers('app/api/followed-countries/route.ts',b), favorites = handlers('app/api/favorites/route.ts',b);
  assert.equal((await countries.PUT(request('followed-countries','PUT',{ owner:'account:' + a, countries:['SN'],baseVersion:countryListVersion([]) }),{})).status,409);
  assert.equal((await favorites.PATCH(request('favorites','PATCH',{ owner:'account:' + a,add:['fixture-channel'],remove:[] }),{})).status,409);
  assert.equal((await db.select().from(schema.userFollowedCountries).where(eq(schema.userFollowedCountries.userId,b))).length,0);
  assert.equal((await db.select().from(schema.userFavorites).where(eq(schema.userFavorites.userId,b))).length,0);
});

test('legacy: real synchronizer and SQL confirm only saved additions, preserve rejects and allow a retry', { skip: !enabled },async () => {
  await assertIntegrationTarget(pool);
  const id = await user(), owner = 'account:' + id;
  const saved = 'legacy-valid-' + randomUUID(), missing = 'legacy-missing-' + randomUUID();
  await db.insert(schema.channels).values({id:saved,name:'Legacy fixture',normalizedName:'legacy fixture'});
  const api = handlers('app/api/favorites/route.ts',id);
  const data = new Map<string,string>([['iptv_favorites',JSON.stringify([saved,missing])]]);
  const storage = new SafeStorage(() => ({getItem:key => data.get(key) ?? null,setItem:(key,value) => {data.set(key,value);},removeItem:key => {data.delete(key);}}));
  const exports = loadSource('lib/preference-store.ts',{'@/lib/safe-storage':{localJsonStorage:storage}});
  const store = (exports.preferenceStore as (owner:string)=>PreferenceStore)(owner);
  const importChoices = exports.importLegacyChoices as (owner:string)=>void;
  const sync = loadSource('lib/preference-sync-client.ts',{'@/lib/preference-store':exports}).startPreferenceSync as (store:PreferenceStore,operation:string)=>{stop:()=>void};
  const target = globalThis as typeof globalThis & {window?:unknown};
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis,'window'), originalFetch = globalThis.fetch;
  const events = new EventTarget();
  let task:ReturnType<typeof sync>|undefined;
  const waitUntil = async (condition:()=>boolean) => {
    const until = Date.now() + 5000;
    while (!condition() && Date.now() < until) await new Promise(resolve => setTimeout(resolve,20));
    assert.equal(condition(),true,'Synchronizer did not reach the expected confirmed state');
  };
  try {
    Object.defineProperty(target,'window',{configurable:true,value:{addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)}});
    globalThis.fetch = async (input,init) => {
      const req = new Request('http://localhost:3001' + String(input),init);
      return req.method === 'PATCH' ? api.PATCH(req,{}) : api.GET(req,{});
    };
    task = sync(store,'favorites'); await waitUntil(() => store.snapshot.loaded.favorites);
    importChoices(owner); assert.equal(store.snapshot.legacyHandled,false);
    await waitUntil(() => store.snapshot.legacyImport?.status === 'partial');
    assert.deepEqual(store.snapshot.favorites,[saved]); assert.deepEqual(store.snapshot.rejectedFavorites,[missing]);
    assert.deepEqual(store.snapshot.legacyImport?.remainingFavorites,[missing]);
    assert.deepEqual(JSON.parse(data.get('iptv_favorites')!),[saved,missing]);
    const firstRows = await db.select().from(schema.userFavorites).where(eq(schema.userFavorites.userId,id));
    assert.equal(firstRows.length,1);
    await db.insert(schema.channels).values({id:missing,name:'Restored fixture',normalizedName:'restored fixture'});
    importChoices(owner); await waitUntil(() => store.snapshot.legacyImport?.status === 'complete');
    assert.equal(store.snapshot.legacyHandled,true); assert.deepEqual(store.snapshot.rejectedFavorites,[]);
    assert.equal((await db.select().from(schema.userFavorites).where(eq(schema.userFavorites.userId,id))).length,2);
  } finally {
    task?.stop(); globalThis.fetch = originalFetch;
    if (originalWindow) Object.defineProperty(globalThis,'window',originalWindow); else Reflect.deleteProperty(globalThis,'window');
    await db.delete(schema.users).where(eq(schema.users.id,id));
    for (const channelId of [saved,missing]) await db.delete(schema.channels).where(eq(schema.channels.id,channelId));
  }
});
