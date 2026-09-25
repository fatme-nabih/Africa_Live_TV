import {
  and,
  asc,
  eq,
  gt,
  gte,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, streams, userFavorites } from '@/db/schema';
import { catalogRequestSchema, catalogResponseSchema } from '@/lib/api-contracts';
import { readBoundedJson } from '@/lib/bounded-json';
import {
  catalogCursorContext,
  decodeCatalogCursor,
  encodeCatalogCursor,
  escapeLikePattern,
  normalizeCatalogSearch,
} from '@/lib/catalog-query';
import {
  resolveChannelAvailability,
  resolvePlaybackMode,
} from '@/lib/channel-selection';
import { PLAYBACK_SOURCE_FRESHNESS_MS } from '@/lib/playback-resolution-policy';
import { authorizeAppRequest } from '@/lib/require-app-access';
import { consumeAdditionalRequestQuota } from '@/lib/request-quota';
import type { Channel } from '@/types/channel';
import { BadRequestError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';

const PLAYABLE_STATUSES = ['BROWSER_OK', 'VLC_ONLY'] as const;
const PUBLIC_DIRECT_ELIGIBILITIES = [
  'PUBLIC_DIRECT_WEB',
  'PUBLIC_DIRECT_VLC',
] as const;

export const POST = withApiErrorHandler(async (request: Request) => {
  const authorization = await authorizeAppRequest(
    { bucket: 'channels.entry', limit: 120 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const input = await readBoundedJson(request, 16 * 1_024);
  const parsedInput = catalogRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new BadRequestError('Les paramètres du catalogue sont invalides.');
  }

  const {
    search,
    country,
    group,
    language,
    status,
    favoritesOnly,
    limit,
  } = parsedInput.data;

  const catalogQuota = await consumeAdditionalRequestQuota({
    userId: authorization.user.id,
    clerkSessionId: authorization.clerkSessionId,
    networkFingerprint: authorization.abuseContext.networkFingerprint,
    bucket: search ? 'channels.search' : 'channels.page',
    userLimit: search ? 30 : 60,
  });

  if (!catalogQuota.allowed) {
    throw new RateLimitError('Trop de requêtes catalogue. Réessayez dans quelques instants.', 'RATE_LIMITED', {
      'Retry-After': String(catalogQuota.denied?.retryAfterSeconds ?? 60),
      'X-RateLimit-Limit': String(catalogQuota.denied?.limit ?? 0),
      'X-RateLimit-Remaining': '0',
    });
  }

  const freshnessCutoffDate = new Date(
    Date.now() - PLAYBACK_SOURCE_FRESHNESS_MS,
  );
  const cursorContext = catalogCursorContext({
    userId: authorization.user.id,
    clerkSessionId: authorization.clerkSessionId,
    search,
    country,
    group,
    language,
    status,
    favoritesOnly,
  });

  let cursor;
  try {
    cursor = decodeCatalogCursor(parsedInput.data.cursor, cursorContext);
  } catch {
    throw new BadRequestError('Le curseur de pagination est invalide.', 'INVALID_CATALOG_CURSOR');
  }

  const conditions: SQL[] = [eq(channels.active, true)];

  if (favoritesOnly) {
    const favoriteChannelIds = db
      .select({ channelId: userFavorites.channelId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, authorization.user.id));
    conditions.push(inArray(channels.id, favoriteChannelIds));
  }

  if (search) {
    const escapedSearch = escapeLikePattern(normalizeCatalogSearch(search));
    conditions.push(sql`${channels.normalizedName} like ${`%${escapedSearch}%`} escape '\\'`);
  }

  if (country) conditions.push(eq(channels.countryCode, country.toUpperCase()));
  if (group) conditions.push(eq(channels.groupTitle, group));
  if (language) {
    conditions.push(
      sql`${language.toLowerCase()} = any(
        string_to_array(lower(coalesce(${channels.language}, '')), ';')
      )`,
    );
  }

  const matchingChannelIds = db
    .select({ channelId: streams.channelId })
    .from(streams)
    .where(
      and(
        eq(streams.active, true),
        eq(streams.verificationState, 'HEALTHY'),
        inArray(streams.status, PLAYABLE_STATUSES),
        inArray(streams.directEligibility, PUBLIC_DIRECT_ELIGIBILITIES),
        gte(streams.lastSuccessAt, freshnessCutoffDate.toISOString()),
        status ? eq(streams.status, status) : undefined,
      ),
    );
  conditions.push(inArray(channels.id, matchingChannelIds));

  const baseWhere = and(...conditions);
  const scanBatchSize = Math.max(limit * 4, 120);
  const visibleRows: Array<{
    source: typeof channels.$inferSelect;
    channel: Channel;
  }> = [];
  let scanCursor = cursor;
  let exhausted = false;

  while (visibleRows.length < limit + 1 && !exhausted) {
    const cursorCondition = scanCursor
      ? or(
          gt(channels.name, scanCursor.name),
          and(eq(channels.name, scanCursor.name), gt(channels.id, scanCursor.id)),
        )
      : undefined;
    const rows = await db
      .select()
      .from(channels)
      .where(cursorCondition ? and(baseWhere, cursorCondition) : baseWhere)
      .orderBy(asc(channels.name), asc(channels.id))
      .limit(scanBatchSize);

    if (rows.length === 0) {
      exhausted = true;
      break;
    }

    const lastScannedChannel = rows.at(-1)!;
    scanCursor = { name: lastScannedChannel.name, id: lastScannedChannel.id };
    exhausted = rows.length < scanBatchSize;

    const channelIds = rows.map((channel) => channel.id);
    const allStreams = await db
      .select({
        channelId: streams.channelId,
        status: streams.status,
        verificationState: streams.verificationState,
        directEligibility: streams.directEligibility,
        lastSuccessAt: streams.lastSuccessAt,
      })
      .from(streams)
      .where(
        and(
          eq(streams.active, true),
          eq(streams.verificationState, 'HEALTHY'),
          inArray(streams.status, PLAYABLE_STATUSES),
          inArray(streams.directEligibility, PUBLIC_DIRECT_ELIGIBILITIES),
          gte(streams.lastSuccessAt, freshnessCutoffDate.toISOString()),
          inArray(streams.channelId, channelIds),
          status ? eq(streams.status, status) : undefined,
        ),
      );

    const streamsByChannelId = new Map<string, typeof allStreams>();
    for (const stream of allStreams) {
      const channelStreams = streamsByChannelId.get(stream.channelId) ?? [];
      channelStreams.push(stream);
      streamsByChannelId.set(stream.channelId, channelStreams);
    }

    for (const channel of rows) {
      const channelStreams = streamsByChannelId.get(channel.id) ?? [];
      if (channelStreams.length === 0) continue;
      const availabilityStatus = resolveChannelAvailability(
        channelStreams,
        freshnessCutoffDate,
      );
      if (availabilityStatus !== 'READY') continue;

      const freshPublicStreams = channelStreams.filter((stream) => {
        const lastSuccessAt = stream.lastSuccessAt
          ? new Date(stream.lastSuccessAt).getTime()
          : Number.NaN;
        return (
          Number.isFinite(lastSuccessAt) &&
          lastSuccessAt >= freshnessCutoffDate.getTime() &&
          PLAYABLE_STATUSES.includes(
            stream.status as (typeof PLAYABLE_STATUSES)[number],
          ) &&
          PUBLIC_DIRECT_ELIGIBILITIES.includes(
            stream.directEligibility as (
              typeof PUBLIC_DIRECT_ELIGIBILITIES
            )[number],
          )
        );
      });
      visibleRows.push({
        source: channel,
        channel: {
          id: channel.id,
          name: channel.name,
          logoUrl: channel.logoUrl,
          groupTitle: channel.groupTitle,
          countryCode: channel.countryCode,
          playbackMode: resolvePlaybackMode(freshPublicStreams),
          availabilityStatus,
        },
      });
    }
  }

  const hasMore = visibleRows.length > limit;
  const pageRows = hasMore ? visibleRows.slice(0, limit) : visibleRows;
  const lastChannel = pageRows.at(-1)?.source;
  const response = catalogResponseSchema.parse({
    channels: pageRows.map(({ channel }) => channel),
    hasMore,
    limit,
    nextCursor: hasMore && lastChannel
      ? encodeCatalogCursor(
          { name: lastChannel.name, id: lastChannel.id },
          cursorContext,
        )
      : null,
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
});
