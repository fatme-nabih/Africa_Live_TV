import { apiEdition } from '@/lib/api-edition';
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
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
  AFRICAN_COUNTRY_CODES,
  africaRank,
  catalogCursorContext,
  decodeCatalogCursor,
  encodeCatalogCursor,
  escapeLikePattern,
  normalizeCatalogSearch,
  usesAfricaFirstOrder,
} from '@/lib/catalog-query';
import {
  resolveChannelAvailability,
  resolvePlaybackMode,
} from '@/lib/channel-selection';
import { PLAYBACK_SOURCE_FRESHNESS_MS } from '@/lib/playback-resolution-policy';
import { publicCatalogChannelCondition } from '@/lib/public-catalog-visibility';
import { authorizeCatalogRequest } from '@/lib/require-app-access';
import { consumeAdditionalRequestQuota } from '@/lib/request-quota';
import type { Channel } from '@/types/channel';
import { BadRequestError, RateLimitError, withApiErrorHandler } from '@/lib/api-errors';
import { metadataValuesMatching } from '@/lib/catalog-metadata';
import { catalogStreamCondition } from '@/lib/catalog-visibility';
import { usesLocalPlaybackPolicy } from '@/lib/local-playback-request';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';


export const POST = withApiErrorHandler(async (request: Request) => {
  const localPlayback = usesLocalPlaybackPolicy(request);
  const authorization = await authorizeCatalogRequest(
    { bucket: 'channels.entry', limit: 120 },
    request,
  );
  if (!authorization.ok) return authorization.response;

  const input = await readBoundedJson(request, 16 * 1_024);
  const parsedInput = catalogRequestSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new BadRequestError('Les paramètres du catalogue sont invalides.');
  }

  const editionUrl = new URL(request.url);
  if (parsedInput.data.edition) editionUrl.searchParams.set('edition', parsedInput.data.edition);
  const edition = apiEdition(editionUrl);
  const {
    search,
    country,
    region,
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
  const languageFirst = edition !== 'fr' && Boolean(country) && !language;
  let preferredValues: string[] = [];
  if (languageFirst) {
    const rows = await db.selectDistinct({ language: channels.language }).from(channels).where(and(eq(channels.active, true), publicCatalogChannelCondition()));
    preferredValues = metadataValuesMatching(rows.map(row => row.language), edition, 'language').filter((value): value is string => value !== null);
  }
  const cursorContext = catalogCursorContext({
    userId: authorization.user.id,
    clerkSessionId: authorization.clerkSessionId,
    search,
    country,
    region,
    group,
    language,
    status,
    favoritesOnly,
    preferredLanguage: languageFirst ? edition : undefined,
  });

  let cursor;
  try {
    cursor = decodeCatalogCursor(parsedInput.data.cursor, cursorContext);
  } catch {
    throw new BadRequestError('Le curseur de pagination est invalide.', 'INVALID_CATALOG_CURSOR');
  }
  // Ordre par défaut : Afrique d'abord, puis nom. Un curseur sans rang ne peut pas continuer cet ordre.
  const africaFirst = usesAfricaFirstOrder({ search, favoritesOnly });
  const ranked = africaFirst || languageFirst;
  if (cursor && ranked !== (cursor.rank !== undefined)) {
    throw new BadRequestError('Le curseur de pagination est invalide.', 'INVALID_CATALOG_CURSOR');
  }
  const rankColumn = languageFirst
    ? sql<number>`case when ${preferredValues.length ? inArray(channels.language, preferredValues) : sql`false`} then 0 else 1 end`
    : sql<number>`case when ${inArray(channels.countryCode, [...AFRICAN_COUNTRY_CODES])} then 0 else 1 end`;
  const rankOf = (row: typeof channels.$inferSelect) => languageFirst ? preferredValues.includes(row.language ?? '') ? 0 : 1 : africaRank(row.countryCode);

  const conditions: SQL[] = [
    eq(channels.active, true),
    publicCatalogChannelCondition(),
  ];

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
  if (region === 'africa') conditions.push(inArray(channels.countryCode, AFRICAN_COUNTRIES.map(item => item.code)));
  if (group || language) {
    const metadata = await db.selectDistinct({ group: channels.groupTitle, language: channels.language })
      .from(channels).where(and(eq(channels.active, true), publicCatalogChannelCondition()));
    for (const [column, values, code, kind] of [
      [channels.groupTitle, metadata.map(row => row.group), group, 'category'],
      [channels.language, metadata.map(row => row.language), language, 'language'],
    ] as const) {
      if (!code) continue;
      const matches = metadataValuesMatching(values, code, kind);
      const nonNull = matches.filter((value): value is string => value !== null);
      conditions.push(or(nonNull.length ? inArray(column, nonNull) : sql`false`, matches.includes(null) ? isNull(column) : sql`false`)!);
    }
  }

  const matchingChannelIds = db
    .select({ channelId: streams.channelId })
    .from(streams)
    .where(
      and(
        catalogStreamCondition(status,localPlayback),
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
      ? ranked && scanCursor.rank !== undefined
        ? or(
            gt(rankColumn, scanCursor.rank),
            and(eq(rankColumn, scanCursor.rank), gt(channels.name, scanCursor.name)),
            and(eq(rankColumn, scanCursor.rank), eq(channels.name, scanCursor.name), gt(channels.id, scanCursor.id)),
          )
        : or(
            gt(channels.name, scanCursor.name),
            and(eq(channels.name, scanCursor.name), gt(channels.id, scanCursor.id)),
          )
      : undefined;
    const rows = await db
      .select()
      .from(channels)
      .where(cursorCondition ? and(baseWhere, cursorCondition) : baseWhere)
      .orderBy(...(ranked ? [asc(rankColumn)] : []), asc(channels.name), asc(channels.id))
      .limit(scanBatchSize);

    if (rows.length === 0) {
      exhausted = true;
      break;
    }

    const lastScannedChannel = rows.at(-1)!;
    scanCursor = ranked
      ? { name: lastScannedChannel.name, id: lastScannedChannel.id, rank: rankOf(lastScannedChannel) }
      : { name: lastScannedChannel.name, id: lastScannedChannel.id };
    exhausted = rows.length < scanBatchSize;

    const channelIds = rows.map((channel) => channel.id);
    const allStreams = await db
      .select({
        channelId: streams.channelId,
        url: streams.url,
        status: streams.status,
        verificationState: streams.verificationState,
        directEligibility: streams.directEligibility,
        lastSuccessAt: streams.lastSuccessAt,
      })
      .from(streams)
      .where(
        and(
          catalogStreamCondition(status,localPlayback),
          inArray(streams.channelId, channelIds),
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
      if (!localPlayback && availabilityStatus === 'OFFLINE') continue;

      visibleRows.push({
        source: channel,
        channel: {
          id: channel.id,
          name: channel.name,
          logoUrl: channel.logoUrl,
          groupTitle: channel.groupTitle,
          countryCode: channel.countryCode,
          ...(edition !== 'fr' ? { language: channel.language } : {}),
          playbackMode: resolvePlaybackMode(channelStreams),
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
    canPlay: authorization.decision.hasAccess,
    nextCursor: hasMore && lastChannel
      ? encodeCatalogCursor(
          ranked
            ? { name: lastChannel.name, id: lastChannel.id, rank: rankOf(lastChannel) }
            : { name: lastChannel.name, id: lastChannel.id },
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
