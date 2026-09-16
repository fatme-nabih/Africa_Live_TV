import assert from 'node:assert/strict';
import { createServer, type ServerResponse } from 'node:http';
import test from 'node:test';

import {
  checkHlsStream,
  type UpstreamFetcher,
} from './stream-verification';

const localTestFetcher: UpstreamFetcher = (url, init) =>
  fetch(url, { ...init, redirect: 'follow' });

function sendManifest(response: ServerResponse, content: string) {
  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/vnd.apple.mpegurl',
  });
  response.end(content);
}

test('checkHlsStream follows redirects, validates a media playlist and cancels the segment body', async () => {
  let segmentClosed!: () => void;
  const segmentWasClosed = new Promise<void>((resolve) => {
    segmentClosed = resolve;
  });
  const server = createServer((request, response) => {
    if (request.url === '/redirect.m3u8') {
      response.writeHead(302, { Location: '/master.m3u8' });
      response.end();
      return;
    }
    if (request.url === '/master.m3u8') {
      sendManifest(response, '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=128000\nmedia.m3u8\n');
      return;
    }
    if (request.url === '/media.m3u8') {
      sendManifest(response, '#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXTINF:4,\nsegment.ts\n');
      return;
    }
    if (request.url === '/segment.ts') {
      response.writeHead(200, { 'Content-Type': 'video/mp2t' });
      response.write(Buffer.alloc(1024, 1));
      const interval = setInterval(() => response.write(Buffer.alloc(1024, 2)), 10);
      response.once('close', () => {
        clearInterval(interval);
        segmentClosed();
      });
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}/redirect.m3u8`;

  try {
    const result = await checkHlsStream(url, {
      timeoutMs: 2000,
      retries: 0,
      backoffBaseMs: 1,
      fetcher: localTestFetcher,
    });
    assert.equal(result.available, true);
    assert.equal(result.playableStatus, 'VLC_ONLY');
    assert.equal(result.corsAllowed, false);
    assert.equal(result.redirected, true);
    await Promise.race([
      segmentWasClosed,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Le corps du segment n’a pas été annulé')), 1000),
      ),
    ]);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test('checkHlsStream retries temporary HTTP errors with backoff', async () => {
  let attempts = 0;
  const server = createServer((request, response) => {
    if (request.url === '/retry.m3u8') {
      attempts += 1;
      if (attempts < 3) {
        response.writeHead(503, { 'Content-Type': 'text/plain' });
        response.end('temporary');
        return;
      }
      sendManifest(response, '#EXTM3U\n#EXTINF:4,\nsegment.ts\n');
      return;
    }
    if (request.url === '/segment.ts') {
      response.writeHead(200, { 'Content-Type': 'video/mp2t' });
      response.end(Buffer.alloc(16));
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const result = await checkHlsStream(
      `http://127.0.0.1:${address.port}/retry.m3u8`,
      {
        timeoutMs: 1000,
        retries: 2,
        backoffBaseMs: 1,
        fetcher: localTestFetcher,
      },
    );
    assert.equal(result.available, true);
    assert.equal(result.attempts, 3);
    assert.equal(attempts, 3);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('checkHlsStream detects an HTML page reached through a redirect', async () => {
  const server = createServer((request, response) => {
    if (request.url === '/expired.m3u8') {
      response.writeHead(302, { Location: '/login' });
      response.end();
      return;
    }
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end('<!doctype html><html><body>login</body></html>');
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const result = await checkHlsStream(
      `http://127.0.0.1:${address.port}/expired.m3u8`,
      { timeoutMs: 1000, retries: 0, fetcher: localTestFetcher },
    );
    assert.equal(result.available, false);
    assert.equal(result.redirected, true);
    assert.equal(result.failureReason, 'REDIRECTED_TO_HTML');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('network errors are classified without persisting an upstream URL or hostname', async () => {
  const result = await checkHlsStream('https://media.example/live.m3u8', {
    timeoutMs: 100,
    retries: 0,
    fetcher: async () => {
      throw new Error('connect ECONNREFUSED 203.0.113.8 media.example');
    },
  });

  assert.equal(result.failureReason, 'CONNECTION_REFUSED');
  assert.doesNotMatch(result.failureReason ?? '', /media\.example|203\.0\.113\.8/);
});

test('DNS and TLS failures expose only normalized diagnostic codes', async () => {
  for (const [error, expected] of [
    [
      Object.assign(new Error('private.example'), { code: 'ENOTFOUND' }),
      'DNS_RESOLUTION_FAILED',
    ],
    [
      Object.assign(new Error('private.example'), {
        code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      }),
      'TLS_VALIDATION_FAILED',
    ],
    [
      Object.assign(new Error('private.example'), { code: 'ETIMEDOUT' }),
      'TIMEOUT',
    ],
  ] as const) {
    const result = await checkHlsStream('https://media.example/live.m3u8', {
      timeoutMs: 100,
      retries: 0,
      fetcher: async () => {
        throw error;
      },
    });
    assert.equal(result.failureReason, expected);
    assert.doesNotMatch(result.failureReason ?? '', /private\.example|media\.example/);
  }
});
