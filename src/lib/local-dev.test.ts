import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalDevMode, isLocalDevRequest } from './local-dev';

test('local requests reject external hosts and cross-origin writes', () => {
  const url = 'http://localhost:3001/api/channels';
  const headers = { host: 'localhost:3001', origin: 'http://localhost:3001' };
  assert.equal(isLocalDevRequest(new Request(url, { method: 'POST', headers })), true);
  assert.equal(isLocalDevRequest(new Request(url, { method: 'POST', headers: { ...headers, origin: 'https://external.example' } })), false);
  assert.equal(isLocalDevRequest(new Request(url, { method: 'POST', headers: { host: headers.host } })), false);
  assert.equal(isLocalDevRequest(new Request(url, { headers: { ...headers, host: 'external.example' } })), false);
  assert.equal(isLocalDevRequest(new Request(url, { headers: { ...headers, 'x-forwarded-for': '203.0.113.1' } })), false);
});

test('local access cannot activate in production', () => {
  const env: Record<string, string | undefined> = process.env;
  const previousMode = env.LOCAL_DEV_MODE;
  const previousEnvironment = env.NODE_ENV;
  try {
    env.LOCAL_DEV_MODE = 'true';
    env.NODE_ENV = 'production';
    assert.equal(isLocalDevMode(), false);
    env.NODE_ENV = 'development';
    assert.equal(isLocalDevMode(), true);
  } finally {
    if (previousMode === undefined) delete env.LOCAL_DEV_MODE;
    else env.LOCAL_DEV_MODE = previousMode;
    if (previousEnvironment === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = previousEnvironment;
  }
});
