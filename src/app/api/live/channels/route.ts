import { NextResponse } from 'next/server';
import { withApiErrorHandler } from '@/lib/api-errors';
import { authorizeCatalogRequest } from '@/lib/require-app-access';
import {
  getAfricanChannelsSummary,
  getChannelsForAfricanCountry,
} from '@/lib/live-channels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest(
    { bucket: 'live.channels.read', limit: 60, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const country = url.searchParams.get('country');
  const summaryOnly = url.searchParams.get('summary') === 'true';

  if (!country || summaryOnly) {
    const summary = await getAfricanChannelsSummary();
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  const result = await getChannelsForAfricanCountry(
    country,
    authorization.decision.hasAccess,
  );

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
