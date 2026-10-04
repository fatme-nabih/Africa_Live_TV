import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { channels } from '@/db/schema';
import { filterOptionsResponseSchema } from '@/lib/api-contracts';
import { categoryCodes, catalogLanguageCodes } from '@/lib/catalog-metadata';
import { catalogHasVisibleStream, VISIBLE_STREAM_STATUSES } from '@/lib/catalog-visibility';
import { publicCatalogChannelCondition } from '@/lib/public-catalog-visibility';
import { authorizeCatalogRequest } from '@/lib/require-app-access';
import { withApiErrorHandler } from '@/lib/api-errors';
import { usesLocalPlaybackPolicy } from '@/lib/local-playback-request';

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeCatalogRequest({ bucket: 'filters.read', limit: 60 }, request);
  if (!authorization.ok) return authorization.response;
  const rows = await db.selectDistinct({ country: channels.countryCode, group: channels.groupTitle, language: channels.language })
    .from(channels).where(and(eq(channels.active, true), publicCatalogChannelCondition(), catalogHasVisibleStream(usesLocalPlaybackPolicy(request))));
  const unique = (values: string[]) => [...new Set(values)].sort();
  const response = filterOptionsResponseSchema.parse({
    countries: unique(rows.flatMap(row => row.country ? [row.country.trim().toUpperCase()] : [])),
    groups: unique(rows.flatMap(row => categoryCodes(row.group))),
    languages: unique(rows.flatMap(row => catalogLanguageCodes(row.language))),
    statuses: [...VISIBLE_STREAM_STATUSES],
  });
  return NextResponse.json(response, { headers: { 'Cache-Control': 'private, no-store' } });
});
