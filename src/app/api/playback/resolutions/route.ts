import { NextResponse } from 'next/server';

import {
  playbackResolutionRequestSchema,
  playbackResolutionResponseSchema,
} from '@/lib/api-contracts';
import { BoundedJsonError, readBoundedJson } from '@/lib/bounded-json';
import { consumePlaybackResolutionQuota } from '@/lib/playback-quota';
import {
  PlaybackResolutionError,
  resolvePlaybackAttempt,
} from '@/lib/playback-resolution';
import { authorizeAppRequest } from '@/lib/require-app-access';
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

export async function POST(request: Request) {
  const authorization = await authorizeAppRequest({
    bucket: 'playback.resolve.entry',
    limit: 60,
  }, request);
  if (!authorization.ok) {
    for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
      authorization.response.headers.set(name, value);
    }
    return authorization.response;
  }

  let input: unknown;
  try {
    input = await readBoundedJson(request, 8 * 1_024);
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
  const parsed = playbackResolutionRequestSchema.safeParse(input);
  if (!parsed.success) {
    return privateJson(
      { error: 'La demande de lecture est invalide.', code: 'INVALID_PLAYBACK_RESOLUTION' },
      400,
    );
  }

  const resolutionQuota = await consumePlaybackResolutionQuota({
    userId: authorization.user.id,
    clerkSessionId: authorization.clerkSessionId,
    networkFingerprint: authorization.abuseContext.networkFingerprint,
    channelId: parsed.data.channelId,
    destination: parsed.data.destination,
    tier: authorization.quotaTier,
  });
  if (!resolutionQuota.allowed) {
    const response = privateJson(
      {
        error: 'Trop de résolutions. Réessayez dans quelques instants.',
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

  try {
    const result = await resolvePlaybackAttempt({
      userId: authorization.user.id,
      channelId: parsed.data.channelId,
      destination: parsed.data.destination,
      playbackSessionId: parsed.data.playbackSessionId,
      previousAttemptId: parsed.data.previousAttemptId,
      accessExpiresAt: authorization.decision.expiresAt,
    });
    return privateJson(playbackResolutionResponseSchema.parse({
      playbackSessionId: result.playbackSessionId,
      attemptId: result.attemptId,
      channel: result.channel,
      sourceUrl: result.source.url,
    }));
  } catch (error) {
    if (error instanceof PlaybackResolutionError) {
      structuredLog('warn', 'playback.resolution.rejected', {
        userId: authorization.user.id,
        channelId: parsed.data.channelId,
        destination: parsed.data.destination,
        code: error.code,
      });
      return privateJson({ error: error.message, code: error.code }, error.status);
    }

    structuredLog('error', 'playback.resolution.failed', {
      userId: authorization.user.id,
      channelId: parsed.data.channelId,
      destination: parsed.data.destination,
      errorName: error instanceof Error ? error.name : 'UnknownError',
    });
    return privateJson(
      { error: 'La résolution de lecture est indisponible.', code: 'PLAYBACK_RESOLUTION_UNAVAILABLE' },
      503,
    );
  }
}
