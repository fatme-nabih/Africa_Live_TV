import { NextResponse } from 'next/server';

import { withApiErrorHandler, BadRequestError } from '@/lib/api-errors';
import { getLiveBriefing } from '@/lib/live-briefing';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest(
    { bucket: 'live.briefing.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const countryCode = url.searchParams.get('countryCode') || url.searchParams.get('code');
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  if (countryCode && (countryCode.length !== 2 || !/^[A-Za-z]{2}$/.test(countryCode))) {
    throw new BadRequestError('Le code pays doit être au format ISO 3166-1 alpha-2 (2 lettres).', 'INVALID_COUNTRY_CODE');
  }

  const snapshot = await getLiveBriefing({
    countryCode,
    forceRefresh,
  });

  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  });
});
