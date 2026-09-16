import {
  and,
  asc,
  eq,
  gt,
  inArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { channels, streams, userFavorites } from '@/db/schema';
import { catalogRequestSchema, catalogResponseSchema } from '@/lib/api-contracts';
import { BoundedJsonError, readBoundedJson } from '@/lib/bounded-json';
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

const PLAYABLE_STATUSES = ['BROWSER_OK', 'VLC_ONLY'] as const;
const PUBLIC_DIRECT_ELIGIBILITIES = [
  'PUBLIC_DIRECT_WEB',
  'PUBLIC_DIRECT_VLC',
] as const;

function invalidRequest(message: string, code = 'INVALID_CATALOG_REQUEST') {
  return NextResponse.json({ error: message, code }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAppRequest(
      { bucket: 'channels.entry', limit: 120 },
      request,
    );
    if (!authorization.ok) return authorization.response;

    let input: unknown;
    try {
      input = await readBoundedJson(request, 16 * 1_024);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE'
              ? 'Le corps JSON est trop volumineux.'
              : 'Le corps JSON est invalide.',
          code: error instanceof BoundedJsonError ? error.code : 'INVALID_JSON',
        },
        {
          status:
            error instanceof BoundedJsonError && error.code === 'BODY_TOO_LARGE'
              ? 413
              : 400,
        },
      );
    }

    const parsedInput = catalogRequestSchema.safeParse(input);
    if (!parsedInput.success) {
      return invalidRequest('Les paramètres du catalogue sont invalides.');
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
      return NextResponse.json(
        {
          error: 'Trop de requêtes catalogue. Réessayez dans quelques instants.',
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(catalogQuota.denied?.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(catalogQuota.denied?.limit ?? 0),
            'X-RateLimit-Remaining': '0',
          },
        },
      );
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
      return invalidRequest('Le curseur de pagination est invalide.', 'INVALID_CATALOG_CURSOR');
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
          status ? eq(streams.status, status) : undefined,
        ),
      );
    if (status) conditions.push(inArray(channels.id, matchingChannelIds));

    const baseWhere = and(...conditions);
    const cursorCondition = cursor
      ? or(
          gt(channels.name, cursor.name),
          and(eq(channels.name, cursor.name), gt(channels.id, cursor.id)),
        )
      : undefined;

    const rows = await db
      .select()
      .from(channels)
      .where(cursorCondition ? and(baseWhere, cursorCondition) : baseWhere)
      .orderBy(asc(channels.name), asc(channels.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageChannels = hasMore ? rows.slice(0, limit) : rows;

    const channelIds = pageChannels.map((channel) => channel.id);
    const allStreams = channelIds.length === 0
      ? []
      : await db
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

    const lastChannel = pageChannels.at(-1);
    const response = catalogResponseSchema.parse({
      channels: pageChannels.map((channel) => {
        const channelStreams = streamsByChannelId.get(channel.id) ?? [];
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
        return {
          id: channel.id,
          name: channel.name,
          logoUrl: channel.logoUrl,
          groupTitle: channel.groupTitle,
          countryCode: channel.countryCode,
          playbackMode: resolvePlaybackMode(freshPublicStreams),
          availabilityStatus: resolveChannelAvailability(
            channelStreams,
            freshnessCutoffDate,
          ),
        };
      }),
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
  } catch (error) {
    console.error('Erreur API du catalogue :', error);
    return NextResponse.json(
      { error: 'Le catalogue est temporairement indisponible.', code: 'CATALOG_UNAVAILABLE' },
      { status: 500 },
    );
  }
}
