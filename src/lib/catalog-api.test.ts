import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ApiRequestError,
  catalogRequestSchema,
  catalogResponseSchema,
  openVlcRequestSchema,
  playbackEventRequestSchema,
  playbackResolutionRequestSchema,
  playbackResolutionResponseSchema,
  readApiResponse,
} from './api-contracts';
import {
  catalogCursorContext,
  decodeCatalogCursor,
  encodeCatalogCursor,
  escapeLikePattern,
  normalizeCatalogSearch,
} from './catalog-query';
import { LatestRequestController, SingleFlightGate } from './latest-request';

test('catalog search escapes SQL wildcards and normalizes text', () => {
  assert.equal(escapeLikePattern('100%_TV\\HD'), '100\\%\\_TV\\\\HD');
  assert.equal(normalizeCatalogSearch('  Télé   Sénégal  '), 'télé sénégal');
});

test('catalog cursors round-trip and reject malformed values', () => {
  const context = catalogCursorContext({
    userId: 'user-1',
    clerkSessionId: 'session-1',
    search: '',
    country: '',
    group: '',
    language: '',
    status: '',
    favoritesOnly: false,
  });
  const encoded = encodeCatalogCursor({ name: 'Canal 1', id: 'channel-1' }, context);
  assert.deepEqual(decodeCatalogCursor(encoded, context), {
    name: 'Canal 1',
    id: 'channel-1',
  });
  assert.throws(
    () => decodeCatalogCursor('not-a-cursor', context),
    /INVALID_CATALOG_CURSOR/,
  );
  assert.throws(
    () => decodeCatalogCursor(encoded, 'f'.repeat(64)),
    /INVALID_CATALOG_CURSOR/,
  );
});

test('shared catalog contracts reject invalid requests and responses', () => {
  const defaultRequest = catalogRequestSchema.parse({});
  assert.equal(defaultRequest.limit, 30);
  assert.equal(defaultRequest.language, '');
  assert.equal(
    catalogRequestSchema.safeParse({ language: 'fra' }).success,
    true,
  );
  assert.equal(
    catalogRequestSchema.safeParse({ language: 'français' }).success,
    false,
  );
  assert.equal(catalogRequestSchema.safeParse({ limit: 31 }).success, false);
  assert.equal(catalogRequestSchema.safeParse({ search: 'x' }).success, false);
  assert.equal(
    catalogResponseSchema.safeParse({
      channels: [],
      hasMore: false,
      limit: 30,
      nextCursor: null,
    }).success,
    true,
  );
  assert.equal(
    catalogResponseSchema.safeParse({
      channels: [],
      total: 12_000,
      hasMore: false,
      limit: 30,
      nextCursor: null,
    }).success,
    false,
  );
});

test('authenticated catalog DTOs reject stream sources and provider URLs', () => {
  const catalogChannel = {
    id: 'channel-1',
    name: 'News One',
    logoUrl: null,
    groupTitle: 'News',
    countryCode: 'SN',
    playbackMode: 'BROWSER',
    availabilityStatus: 'READY',
  };
  const response = {
    channels: [catalogChannel],
    hasMore: false,
    limit: 30,
    nextCursor: null,
  };

  assert.equal(catalogResponseSchema.safeParse(response).success, true);
  assert.equal(
    catalogResponseSchema.safeParse({
      ...response,
      channels: [{
        ...catalogChannel,
        streams: [{
          id: 'stream-1',
          url: 'https://provider.test/live.m3u8?token=secret',
          status: 'BROWSER_OK',
          corsAllowed: true,
          mixedContent: false,
        }],
      }],
    }).success,
    false,
  );
  assert.equal(JSON.stringify(catalogResponseSchema.parse(response)).includes('provider.test'), false);
  assert.equal(
    catalogResponseSchema.safeParse({
      ...response,
      channels: [{ ...catalogChannel, availabilityStatus: 'UNKNOWN' }],
    }).success,
    false,
  );
});

