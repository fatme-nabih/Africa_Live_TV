import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import test from 'node:test';
import { EnvironmentValidationError, validateServerEnvironment } from './server-environment';

function validProduction(): Record<string, string> {
  return {
    NODE_ENV: 'production', DEPLOYMENT_ENV: 'production',
    DATABASE_URL: 'postgres://db.internal/africa_live_production',
    LOCAL_DEV_MODE: 'false', NEXT_PUBLIC_LOCAL_DEV_MODE: 'false', ENABLE_LOCAL_VLC: 'false',
    NEXT_PUBLIC_APP_URL: 'https://tv.africa-live.test', PLAYBACK_ELIGIBILITY_READY: 'false',
    ABUSE_HASH_SECRET: randomBytes(32).toString('hex'), CATALOG_CURSOR_SECRET: randomBytes(32).toString('hex'),
    ABUSE_TRUSTED_PROXY_HEADER: 'x-forwarded-for',
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${Buffer.from('clerk.africa-live.test$').toString('base64')}`,
    CLERK_SECRET_KEY: `sk_live_${randomBytes(24).toString('hex')}`,
    CLERK_WEBHOOK_SIGNING_SECRET: `whsec_${randomBytes(24).toString('base64')}`,
    CLERK_BILLING_PLAN_SLUG: 'africa-live',
  };
}

test('local mode accepts its dedicated DB without requiring Clerk credentials', () => {
  const local = {
    NODE_ENV: 'development', LOCAL_DEV_MODE: 'true', NEXT_PUBLIC_LOCAL_DEV_MODE: 'true',
    DATABASE_URL: 'postgres://localhost/africa_live_dev', NEXT_PUBLIC_APP_URL: 'http://localhost:3001',
  };
  assert.doesNotThrow(() => validateServerEnvironment(local));
  assert.throws(() => validateServerEnvironment({ ...local, DATABASE_URL: 'postgres://localhost/iptv' }), EnvironmentValidationError);
  assert.throws(() => validateServerEnvironment({ ...local, NEXT_PUBLIC_LOCAL_DEV_MODE: 'false' }), EnvironmentValidationError);
});

test('production permits a closed playback gate but rejects unsafe configuration', () => {
  const valid = validProduction();
  assert.doesNotThrow(() => validateServerEnvironment(valid));
  for (const overrides of [
    { LOCAL_DEV_MODE: 'true' }, { NEXT_PUBLIC_LOCAL_DEV_MODE: 'true' }, { ENABLE_LOCAL_VLC: 'true' },
    { LOCAL_DEV_MODE: undefined }, { PLAYBACK_ELIGIBILITY_READY: 'yes' },
    { PLAYBACK_ELIGIBILITY_READY: undefined }, { DATABASE_URL: 'postgres://localhost/africa_live_dev' },
    { DATABASE_URL: 'postgres://user:change-me@db.internal/app' }, { DATABASE_URL: undefined },
    { NEXT_PUBLIC_APP_URL: 'http://tv.africa-live.test' }, { NEXT_PUBLIC_APP_URL: 'https://localhost' },
    { NEXT_PUBLIC_APP_URL: 'https://user:secret@tv.africa-live.test' },
    { BROWSER_TEST_ORIGIN: 'http://localhost:3001' }, { ABUSE_HASH_SECRET: 'a'.repeat(64) },
    { ABUSE_HASH_SECRET: 'replace_with_at_least_32_random_characters' },
    { CATALOG_CURSOR_SECRET: valid.ABUSE_HASH_SECRET }, { CLERK_SECRET_KEY: 'sk_test_local-placeholder' },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_Y2ktdGVzdC5jb20k' },
    { CLERK_WEBHOOK_SIGNING_SECRET: undefined }, { CLERK_BILLING_PLAN_SLUG: undefined },
    { ABUSE_TRUSTED_PROXY_HEADER: 'arbitrary' }, { ABUSE_TRUSTED_PROXY_HEADER: 'disabled' }, { INTEGRATION_TEST_DATABASE: 'africa_live_dev' },
    { L3_INTEGRATION_TEST: '1' }, { DEPLOYMENT_ENV: 'local' },
  ]) assert.throws(() => validateServerEnvironment({ ...valid, ...overrides }), EnvironmentValidationError);
});

test('staging accepts matching test keys without weakening production', () => {
  const env = validProduction();
  env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.replace('pk_live_', 'pk_test_');
  env.CLERK_SECRET_KEY = env.CLERK_SECRET_KEY.replace('sk_live_', 'sk_test_');
  assert.throws(() => validateServerEnvironment(env), EnvironmentValidationError);
  assert.doesNotThrow(() => validateServerEnvironment({ ...env, DEPLOYMENT_ENV: 'staging' }));
  assert.throws(() => validateServerEnvironment({ ...env, DEPLOYMENT_ENV: 'staging', CLERK_SECRET_KEY: validProduction().CLERK_SECRET_KEY }), EnvironmentValidationError);
});

test('independent local playback is restricted to the development database and origin', () => {
  const env = { ...validProduction(), NODE_ENV: 'development',
    NEXT_PUBLIC_LOCAL_PLAYBACK: 'true', DATABASE_URL: 'postgres://localhost/africa_live_dev',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3001' };
  assert.doesNotThrow(() => validateServerEnvironment(env));
  for (const overrides of [
    { NODE_ENV: 'production' },
    { DATABASE_URL: 'postgres://localhost/iptv' },
    { NEXT_PUBLIC_APP_URL: 'https://tv.africa-live.test' },
  ]) assert.throws(() => validateServerEnvironment({ ...env, ...overrides }), EnvironmentValidationError);
});

test('configuration errors never echo secrets or database credentials', () => {
  const sensitive = 'private-credential-that-must-not-appear';
  assert.throws(() => validateServerEnvironment({
    ...validProduction(), DATABASE_URL: sensitive, CLERK_SECRET_KEY: sensitive,
  }), (error: unknown) => {
    assert.ok(error instanceof EnvironmentValidationError);
    assert.ok(error.message.includes('DATABASE_URL'));
    assert.ok(!error.message.includes(sensitive));
    return true;
  });
});
