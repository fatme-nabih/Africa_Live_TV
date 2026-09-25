import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { playbackAttempts, playbackEvents, playbackSessions } from '@/db/schema';
import {
  playbackEventRequestSchema,
  playbackEventResponseSchema,
} from '@/lib/api-contracts';
import { BoundedJsonError, readBoundedJson } from '@/lib/bounded-json';
import { consumeRateLimit } from '@/lib/rate-limit';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { structuredLog } from '@/lib/structured-log';
import {
  validateTelemetryTimestamp,
  validRequestId,
} from '@/lib/telemetry-policy';
import { ApiError, BadRequestError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';

export const runtime = 'nodejs';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

class TelemetryHttpError extends ApiError {
  constructor(status: number, code: string, message: string, headers?: HeadersInit) {
    super(message, status, code, headers);
    this.name = 'TelemetryHttpError';
  }
}

export const POST = withApiErrorHandler(async (request: Request) => {
  const startedAt = Date.now();
  const requestId = validRequestId(request.headers.get('x-request-id')) ?? randomUUID();
  let userId: string | null = null;
  let sessionId: string | null = null;

  const baseHeaders = { ...PRIVATE_HEADERS, 'X-Request-Id': requestId };

  const authorization = await authorizeAppRequest({
    bucket: 'playback-events.write',
    limit: 60,
  }, request);
  
  if (!authorization.ok) {
    for (const [name, value] of Object.entries(baseHeaders)) {
      authorization.response.headers.set(name, value);
    }
    return authorization.response;
  }
  
  userId = authorization.user.id;
  const authorizedUserId = authorization.user.id;

  let body: unknown;
  try {
    body = await readBoundedJson(request, 16 * 1_024);
  } catch (error: unknown) {
    throw new BadRequestError(
      error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE' ? 'Le corps JSON est trop volumineux.' : 'Le corps JSON est invalide.',
      error instanceof BoundedJsonError ? error.code : 'INVALID_JSON',
      baseHeaders
    );
  }
  const parsed = playbackEventRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    throw new BadRequestError('L’événement de lecture est invalide.', 'INVALID_PLAYBACK_EVENT', baseHeaders);
  }
  
  const event = parsed.data;
  sessionId = event.playbackSessionId;

  const timestampError = validateTelemetryTimestamp(event.timestamp);
  if (timestampError) {
    throw new BadRequestError(
      timestampError === 'EVENT_TOO_OLD'
        ? 'La date de l’événement est trop ancienne.'
        : 'La date de l’événement est trop éloignée dans le futur.',
      timestampError,
      baseHeaders
    );
  }

  const dailyLimit = await consumeRateLimit({
    userId: authorizedUserId,
    bucket: 'playback-events.daily',
    limit: 2_000,
    windowSeconds: 24 * 60 * 60,
  });
  
  if (!dailyLimit.allowed) {
    throw new RateLimitError('Trop d’événements de lecture. Réessayez plus tard.', 'RATE_LIMITED', {
      ...baseHeaders,
      'Retry-After': String(dailyLimit.retryAfterSeconds ?? 60),
      'X-RateLimit-Limit': String(dailyLimit.limit ?? 2000),
      'X-RateLimit-Remaining': '0',
    });
  }

  const sessionLimit = await consumeRateLimit({
    userId: authorizedUserId,
    bucket: `playback-events.session:${event.playbackSessionId}`,
    limit: 300,
    windowSeconds: 6 * 60 * 60,
  });
  
  if (!sessionLimit.allowed) {
    throw new RateLimitError('Trop d’événements de lecture. Réessayez plus tard.', 'RATE_LIMITED', {
      ...baseHeaders,
      'Retry-After': String(sessionLimit.retryAfterSeconds ?? 60),
      'X-RateLimit-Limit': String(sessionLimit.limit ?? 300),
      'X-RateLimit-Remaining': '0',
    });
  }

  const now = new Date();
  const receivedAt = now.toISOString();

  try {
    const result = await db.transaction(async (tx) => {
      const [existingSession] = await tx
        .select()
        .from(playbackSessions)
        .where(eq(playbackSessions.id, event.playbackSessionId))
        .limit(1);

      if (!existingSession || existingSession.userId !== authorizedUserId) {
        throw new TelemetryHttpError(404, 'SESSION_NOT_FOUND', 'Cette session de lecture est introuvable.', baseHeaders);
      }
      if (existingSession.channelId !== event.channelId) {
        throw new TelemetryHttpError(409, 'SESSION_CHANNEL_MISMATCH', 'Cette session est liée à une autre chaîne.', baseHeaders);
      }
      if (new Date(existingSession.expiresAt).getTime() <= now.getTime()) {
        throw new TelemetryHttpError(409, 'SESSION_EXPIRED', 'Cette session de lecture a expiré.', baseHeaders);
      }
      if (existingSession.status !== 'active' && event.event !== 'stopped') {
        throw new TelemetryHttpError(409, 'SESSION_CLOSED', 'Cette session de lecture est terminée.', baseHeaders);
      }

      const [attempt] = await tx
        .select({
          id: playbackAttempts.id,
          streamId: playbackAttempts.streamId,
          expiresAt: playbackAttempts.expiresAt,
        })
        .from(playbackAttempts)
        .where(and(
          eq(playbackAttempts.id, event.attemptId),
          eq(playbackAttempts.playbackSessionId, event.playbackSessionId),
        ))
        .limit(1);
        
      if (!attempt) {
        throw new TelemetryHttpError(404, 'ATTEMPT_NOT_FOUND', 'Cette tentative de lecture est introuvable.', baseHeaders);
      }
      if (new Date(attempt.expiresAt).getTime() <= now.getTime()) {
        throw new TelemetryHttpError(409, 'ATTEMPT_EXPIRED', 'Cette tentative de lecture a expiré.', baseHeaders);
      }

      await tx
        .update(playbackSessions)
        .set({
          playerEngine: event.playerEngine ?? existingSession.playerEngine,
          status: event.sessionEnded ? 'stopped' : existingSession.status,
          endedAt: event.sessionEnded ? event.timestamp : existingSession.endedAt,
          lastHeartbeatAt: receivedAt,
        })
        .where(and(
          eq(playbackSessions.id, event.playbackSessionId),
          eq(playbackSessions.userId, authorizedUserId),
        ));

      const id = randomUUID();
      const [inserted] = await tx
        .insert(playbackEvents)
        .values({
          id,
          userId: authorizedUserId,
          playbackSessionId: event.playbackSessionId,
          attemptId: event.attemptId,
          schemaVersion: event.schemaVersion,
          requestId,
          channelId: event.channelId,
          streamId: attempt.streamId,
          event: event.event,
          devicePlatform: event.devicePlatform,
          eventTimestamp: event.timestamp,
          startupTimeMs: event.startupTimeMs ?? null,
          appVersion: event.appVersion ?? null,
          playerEngine: event.playerEngine ?? null,
          deviceModel: event.deviceModel ?? null,
          osVersion: event.osVersion ?? null,
          errorCode: event.errorCode ?? null,
          errorMessage: event.errorMessage ?? null,
          receivedAt,
        })
        .onConflictDoNothing()
        .returning({ id: playbackEvents.id });

      return inserted?.id ?? null;
    });

    structuredLog('info', 'telemetry.event.accepted', {
      requestId,
      userId,
      playbackSessionId: sessionId,
      event: event.event,
      deduplicated: result == null,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      playbackEventResponseSchema.parse({ ok: true, id: result, deduplicated: result == null }),
      { status: result ? 201 : 200, headers: baseHeaders }
    );
  } catch (error) {
    if (error instanceof TelemetryHttpError) {
      structuredLog('warn', 'telemetry.event.rejected', {
        requestId,
        userId,
        playbackSessionId: sessionId,
        code: error.code,
        durationMs: Date.now() - startedAt,
      });
      // Il sera attrapé par withApiErrorHandler et correctement formaté
      throw error;
    }
    throw error;
  }
});
