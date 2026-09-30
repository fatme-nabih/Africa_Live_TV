import { NextResponse } from 'next/server';

import { withApiErrorHandler, BadRequestError } from '@/lib/api-errors';
import { getRadarWeather } from '@/lib/live-weather';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest(
    { bucket: 'live.weather.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const code = url.searchParams.get('code') ?? undefined;
  const city = url.searchParams.get('city') ?? undefined;
  const latStr = url.searchParams.get('lat');
  const lonStr = url.searchParams.get('lon');

  let lat: number | undefined;
  let lon: number | undefined;

  if (latStr !== null || lonStr !== null) {
    if (latStr === null || lonStr === null) {
      throw new BadRequestError(
        'Les paramètres lat et lon doivent être fournis conjointement.',
        'INVALID_COORDINATES',
      );
    }
    lat = Number(latStr);
    lon = Number(lonStr);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      throw new BadRequestError('Coordonnées géographiques invalides.', 'INVALID_COORDINATES');
    }
  }

  const snapshot = await getRadarWeather({ code, city, lat, lon });

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
