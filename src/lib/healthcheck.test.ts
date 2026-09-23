import assert from 'node:assert/strict';
import test from 'node:test';

import { checkServiceHealth } from './healthcheck';

test('healthcheck reports process and database readiness without details', async () => {
  const result = await checkServiceHealth(async () => ({ rows: [{ secret: 'not returned' }] }));

  assert.deepEqual(result, {
    status: 200,
    payload: { status: 'ok', checks: { process: 'ok', database: 'ok' } },
  });
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('healthcheck returns 503 without leaking database errors', async () => {
  const result = await checkServiceHealth(async () => {
    throw new Error('postgres://user:password@example.invalid/database');
  });

  assert.deepEqual(result, {
    status: 503,
    payload: { status: 'unavailable', checks: { process: 'ok', database: 'error' } },
  });
  assert.equal(JSON.stringify(result).includes('password'), false);
});
