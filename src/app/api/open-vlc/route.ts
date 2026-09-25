import { launchLocalVlc, onceLocalVlcLaunch, LocalVlcError } from '@/lib/local-vlc-launch';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { playbackEvents } from '@/db/schema';
import { openVlcRequestSchema, openVlcResponseSchema } from '@/lib/api-contracts';
import { readBoundedJson } from '@/lib/bounded-json';
import {
  PlaybackResolutionError,
  resolvePlaybackAttempt,
} from '@/lib/playback-resolution';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { isTrustedLocalRequest } from '@/lib/local-request';
import { consumePlaybackResolutionQuota } from '@/lib/playback-quota';
import { structuredLog } from '@/lib/structured-log';
import { ApiError, BadRequestError, ForbiddenError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

async function recordLocalVlcOpened({
  userId,
  playbackSessionId,
  attemptId,
  channelId,
  streamId,
}: {
  userId: string;
  playbackSessionId: string;
  attemptId: string;
  channelId: string;
  streamId: string;
}) {
  const timestamp = new Date().toISOString();
  await db.insert(playbackEvents).values({
    id: randomUUID(),
    userId,
    playbackSessionId,
    attemptId,
    schemaVersion: 1,
    requestId: null,
    channelId,
    streamId,
    event: 'opened',
    devicePlatform: 'local-vlc',
    eventTimestamp: timestamp,
    playerEngine: 'vlc',
    receivedAt: timestamp,
  }).onConflictDoNothing();
}

export const POST = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'vlc.open.entry', limit: 30 },
    request,
  );
  if (!authorization.ok) {
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
      authorization.response.headers.set(name, value);
    }
    return authorization.response;
  }

  if (!isTrustedLocalRequest(request)) {
    throw new ForbiddenError('L’ouverture locale de VLC exige une requête localhost.', 'LOCAL_REQUEST_REQUIRED', PRIVATE_HEADERS);
  }

  if (process.env.ENABLE_LOCAL_VLC !== 'true') {
    throw new ApiError('L’ouverture locale de VLC est désactivée.', 501, 'LOCAL_VLC_DISABLED', PRIVATE_HEADERS);
  }

  const body = await readBoundedJson(request, 4 * 1_024);
  const parsed = openVlcRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw new BadRequestError('Un identifiant de chaîne valide est requis.', 'INVALID_CHANNEL_ID', PRIVATE_HEADERS);
  }

  const resolutionQuota = await consumePlaybackResolutionQuota({
    userId: authorization.user.id,
    clerkSessionId: authorization.clerkSessionId,
    networkFingerprint: authorization.abuseContext.networkFingerprint,
    channelId: parsed.data.channelId,
    destination: 'vlc-local',
    tier: authorization.quotaTier,
  });
  
  if (!resolutionQuota.allowed) {
    throw new RateLimitError('Trop d’ouvertures VLC. Réessayez dans quelques instants.', 'RATE_LIMITED', {
      ...PRIVATE_HEADERS,
      'Retry-After': String(resolutionQuota.denied?.retryAfterSeconds ?? 60),
      'X-RateLimit-Limit': String(resolutionQuota.denied?.limit ?? 0),
      'X-RateLimit-Remaining': '0',
    });
  }

  try {
    const launchKey = authorization.user.id + ':' + parsed.data.channelId + ':' + (parsed.data.launchId ?? randomUUID());
    await onceLocalVlcLaunch(launchKey, async () => {
      if (request.signal.aborted) throw new LocalVlcError('VLC_REQUEST_CANCELLED', 'Ouverture VLC annulée.');
      
      const resolution = await resolvePlaybackAttempt({
        request,
        userId: authorization.user.id,
        channelId: parsed.data.channelId,
        destination: 'vlc-local',
        playbackSessionId: null,
        previousAttemptId: null,
        accessExpiresAt: authorization.decision.expiresAt,
      });

      if (request.signal.aborted) throw new LocalVlcError('VLC_REQUEST_CANCELLED', 'Ouverture VLC annulée.');
      await launchLocalVlc(resolution.source.url);
      
      try {
        await recordLocalVlcOpened({
          userId: authorization.user.id,
          playbackSessionId: resolution.playbackSessionId,
          attemptId: resolution.attemptId,
          channelId: resolution.channel.id,
          streamId: resolution.source.id,
        });
      } catch (telemetryError) {
        structuredLog('warn', 'playback.vlc_local.telemetry_failed', {
          userId: authorization.user.id,
          channelId: resolution.channel.id,
          playbackSessionId: resolution.playbackSessionId,
          attemptId: resolution.attemptId,
          errorName: telemetryError instanceof Error
            ? telemetryError.name
            : 'UnknownError',
        });
      }
      
      structuredLog('info', 'playback.vlc_local.opened', {
        userId: authorization.user.id,
        channelId: resolution.channel.id,
        playbackSessionId: resolution.playbackSessionId,
        attemptId: resolution.attemptId,
      });
    });

    return privateJson(openVlcResponseSchema.parse({ ok: true }));
  } catch (error) {
    if (error instanceof LocalVlcError) {
      throw new ApiError(error.message, error.code === 'VLC_NOT_INSTALLED' ? 404 : 503, error.code, PRIVATE_HEADERS);
    }
    if (error instanceof PlaybackResolutionError) {
      throw new ApiError(error.message, error.status, error.code, PRIVATE_HEADERS);
    }
    
    structuredLog('error', 'playback.vlc_local.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    
    throw new ApiError('Impossible d’ouvrir VLC.', 500, 'VLC_LAUNCH_FAILED', PRIVATE_HEADERS);
  }
});
