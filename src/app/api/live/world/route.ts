import { apiEdition } from '@/lib/api-edition';
import { NextResponse } from 'next/server';

import { withApiErrorHandler } from '@/lib/api-errors';
import { getWorldDesk } from '@/lib/world-desk';
import { authorizeAppRequest } from '@/lib/require-app-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'live.world.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const edition = apiEdition(url);
  const forceRefresh = url.searchParams.get('refresh') === 'true';

  const snapshot = await getWorldDesk({ forceRefresh, edition });

  return NextResponse.json(snapshot, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
});
