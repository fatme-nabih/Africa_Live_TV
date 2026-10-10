import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { eq } from 'drizzle-orm';
import { db, pool } from '@/db';
import { clerkIdentityDeletions, users } from '@/db/schema';
import { assertIntegrationTarget } from './integration-test-safety';
import { syncClerkUser, markClerkUserDeleted } from './identity';
const enabled = process.env.L3_INTEGRATION_TEST === '1';
const ids: string[] = [];
before(async () => { if (enabled) await assertIntegrationTarget(pool); });
after(async () => { if (enabled) { for (const id of ids) { await db.delete(users).where(eq(users.clerkUserId, id)); await db.delete(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, id)); } await pool.end(); } });
test('B15: provider revision after initial profile wins independently of processing clock', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const clerkUserId = 'fixture-' + randomUUID(); ids.push(clerkUserId);
  const first = await syncClerkUser({ clerkUserId, email: 'old@fixture.test', status: 'active', createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z') });
  const second = await syncClerkUser({ clerkUserId, email: 'new@fixture.test', status: 'blocked', createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z'), processedAt: new Date('2026-09-01T00:00:00Z') });
  assert.equal(second.status, 'blocked'); assert.equal(second.email, 'new@fixture.test'); assert.equal(first.trialEndsAt, second.trialEndsAt);
});
test('B16: delete before create remains terminal without reintroducing an email', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const clerkUserId = 'fixture-' + randomUUID(); ids.push(clerkUserId);
  await markClerkUserDeleted(clerkUserId);
  await assert.rejects(syncClerkUser({ clerkUserId, email: 'stale@fixture.test', status: 'active', createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z') }));
  assert.equal((await db.select().from(users).where(eq(users.clerkUserId, clerkUserId))).length, 0);
});

test('B15: stale/replayed revisions and ambiguous historical clock cannot reactivate restrictions', { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const clerkUserId = 'fixture-' + randomUUID(); ids.push(clerkUserId);
  const input = { clerkUserId, email: 'initial@fixture.test', status: 'blocked' as const, createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-03T00:00:00Z') };
  const first = await syncClerkUser(input);
  assert.equal((await syncClerkUser({ ...input, status: 'active', updatedAt: new Date('2026-10-02T00:00:00Z') })).status, 'blocked');
  assert.equal((await syncClerkUser(input)).clerkProfileUpdatedAt, first.clerkProfileUpdatedAt);
  await db.update(users).set({ clerkProfileUpdatedAt: null, clerkSyncedAt: '2099-01-01T00:00:00Z' }).where(eq(users.id, first.id));
  await assert.rejects(syncClerkUser({ ...input, status: 'active' }, { revalidate: async () => { throw new Error('fixture unavailable'); } }), { code: 'IDENTITY_REVISION_UNAVAILABLE' });
  const checked = await syncClerkUser({ ...input, status: 'active' }, { revalidate: async () => ({ ...input, status: 'active', updatedAt: new Date('2026-10-04T00:00:00Z') }) });
  assert.equal(checked.status, 'blocked'); assert.equal(checked.trialEndsAt, first.trialEndsAt);
  await assert.rejects(syncClerkUser({ ...input, updatedAt: new Date(NaN) }), { code: 'INVALID_IDENTITY_DATE' });
});

for (const deletionFirst of [true, false]) test(`B16: advisory serialization of absent identity (delete first=${deletionFirst})`, { skip: !enabled }, async () => {
  await assertIntegrationTarget(pool);
  const clerkUserId = 'fixture-' + randomUUID(); ids.push(clerkUserId);
  const key = 'africa-live:identity:' + clerkUserId, connection = await pool.connect();
  const input = { clerkUserId, email: 'profile@fixture.test', status: 'active' as const, createdAt: new Date('2026-10-01T00:00:00Z'), updatedAt: new Date('2026-10-02T00:00:00Z') };
  const waiters = async (count: number) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const result = await pool.query("select count(*)::int as count from pg_locks where locktype='advisory' and not granted and objid=(hashtextextended($1,0) & 4294967295)::oid", [key]);
      if (result.rows[0].count >= count) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Fixture barrier not reached');
  };
  try {
    await connection.query('BEGIN'); await connection.query('select pg_advisory_xact_lock(hashtextextended($1,0))', [key]);
    const create = () => syncClerkUser(input).catch(error => error);
    const remove = () => markClerkUserDeleted(clerkUserId);
    const first = deletionFirst ? remove() : create(); await waiters(1);
    const second = deletionFirst ? create() : remove(); await waiters(2);
    await connection.query('COMMIT'); await Promise.all([first,second]);
    const rows = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId));
    assert.ok(rows.length === 0 || (rows[0].status === 'deleted' && rows[0].email === null));
    assert.equal((await db.select().from(clerkIdentityDeletions).where(eq(clerkIdentityDeletions.clerkUserId, clerkUserId))).length, 1);
  } finally { await connection.query('ROLLBACK'); connection.release(); }
});
