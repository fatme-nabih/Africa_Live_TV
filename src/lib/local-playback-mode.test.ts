import assert from 'node:assert/strict';
import test from 'node:test';
import { isLocalPlaybackMode } from './local-playback-mode';

test('local playback works with Clerk and is always disabled in production', () => {
  const env = process.env as Record<string, string | undefined>;
  const keys = ['NODE_ENV', 'NEXT_PUBLIC_LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_PLAYBACK'];
  const previous = Object.fromEntries(keys.map(key => [key, env[key]]));
  try {
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_LOCAL_DEV_MODE = 'false';
    env.NEXT_PUBLIC_LOCAL_PLAYBACK = 'true';
    assert.equal(isLocalPlaybackMode(), true);
    env.NODE_ENV = 'production';
    assert.equal(isLocalPlaybackMode(), false);
    env.NEXT_PUBLIC_LOCAL_DEV_MODE = 'true';
    assert.equal(isLocalPlaybackMode(), false);
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_LOCAL_PLAYBACK = 'false';
    assert.equal(isLocalPlaybackMode(), true);
    env.NEXT_PUBLIC_LOCAL_DEV_MODE = 'false';
    assert.equal(isLocalPlaybackMode(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete env[key];
      else env[key] = previous[key];
    }
  }
});
