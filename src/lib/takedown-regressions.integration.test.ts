import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/db';
import * as schema from '@/db/schema';
import * as errors from './api-errors';
import { loadSource } from '../../e2e/helpers/load-source';
import { assertIntegrationTarget } from './integration-test-safety';
import { runCatalogImport } from './catalog-import';
const enabled = process.env.CATALOG_INTEGRATION_TEST === '1';
before(async () => { if (enabled) await assertIntegrationTarget(pool); });
after(async () => { if (enabled) await pool.end(); });
const { PATCH } = loadSource('app/api/admin/contact-requests/[id]/route.ts', {
  '@/db': { db }, '@/db/schema': schema, '@/lib/api-errors': errors,
  '@/lib/require-admin-api': { requireAdminApiAccess: async () => ({ userId: 'fixture-admin' }) },
}) as { PATCH: (request: Request, context: unknown) => Promise<Response> };
test('B17: actual admin API refuses disabled→review atomically; later import stays suppressed', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const id = randomUUID(), name = 'Fixture ' + randomUUID(), url = 'https://media.fixture.test/' + randomUUID() + '.m3u8';
  const content = '#EXTM3U\n#EXTINF:-1,' + name + '\n' + url;
  await db.insert(schema.supportRequests).values({ id, name: 'Fixture', email: 'fixture@fixture.test', subject: 'removal', channelName: name, sourceUrl: url, message: 'Fixture', status: 'sources_disabled' });
  await runCatalogImport({ source: 'fixture-' + id, content });
  const response = await PATCH(new Request('http://localhost:3001/api/admin/contact-requests/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'in_review' }) }), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 409);
  await runCatalogImport({ source: 'fixture-' + id, content });
  assert.equal((await db.select().from(schema.streams).where(eq(schema.streams.url, url)))[0].active, false);
  assert.equal((await db.select().from(schema.supportRequestEvents).where(eq(schema.supportRequestEvents.requestId, id))).length, 0);
});

for (const disableFirst of [true,false]) test(`B17: import/disable serialized in both orders (disable first=${disableFirst})`, { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const id = randomUUID(), name = 'Fixture ' + randomUUID(), url = 'https://media.fixture.test/' + randomUUID() + '.m3u8';
  const content = '#EXTM3U\n#EXTINF:-1,' + name + '\n' + url;
  await runCatalogImport({ source: 'fixture-' + id, content });
  await db.insert(schema.supportRequests).values({ id, name: 'Fixture', email: 'fixture@fixture.test', subject: 'removal', channelName: name, sourceUrl: url, message: 'Fixture', status: 'new' });
  const connection = await pool.connect(), key = 'africa-live:catalog-publication';
  async function waiters(count: number) {
    for (let index = 0; index < 150; index++) {
      const result = await pool.query("select count(*)::int as count from pg_locks where locktype='advisory' and not granted and objid=(hashtextextended($1,0) & 4294967295)::oid", [key]);
      if (result.rows[0].count >= count) return;
      await new Promise(resolve => setTimeout(resolve,10));
    }
    throw new Error('Catalog fixture barrier not reached');
  }
  const disable = async () => {
    const response = await PATCH(new Request('http://localhost:3001/api/admin/contact-requests/' + id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'disable_reported_sources', note: 'Fixture withdrawal' }) }), { params: Promise.resolve({ id }) });
    assert.equal(response.status, 200);
  };
  const publish = () => runCatalogImport({ source: 'fixture-' + id, content });
  try {
    await connection.query('BEGIN'); await connection.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
    const first = disableFirst ? disable() : publish(); await waiters(1);
    const second = disableFirst ? publish() : disable(); await waiters(2);
    await connection.query('COMMIT'); await Promise.all([first,second]);
    assert.equal((await db.select().from(schema.streams).where(eq(schema.streams.url,url)))[0].active, false);
  } finally { await connection.query('ROLLBACK'); connection.release(); }
});

test('B17: missing session or revoked admin role is rejected by the actual handler', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  for (const error of [new errors.UnauthorizedError(), new errors.ForbiddenError()]) {
    const moduleExports = loadSource('app/api/admin/contact-requests/[id]/route.ts', { '@/db': { db }, '@/db/schema': schema, '@/lib/api-errors': errors, '@/lib/require-admin-api': { requireAdminApiAccess: async () => { throw error; } } });
    const handler = moduleExports.PATCH as typeof PATCH;
    const result = await handler(new Request('http://localhost:3001/api/admin/contact-requests/fixture', { method: 'PATCH' }), {});
    assert.equal(result.status, error.status);
  }
});
test('B17: a second active withdrawal survives the first explicit lift; final lift requires requalification', { skip: !enabled },async () => {
  await assertIntegrationTarget(pool);
  const a = randomUUID(), b = randomUUID(), name = 'Fixture ' + randomUUID(), url = 'https://media.fixture.test/' + randomUUID() + '.m3u8';
  await runCatalogImport({ source:'fixture-' + a,content:'#EXTM3U\n#EXTINF:-1,' + name + '\n' + url });
  const [stream] = await db.select().from(schema.streams).where(eq(schema.streams.url,url));
  await db.update(schema.streams).set({ active:false }).where(eq(schema.streams.id,stream.id));
  for (const id of [a,b]) {
    await db.insert(schema.supportRequests).values({ id,name:'Fixture',email:'fixture@fixture.test',subject:'removal',channelName:name,sourceUrl:url,message:'Fixture',status:'sources_disabled' });
    await db.insert(schema.supportRequestEvents).values({ id:randomUUID(),requestId:id,eventType:'sources_disabled',affectedStreamIds:[stream.id] });
  }
  const lift = (id:string) => PATCH(new Request('http://localhost:3001/api/admin/contact-requests/' + id,{ method:'PATCH',headers:{ 'content-type':'application/json' },body:JSON.stringify({ action:'close_no_action',note:'Fixture explicit lift' }) }),{ params:Promise.resolve({ id }) });
  assert.equal((await lift(a)).status,200);
  assert.equal((await db.select().from(schema.streams).where(eq(schema.streams.id,stream.id)))[0].active,false);
  assert.equal((await lift(b)).status,200);
  const [restored] = await db.select().from(schema.streams).where(eq(schema.streams.id,stream.id));
  assert.equal(restored.active,true); assert.equal(restored.directEligibility,'REVIEW_REQUIRED'); assert.notEqual(restored.verificationState,'HEALTHY');
});
