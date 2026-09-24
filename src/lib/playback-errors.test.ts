import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyHlsFailure,
  classifyPlayRejection,
  nextMediaRecoveryAction,
  nextNetworkRecoveryAction,
} from './playback-errors';

test('play rejection distinguishes autoplay and codecs', () => {
  assert.equal(classifyPlayRejection(new DOMException('blocked', 'NotAllowedError')).category, 'autoplay');
  assert.equal(classifyPlayRejection(new DOMException('codec', 'NotSupportedError')).category, 'codec');
});

test('HLS failures distinguish CORS, network, geoblocking and codecs', () => {
  assert.equal(classifyHlsFailure({ type: 'networkError', corsAllowed: false }).category, 'cors');
  assert.equal(classifyHlsFailure({ type: 'networkError', corsAllowed: true }).category, 'network');
  assert.equal(classifyHlsFailure({ type: 'networkError', httpStatus: 451 }).category, 'geoblocked');
  assert.equal(classifyHlsFailure({ type: 'mediaError', details: 'bufferIncompatibleCodecsError' }).category, 'codec');
});

test('media recovery is bounded to two attempts', () => {
  assert.equal(nextMediaRecoveryAction(0), 'recover');
  assert.equal(nextMediaRecoveryAction(1), 'swap-and-recover');
  assert.equal(nextMediaRecoveryAction(2), 'fail');
});

test('network recovery is bounded to two attempts per playback attempt', () => {
  assert.equal(nextNetworkRecoveryAction(0), 'retry');
  assert.equal(nextNetworkRecoveryAction(1), 'retry');
  assert.equal(nextNetworkRecoveryAction(2), 'fail');
});
