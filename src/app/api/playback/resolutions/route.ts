import { NextResponse } from 'next/server';

import {
  playbackResolutionRequestSchema,
  playbackResolutionResponseSchema,
} from '@/lib/api-contracts';
import { readBoundedJson } from '@/lib/bounded-json';
import { consumePlaybackResolutionQuota } from '@/lib/playback-quota';
import {
  PlaybackResolutionError,
  resolvePlaybackAttempt,
} from '@/lib/playback-resolution';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { structuredLog } from '@/lib/structured-log';
import { ApiError, BadRequestError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export const POST = withApiErrorHandler(async (request: Request) => {
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

  const input = await readBoundedJson(request, 8 * 1_024);
  const parsed = playbackResolutionRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError('La demande de lecture est invalide.', 'INVALID_PLAYBACK_RESOLUTION');
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
    throw new RateLimitError('Trop de résolutions. Réessayez dans quelques instants.', 'RATE_LIMITED', {
      ...PRIVATE_HEADERS,
      'Retry-After': String(resolutionQuota.denied?.retryAfterSeconds ?? 60),
      'X-RateLimit-Limit': String(resolutionQuota.denied?.limit ?? 0),
      'X-RateLimit-Remaining': '0',
    });
  }

  try {
    const result = await resolvePlaybackAttempt({
      request,
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
      throw new ApiError(error.message, error.status, error.code, PRIVATE_HEADERS);
    }
    
    // Si c'est une autre erreur inattendue, le withApiErrorHandler va l'intercepter
    throw error;
  }
});
