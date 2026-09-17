import assert from 'node:assert/strict';
import test from 'node:test';
import { integrationTestSchema, assertLocalE2ETarget } from './integration-test-safety';

const valid = {
  NODE_ENV: 'test', DATABASE_URL: 'postgres://localhost/africa_live_dev',
  INTEGRATION_TEST_DATABASE: 'africa_live_dev',
  INTEGRATION_TEST_SCHEMA: `africa_live_test_${'a'.repeat(32)}`,
  L3_INTEGRATION_TEST: '1',
};

test('integration writes require an explicit isolated local target', () => {
  assert.equal(integrationTestSchema({}), null);
  assert.equal(integrationTestSchema(valid), valid.INTEGRATION_TEST_SCHEMA);
  for (const changes of [
    { NODE_ENV: 'production' }, { NODE_ENV: 'development' },
    { INTEGRATION_TEST_DATABASE: undefined }, { INTEGRATION_TEST_SCHEMA: undefined },
    { INTEGRATION_TEST_SCHEMA: 'public' },
    { INTEGRATION_TEST_SCHEMA: `${valid.INTEGRATION_TEST_SCHEMA};drop schema public` },
    { DATABASE_URL: 'postgres://localhost/iptv' },
    { DATABASE_URL: 'postgres://remote.invalid/africa_live_dev' },
    { DATABASE_URL: 'postgres://localhost/africa_live_dev?options=-csearch_path=public' },
    { DATABASE_URL: 'invalid-sensitive-value' },
  ]) {
    assert.throws(() => integrationTestSchema({ ...valid, ...changes }), /Unsafe integration target/);
  }
});

test('local browser writes refuse a remote app or another database', () => {
  const env = { NODE_ENV: 'development', LOCAL_DEV_MODE: 'true', DATABASE_URL: 'postgres://localhost/africa_live_dev' };
  assert.doesNotThrow(() => assertLocalE2ETarget(env, 'http://localhost:3001'));
  for (const url of ['https://tv.africa-live.test', 'http://localhost:3000', undefined]) {
    assert.throws(() => assertLocalE2ETarget(env, url), /Local E2E requires/);
  }
  assert.throws(() => assertLocalE2ETarget({ ...env, DATABASE_URL: 'postgres://localhost/iptv' }, 'http://localhost:3001'));
  assert.throws(() => assertLocalE2ETarget({ ...env, NODE_ENV: 'production' }, 'http://localhost:3001'));
});
