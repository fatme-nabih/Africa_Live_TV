import { and, eq, gte, inArray, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, streams } from '@/db/schema';
import { filterOptionsResponseSchema } from '@/lib/api-contracts';
import { parseLanguageCodes } from '@/lib/channel-language';
import { PLAYBACK_SOURCE_FRESHNESS_MS } from '@/lib/playback-resolution-policy';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { withApiErrorHandler } from '@/lib/api-errors';

const PLAYABLE_STATUSES = ['BROWSER_OK', 'VLC_ONLY'] as const;
const PUBLIC_DIRECT_ELIGIBILITIES = [
  'PUBLIC_DIRECT_WEB',
  'PUBLIC_DIRECT_VLC',
] as const;

export const GET = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'filters.read', limit: 60 },
    request,
  );
  if (!authorization.ok) return authorization.response;
  
  const freshnessCutoff = new Date(
    Date.now() - PLAYBACK_SOURCE_FRESHNESS_MS,
  ).toISOString();

  const availableJoin = and(
    eq(streams.channelId, channels.id),
    eq(streams.active, true),
    eq(streams.verificationState, 'HEALTHY'),
    gte(streams.lastSuccessAt, freshnessCutoff),
    inArray(streams.status, PLAYABLE_STATUSES),
    inArray(streams.directEligibility, PUBLIC_DIRECT_ELIGIBILITIES),
  );
  
  const [rawCountries, rawGroups, rawLanguages, rawStatuses] = await Promise.all([
    db
      .selectDistinct({ code: channels.countryCode })
      .from(channels)
      .innerJoin(streams, availableJoin)
      .where(eq(channels.active, true)),
    db
      .selectDistinct({ title: channels.groupTitle })
      .from(channels)
      .innerJoin(streams, availableJoin)
      .where(eq(channels.active, true)),
    db
      .selectDistinct({ language: channels.language })
      .from(channels)
      .innerJoin(streams, availableJoin)
      .where(
        and(
          eq(channels.active, true),
          isNotNull(channels.language),
        ),
      ),
    db
      .selectDistinct({ status: streams.status })
      .from(channels)
      .innerJoin(streams, availableJoin)
      .where(eq(channels.active, true)),
  ]);

  const response = filterOptionsResponseSchema.parse({
    countries: rawCountries
      .map(({ code }) => code)
      .filter((code): code is string => Boolean(code))
      .sort(),
    groups: rawGroups
      .map(({ title }) => title)
      .filter((title): title is string => Boolean(title))
      .sort((left, right) => left.localeCompare(right, 'fr')),
    languages: [
      ...new Set(
        rawLanguages.flatMap(({ language }) => parseLanguageCodes(language)),
      ),
    ].sort(),
    statuses: PLAYABLE_STATUSES.filter((status) =>
      rawStatuses.some((row) => row.status === status),
    ),
  });

  return NextResponse.json(response);
});
