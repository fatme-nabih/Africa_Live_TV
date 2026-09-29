import { NextResponse } from 'next/server';

import { withApiErrorHandler } from '@/lib/api-errors';
import { getRadarNews } from '@/lib/live-osint';
import { authorizeCatalogRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest(
    { bucket: 'live.news.read', limit: 20, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  return NextResponse.json(await getRadarNews(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
