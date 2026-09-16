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
import { consumeRateLimit, type RateLimitResult } from '@/lib/rate-limit';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { structuredLog } from '@/lib/structured-log';
import {
  validateTelemetryTimestamp,
  validRequestId,
} from '@/lib/telemetry-policy';

export const runtime = 'nodejs';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
};

class TelemetryHttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

function jsonWithRequestId(
  requestId: string,
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { ...PRIVATE_HEADERS, ...headers, 'X-Request-Id': requestId },
  });
}

function rateLimitResponse(requestId: string, result: RateLimitResult) {
  return jsonWithRequestId(
    requestId,
    { error: 'Trop d’événements de lecture. Réessayez plus tard.', code: 'RATE_LIMITED' },
    429,
    {
      'Retry-After': String(result.retryAfterSeconds),
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': '0',
    },
  );
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = validRequestId(request.headers.get('x-request-id')) ?? randomUUID();
  let userId: string | null = null;
  let sessionId: string | null = null;

  try {
    const authorization = await authorizeAppRequest({
      bucket: 'playback-events.write',
      limit: 60,
    }, request);
    if (!authorization.ok) {
      authorization.response.headers.set('X-Request-Id', requestId);
      for (const [name, value] of Object.entries(PRIVATE_HEADERS)) {
        authorization.response.headers.set(name, value);
      }
      return authorization.response;
    }
    userId = authorization.user.id;
    const authorizedUserId = authorization.user.id;

    let body: unknown;
    try {
      body = await readBoundedJson(request, 16 * 1_024);
    } catch (error) {
      return jsonWithRequestId(
        requestId,
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

    const parsed = playbackEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonWithRequestId(
        requestId,
        { error: 'L’événement de lecture est invalide.', code: 'INVALID_PLAYBACK_EVENT' },
        400,
      );
    }
    const event = parsed.data;
    sessionId = event.playbackSessionId;

    const timestampError = validateTelemetryTimestamp(event.timestamp);
    if (timestampError) {
      return jsonWithRequestId(
        requestId,
        {
          error: timestampError === 'EVENT_TOO_OLD'
            ? 'La date de l’événement est trop ancienne.'
            : 'La date de l’événement est trop éloignée dans le futur.',
          code: timestampError,
        },
        400,
      );
    }

    const dailyLimit = await consumeRateLimit({
      userId: authorizedUserId,
      bucket: 'playback-events.daily',
      limit: 2_000,
      windowSeconds: 24 * 60 * 60,
    });
    if (!dailyLimit.allowed) return rateLimitResponse(requestId, dailyLimit);

    const sessionLimit = await consumeRateLimit({
      userId: authorizedUserId,
      bucket: `playback-events.session:${event.playbackSessionId}`,
      limit: 300,
      windowSeconds: 6 * 60 * 60,
    });
    if (!sessionLimit.allowed) return rateLimitResponse(requestId, sessionLimit);

    const now = new Date();
    const receivedAt = now.toISOString();
    const result = await db.transaction(async (tx) => {
      const [existingSession] = await tx
        .select()
        .from(playbackSessions)
        .where(eq(playbackSessions.id, event.playbackSessionId))
        .limit(1);

      if (!existingSession || existingSession.userId !== authorizedUserId) {
        throw new TelemetryHttpError(404, 'SESSION_NOT_FOUND', 'Cette session de lecture est introuvable.');
      }
      if (existingSession.channelId !== event.channelId) {
        throw new TelemetryHttpError(409, 'SESSION_CHANNEL_MISMATCH', 'Cette session est liée à une autre chaîne.');
      }
      if (new Date(existingSession.expiresAt).getTime() <= now.getTime()) {
        throw new TelemetryHttpError(409, 'SESSION_EXPIRED', 'Cette session de lecture a expiré.');
      }
      if (existingSession.status !== 'active' && event.event !== 'stopped') {
        throw new TelemetryHttpError(409, 'SESSION_CLOSED', 'Cette session de lecture est terminée.');
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
        throw new TelemetryHttpError(404, 'ATTEMPT_NOT_FOUND', 'Cette tentative de lecture est introuvable.');
      }
      if (new Date(attempt.expiresAt).getTime() <= now.getTime()) {
        throw new TelemetryHttpError(409, 'ATTEMPT_EXPIRED', 'Cette tentative de lecture a expiré.');
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

    return jsonWithRequestId(
      requestId,
      playbackEventResponseSchema.parse({ ok: true, id: result, deduplicated: result == null }),
      result ? 201 : 200,
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
      return jsonWithRequestId(requestId, { error: error.message, code: error.code }, error.status);
    }

    structuredLog('error', 'telemetry.database_unavailable', {
      requestId,
      userId,
      playbackSessionId: sessionId,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      durationMs: Date.now() - startedAt,
    });
    return jsonWithRequestId(
      requestId,
      { error: 'La télémétrie est temporairement indisponible.', code: 'TELEMETRY_UNAVAILABLE' },
      503,
    );
  }
}
