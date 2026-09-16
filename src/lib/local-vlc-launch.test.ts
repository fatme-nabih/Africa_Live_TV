import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { onceLocalVlcLaunch, findVlcCommand, LocalVlcError } from './local-vlc-launch';
import path from 'node:path';
import os from 'node:os';

test('concurrent retries of one VLC intent launch only once', async () => {
  const key = randomUUID();
  let launches = 0;
  const action = async () => { launches += 1; };
  await Promise.all([onceLocalVlcLaunch(key, action), onceLocalVlcLaunch(key, action)]);
  await onceLocalVlcLaunch(key, action);
  assert.equal(launches, 1);
});

test('failed VLC intents stay idempotent; an explicit new intent can retry', async () => {
  const key = randomUUID();
  let launches = 0;
  const action = async () => { launches += 1; throw new Error('missing VLC'); };
  await assert.rejects(onceLocalVlcLaunch(key, action));
  await assert.rejects(onceLocalVlcLaunch(key, action));
  assert.equal(launches, 1);
  await assert.rejects(onceLocalVlcLaunch(randomUUID(), action));
  assert.equal(launches, 2);
});

test('a configured missing VLC executable reports a useful installation error', async () => {
  const previous = process.env.VLC_PATH;
  try {
    process.env.VLC_PATH = path.join(os.tmpdir(), randomUUID(), 'missing-vlc.exe');
    await assert.rejects(findVlcCommand(), error => error instanceof LocalVlcError && error.code === 'VLC_NOT_INSTALLED');
  } finally {
    if (previous === undefined) delete process.env.VLC_PATH;
    else process.env.VLC_PATH = previous;
  }
});