test('the target resolution contract is session-owned and contains one source URL', () => {
  const request = playbackResolutionRequestSchema.parse({
    channelId: 'channel-1',
    destination: 'web',
  });
  assert.equal(request.playbackSessionId, null);
  assert.equal(request.previousAttemptId, null);
  assert.equal(
    playbackResolutionRequestSchema.safeParse({
      channelId: 'channel-1',
      destination: 'vlc-local',
    }).success,
    false,
  );
  assert.equal(
    playbackResolutionRequestSchema.safeParse({
      channelId: 'channel-1',
      destination: 'web',
      playbackSessionId: '11111111-1111-4111-8111-111111111111',
    }).success,
    false,
  );

  const response = {
    playbackSessionId: '11111111-1111-4111-8111-111111111111',
    attemptId: '22222222-2222-4222-8222-222222222222',
    channel: { id: 'channel-1', name: 'News One' },
    sourceUrl: 'https://provider.test/live.m3u8',
  };
  assert.equal(playbackResolutionResponseSchema.safeParse(response).success, true);
  assert.equal(
    playbackResolutionResponseSchema.safeParse({
      ...response,
      sources: [
        response.sourceUrl,
        'https://another-provider.test/live.m3u8',
      ],
    }).success,
    false,
  );
  assert.equal(
    playbackResolutionResponseSchema.safeParse({
      ...response,
      streamId: 'stream-1',
    }).success,
    false,
  );
});

test('shared playback contracts reject malformed VLC and telemetry requests', () => {
  assert.equal(openVlcRequestSchema.safeParse({ channelId: 'channel-1' }).success, true);
  assert.equal(openVlcRequestSchema.safeParse({ streamId: 'stream-1' }).success, false);
  assert.equal(
    openVlcRequestSchema.safeParse({
      channelId: 'channel-1',
      url: 'https://provider.test/live.m3u8',
    }).success,
    false,
  );
  const telemetryRequest = {
    schemaVersion: 1 as const,
    event: 'opened' as const,
    playbackSessionId: '11111111-1111-4111-8111-111111111111',
    attemptId: '22222222-2222-4222-8222-222222222222',
    channelId: 'channel-1',
    timestamp: new Date().toISOString(),
    devicePlatform: 'windows',
  };
  assert.equal(playbackEventRequestSchema.safeParse(telemetryRequest).success, true);
  assert.equal(
    playbackEventRequestSchema.safeParse({
      ...telemetryRequest,
      streamId: 'stream-1',
    }).success,
    false,
  );
  assert.equal(
    playbackEventRequestSchema.safeParse({
      schemaVersion: 1,
      event: 'unknown',
      playbackSessionId: '11111111-1111-4111-8111-111111111111',
      attemptId: '22222222-2222-4222-8222-222222222222',
      channelId: 'channel-1',
      timestamp: 'not-a-date',
      devicePlatform: 'windows',
    }).success,
    false,
  );
});

test('API response reader exposes server errors and rejects malformed success payloads', async () => {
  await assert.rejects(
    readApiResponse(
      new Response(JSON.stringify({ error: 'Catalogue indisponible.', code: 'DOWN' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
      catalogResponseSchema,
    ),
    (error: unknown) =>
      error instanceof ApiRequestError && error.status === 503 && error.code === 'DOWN',
  );

  await assert.rejects(
    readApiResponse(
      new Response(JSON.stringify({ channels: 'invalides' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      catalogResponseSchema,
    ),
    /contrat attendu/,
  );

  await assert.rejects(
    readApiResponse(
      new Response('<!doctype html><title>Not found</title>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      }),
      catalogResponseSchema,
    ),
    (error: unknown) =>
      error instanceof ApiRequestError &&
      error.status === 404 &&
      error.code === 'AUTHENTICATION_REQUIRED' &&
      /session a expiré/.test(error.message),
  );

  await assert.rejects(
    readApiResponse(
      new Response('<!doctype html><title>Unavailable</title>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }),
      catalogResponseSchema,
    ),
    (error: unknown) =>
      error instanceof ApiRequestError &&
      error.status === 503 &&
      error.code === 'SERVER_UNAVAILABLE',
  );
});

test('latest request aborts and invalidates the previous response', () => {
  const requests = new LatestRequestController();
  const first = requests.begin();
  const second = requests.begin();

  assert.equal(first.signal.aborted, true);
  assert.equal(requests.isCurrent(first.id), false);
  assert.equal(requests.isCurrent(second.id), true);
  requests.abort();
  assert.equal(second.signal.aborted, true);
  assert.equal(requests.isCurrent(second.id), false);
});

test('single-flight gate refuses concurrent pagination loads', () => {
  const gate = new SingleFlightGate();
  assert.equal(gate.enter(), true);
  assert.equal(gate.enter(), false);
  gate.leave();
  assert.equal(gate.enter(), true);
});
