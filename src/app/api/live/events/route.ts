import { NextResponse } from 'next/server';

import { withApiErrorHandler, BadRequestError } from '@/lib/api-errors';
import { getDisasterEventsSnapshot } from '@/lib/live-disasters';
import type { DisasterEventType } from '@/lib/live-disasters-types';
import { authorizeAppRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_EVENT_TYPES = new Set<DisasterEventType>([
  'earthquake',
  'cyclone',
  'flood',
  'volcano',
  'drought',
  'other',
]);

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'live.events.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const minMagStr = url.searchParams.get('minMagnitude');
  const eventTypeStr = url.searchParams.get('eventType');
  const limitStr = url.searchParams.get('limit');

  let minMagnitude: number | undefined;
  let eventType: DisasterEventType | undefined;
  let limit: number | undefined;

  if (minMagStr !== null) {
    minMagnitude = parseFloat(minMagStr);
    if (!Number.isFinite(minMagnitude) || minMagnitude < 0 || minMagnitude > 10) {
      throw new BadRequestError(
        'Le paramètre minMagnitude doit être un nombre compris entre 0 et 10.',
        'INVALID_MAGNITUDE',
      );
    }
  }

  if (eventTypeStr !== null) {
    if (!VALID_EVENT_TYPES.has(eventTypeStr as DisasterEventType)) {
      throw new BadRequestError(
        'Type d’événement invalide. Valeurs supportées: earthquake, cyclone, flood, volcano, drought, other.',
        'INVALID_EVENT_TYPE',
      );
    }
    eventType = eventTypeStr as DisasterEventType;
  }

  if (limitStr !== null) {
    limit = parseInt(limitStr, 10);
    if (!Number.isFinite(limit) || limit < 1 || limit > 500) {
      throw new BadRequestError(
        'Le paramètre limit doit être un entier compris entre 1 et 500.',
        'INVALID_LIMIT',
      );
    }
  }

  const snapshot = await getDisasterEventsSnapshot({
    minMagnitude,
    eventType,
    limit,
  });

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
