import { apiEdition } from '@/lib/api-edition';
import { NextResponse } from 'next/server';

import { withApiErrorHandler } from '@/lib/api-errors';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { editionBridgeCounts, getRadarRss } from '@/lib/rss-collector';
import { enabledEditions } from '@/lib/editions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'live.rss.read', limit: 30, windowSeconds: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const url = new URL(request.url);
  const edition = apiEdition(url);
  const source = url.searchParams.get('source') ?? undefined;
  const country = url.searchParams.get('country') ?? undefined;
  const rawLimit = url.searchParams.get('limit');
  const limit = rawLimit ? Math.min(Math.max(1, Number(rawLimit) || 50), 100) : undefined;

  const snapshot = await getRadarRss({ source, country, limit, edition });
  // Pont entre éditions (EDI-601) : champ ajouté seulement si une autre édition active a un cache valide.
  // Avec la seule édition française (`EDITIONS=fr`), la réponse reste strictement identique.
  const bridge = editionBridgeCounts(edition, enabledEditions());

  return NextResponse.json(bridge.length ? { ...snapshot, bridge } : snapshot, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
