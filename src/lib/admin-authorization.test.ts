import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeAdministrator, type AdminAuthorizationDependencies } from './admin-authorization';

function dependencies(overrides: Partial<AdminAuthorizationDependencies> = {}): AdminAuthorizationDependencies {
  return {
    localMode: false,
    getIdentity: async () => ({ userId: 'owner', sessionRole: 'admin' }),
    getProviderUser: async () => ({ id: 'owner', publicMetadata: { role: 'admin' }, banned: false, locked: false }),
    getInternalUser: async () => ({ status: 'active' }),
    ...overrides,
  };
}

test('administration requires a real session, never the local technical user', async () => {
  const noIdentity = async () => { throw new Error('Clerk must not be called locally'); };
  assert.equal((await authorizeAdministrator(dependencies({ localMode: true, getIdentity: noIdentity }))).allowed, false);
  assert.deepEqual(await authorizeAdministrator(dependencies({ getIdentity: async () => ({ userId: null, sessionRole: 'admin' }) })), { allowed: false, reason: 'unauthenticated' });
});

test('missing, malformed and non-admin session roles cannot reach provider or database', async () => {
  for (const role of [undefined, '', 'user', 'moderator', 'ADMIN', { role: 'admin' }]) {
    const result = await authorizeAdministrator(dependencies({
      getIdentity: async () => ({ userId: 'owner', sessionRole: role }),
      getProviderUser: async () => { throw new Error('Unexpected provider call'); },
    }));
    assert.equal(result.allowed, false);
  }
});

test('stale admin claim cannot preserve a revoked role or a disabled Clerk account', async () => {
  for (const user of [null,
    { id: 'other', publicMetadata: { role: 'admin' }, banned: false, locked: false },
    { id: 'owner', publicMetadata: { role: 'user' }, banned: false, locked: false },
    { id: 'owner', publicMetadata: { role: 'admin' }, banned: true, locked: false },
    { id: 'owner', publicMetadata: { role: 'admin' }, banned: false, locked: true },
  ]) {
    assert.equal((await authorizeAdministrator(dependencies({ getProviderUser: async () => user }))).allowed, false);
  }
});

test('locally blocked, deleted or unknown-status identities are denied', async () => {
  for (const status of ['blocked', 'deleted', 'unknown']) {
    assert.equal((await authorizeAdministrator(dependencies({ getInternalUser: async () => ({ status }) }))).allowed, false);
  }
});

test('active admin is authorized independently of billing', async () => {
  assert.deepEqual(await authorizeAdministrator(dependencies()), { allowed: true, userId: 'owner' });
});

test('provider and database failures never grant admin access', async () => {
  await assert.rejects(authorizeAdministrator(dependencies({ getProviderUser: async () => { throw new Error('provider unavailable'); } })), /provider unavailable/);
  await assert.rejects(authorizeAdministrator(dependencies({ getInternalUser: async () => { throw new Error('database unavailable'); } })), /database unavailable/);
});
