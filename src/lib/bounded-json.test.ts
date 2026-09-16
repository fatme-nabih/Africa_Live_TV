import assert from 'node:assert/strict';
import test from 'node:test';

import { BoundedJsonError, readBoundedJson } from './bounded-json';

test('reads a JSON body inside the byte limit', async () => {
  const request = new Request('https://lumina.test', {
    method: 'POST',
    body: JSON.stringify({ channelId: 'one' }),
  });
  assert.deepEqual(await readBoundedJson(request, 64), { channelId: 'one' });
});

test('rejects a declared body that is too large before parsing', async () => {
  const request = new Request('https://lumina.test', {
    method: 'POST',
    headers: { 'content-length': '1000' },
    body: '{}',
  });
  await assert.rejects(
    () => readBoundedJson(request, 64),
    (error: unknown) =>
      error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE',
  );
});

test('rejects a streamed body that exceeds the limit', async () => {
  const request = new Request('https://lumina.test', {
    method: 'POST',
    body: JSON.stringify({ value: 'x'.repeat(100) }),
  });
  await assert.rejects(
    () => readBoundedJson(request, 32),
    (error: unknown) =>
      error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE',
  );
});
