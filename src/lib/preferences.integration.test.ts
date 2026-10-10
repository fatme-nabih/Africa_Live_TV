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
