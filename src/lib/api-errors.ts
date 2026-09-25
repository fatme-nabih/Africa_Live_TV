import { NextResponse } from 'next/server';
import { structuredLog } from './structured-log';
import { BoundedJsonError } from './bounded-json';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, code = 'BAD_REQUEST', headers?: HeadersInit) {
    super(message, 400, code, headers);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentification requise.', code = 'AUTHENTICATION_REQUIRED', headers?: HeadersInit) {
    super(message, 401, code, headers);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Accès refusé.', code = 'ACCESS_DENIED', headers?: HeadersInit) {
    super(message, 403, code, headers);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Ressource introuvable.', code = 'NOT_FOUND', headers?: HeadersInit) {
    super(message, 404, code, headers);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Trop de requêtes.', code = 'RATE_LIMITED', headers?: HeadersInit) {
    super(message, 429, code, headers);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporairement indisponible.', code = 'SERVICE_UNAVAILABLE', headers?: HeadersInit) {
    super(message, 503, code, headers);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Nettoie les messages d'erreur pour éviter la fuite d'informations sensibles
 * (URLs, secrets, etc.) dans les logs.
 */
function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  // Masquage basique d'URLs ou de credentials éventuels
  return message.replace(/(https?:\/\/)[^\s]+/g, '$1***');
}

export function withApiErrorHandler<T extends Request>(
  handler: (request: T, context: unknown) => Promise<NextResponse>,
) {
  return async (request: T, context: unknown): Promise<NextResponse> => {
    const correlationId = crypto.randomUUID();

    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code, correlationId },
          { status: error.status, headers: error.headers },
        );
      }

      if (error instanceof BoundedJsonError) {
        const isTooLarge = error.code === 'BODY_TOO_LARGE';
        return NextResponse.json(
          {
            error: isTooLarge ? 'Le corps JSON est trop volumineux.' : 'Le corps JSON est invalide.',
            code: error.code,
            correlationId,
          },
          { status: isTooLarge ? 413 : 400 },
        );
      }

      // Log inattendu structuré (masquant les infos sensibles)
      structuredLog('error', 'api.unhandled_error', {
        correlationId,
        method: request.method,
        url: request.url,
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: sanitizeErrorMessage(error),
      });

      return NextResponse.json(
        {
          error: 'Le service est temporairement indisponible.',
          code: 'INTERNAL_SERVER_ERROR',
          correlationId,
        },
        { status: 500 },
      );
    }
  };
}
