import { launchLocalVlc, onceLocalVlcLaunch, LocalVlcError } from '@/lib/local-vlc-launch';
import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { db } from '@/db';
import { playbackEvents } from '@/db/schema';
import { openVlcRequestSchema, openVlcResponseSchema } from '@/lib/api-contracts';
import { BoundedJsonError, readBoundedJson } from '@/lib/bounded-json';
import {
  PlaybackResolutionError,
  resolvePlaybackAttempt,
} from '@/lib/playback-resolution';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { isTrustedLocalRequest } from '@/lib/local-request';
import { consumePlaybackResolutionQuota } from '@/lib/playback-quota';
import { structuredLog } from '@/lib/structured-log';

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

export async function POST(request: Request) {
  try {
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
      return privateJson(
        { error: 'L’ouverture locale de VLC exige une requête localhost.', code: 'LOCAL_REQUEST_REQUIRED' },
        403,
      );
    }

    if (process.env.ENABLE_LOCAL_VLC !== 'true') {
      return privateJson(
        { error: 'L’ouverture locale de VLC est désactivée.', code: 'LOCAL_VLC_DISABLED' },
        501,
      );
    }

    let body: unknown;
    try {
      body = await readBoundedJson(request, 4 * 1_024);
    } catch (error) {
      return privateJson(
        {
          error:
            error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE'
              ? 'Le corps JSON est trop volumineux.'
              : 'Le corps JSON est invalide.',
          code:
            error instanceof BoundedJsonError ? error.code : 'INVALID_JSON',
        },
        error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE' ? 413 : 400,
      );
    }
    const parsed = openVlcRequestSchema.safeParse(body);
    if (!parsed.success) {
      return privateJson(
        { error: 'Un identifiant de chaîne valide est requis.', code: 'INVALID_CHANNEL_ID' },
        400,
      );
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
      const response = privateJson(
        {
          error: 'Trop d’ouvertures VLC. Réessayez dans quelques instants.',
          code: 'RATE_LIMITED',
        },
        429,
      );
      response.headers.set(
        'Retry-After',
        String(resolutionQuota.denied?.retryAfterSeconds ?? 60),
      );
      response.headers.set(
        'X-RateLimit-Limit',
        String(resolutionQuota.denied?.limit ?? 0),
      );
      response.headers.set('X-RateLimit-Remaining', '0');
      return response;
    }
    const launchKey = authorization.user.id + ':' + parsed.data.channelId + ':' + (parsed.data.launchId ?? randomUUID());
    await onceLocalVlcLaunch(launchKey, async () => {
    if (request.signal.aborted) throw new LocalVlcError('VLC_REQUEST_CANCELLED', 'Ouverture VLC annulée.');
    const resolution = await resolvePlaybackAttempt({
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
      return privateJson({ error: error.message, code: error.code }, error.code === 'VLC_NOT_INSTALLED' ? 404 : 503);
    }
    if (error instanceof PlaybackResolutionError) {
      return privateJson({ error: error.message, code: error.code }, error.status);
    }
    structuredLog('error', 'playback.vlc_local.failed', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return privateJson(
      { error: 'Impossible d’ouvrir VLC.', code: 'VLC_LAUNCH_FAILED' },
      500,
    );
  }
}
