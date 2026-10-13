import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/db';
import * as schema from '@/db/schema';
import * as errors from './api-errors';
import * as editions from './editions';
import { loadSource } from '../../e2e/helpers/load-source';
import { assertIntegrationTarget } from './integration-test-safety';

// EDI-603 : vrai gestionnaire PUT, vraie colonne `users.preferred_edition` (migration 0021) dans le schéma jetable du banc.
const enabled = process.env.L3_INTEGRATION_TEST === '1', ids: string[] = [];
before(async () => { if (enabled) await assertIntegrationTarget(pool); });
after(async () => { if (enabled) { for (const id of ids) await db.delete(schema.users).where(eq(schema.users.id, id)); await pool.end(); } });
async function user() { const id = randomUUID(); ids.push(id); await db.insert(schema.users).values({ id, clerkUserId: 'fixture-' + id }); return id; }
function handler(userId: string, active: editions.Edition[] = ['fr', 'en', 'ar']) {
  const authorize = async () => ({ ok: true, user: { id: userId } });
  return loadSource('app/api/edition-preference/route.ts', {
    '@/db': { db }, '@/db/schema': schema, '@/lib/api-errors': errors,
    '@/lib/editions': { ...editions, enabledEditions: () => active },
    '@/lib/require-app-access': { authorizeAppRequest: authorize, authorizeCatalogRequest: authorize },
    '@/lib/local-dev': { isLocalDevMode: () => false },
  }) as Record<string, (request: Request) => Promise<Response>>;
}
const put = (body: unknown) => new Request('http://localhost:3001/api/edition-preference', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const stored = async (id: string) => (await db.select({ value: schema.users.preferredEdition }).from(schema.users).where(eq(schema.users.id, id)))[0]?.value;

test('EDI-603: a new account has no stored edition, and the handler stores only the owner’s explicit choice', { skip: !enabled }, async () => {
  const id = await user(), before = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
  assert.equal(await stored(id), null);
  const response = await handler(id).PUT(put({ edition: 'ar', owner: 'account:' + id }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { edition: 'ar' });
  const afterRow = (await db.select().from(schema.users).where(eq(schema.users.id, id)))[0];
  assert.equal(afterRow.preferredEdition, 'ar');
  // Seule la préférence change : ni la date de mise à jour, ni l'identité, ni l'essai.
  assert.deepEqual({ ...afterRow, preferredEdition: null }, { ...before, preferredEdition: null });
  assert.equal((await handler(id).PUT(put({ edition: 'fr', owner: 'account:' + id }))).status, 200);
  assert.equal(await stored(id), 'fr');
});

test('EDI-603: another owner, an inactive or unknown edition and extra fields never write', { skip: !enabled }, async () => {
  const a = await user(), b = await user();
  assert.equal((await handler(b).PUT(put({ edition: 'en', owner: 'account:' + a }))).status, 409);
  assert.equal((await handler(b, ['fr']).PUT(put({ edition: 'en', owner: 'account:' + b }))).status, 400);
  assert.equal((await handler(b).PUT(put({ edition: 'es', owner: 'account:' + b }))).status, 400);
  assert.equal((await handler(b).PUT(put({ edition: 'en', owner: 'account:' + b, userId: a }))).status, 400);
  assert.equal(await stored(a), null);
  assert.equal(await stored(b), null);
});

test('EDI-603: the database constraint refuses any value outside fr, en and ar', { skip: !enabled }, async () => {
  const id = await user();
  await assert.rejects(db.update(schema.users).set({ preferredEdition: 'es' }).where(eq(schema.users.id, id)));
  assert.equal(await stored(id), null);
});
