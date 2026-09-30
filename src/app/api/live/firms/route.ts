import { NextResponse } from 'next/server';

import { withApiErrorHandler, BadRequestError } from '@/lib/api-errors';
import { getFirmsSnapshot } from '@/lib/live-firms';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest(
    { bucket: 'live.firms.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const minConfidenceStr = url.searchParams.get('minConfidence');
  const limitStr = url.searchParams.get('limit');

  let minConfidence: number | undefined;
  let limit: number | undefined;

  if (minConfidenceStr !== null) {
    minConfidence = parseInt(minConfidenceStr, 10);
    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 100) {
      throw new BadRequestError(
        'Le paramètre minConfidence doit être un entier compris entre 0 et 100.',
        'INVALID_CONFIDENCE',
      );
    }
  }

  if (limitStr !== null) {
    limit = parseInt(limitStr, 10);
    if (!Number.isFinite(limit) || limit < 1 || limit > 5000) {
      throw new BadRequestError(
        'Le paramètre limit doit être un entier compris entre 1 et 5000.',
        'INVALID_LIMIT',
      );
    }
  }

  const snapshot = await getFirmsSnapshot({ minConfidence, limit });

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
