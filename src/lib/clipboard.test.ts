import assert from 'node:assert/strict';
import test from 'node:test';

import { copyTextToClipboard } from './clipboard';

test('copies a direct stream URL through the provided clipboard', async () => {
  const copied: string[] = [];
  const result = await copyTextToClipboard('https://example.test/live.m3u8', {
    async writeText(value) {
      copied.push(value);
    },
  });

  assert.equal(result, true);
  assert.deepEqual(copied, ['https://example.test/live.m3u8']);
});

test('reports unavailable and rejected clipboard writes without throwing', async () => {
  assert.equal(await copyTextToClipboard('https://example.test/live.m3u8', null), false);
  assert.equal(
    await copyTextToClipboard('https://example.test/live.m3u8', {
      async writeText() {
        throw new Error('permission denied');
      },
    }),
    false,
  );
});
