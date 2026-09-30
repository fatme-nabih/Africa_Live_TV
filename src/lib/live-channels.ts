import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { channels, streams } from '@/db/schema';
import { AFRICAN_COUNTRIES } from '@/lib/live-osint';
import { publicCatalogChannelCondition } from '@/lib/public-catalog-visibility';
import {
  resolveChannelAvailability,
  resolvePlaybackMode,
} from '@/lib/channel-selection';
import { PLAYBACK_SOURCE_FRESHNESS_MS } from '@/lib/playback-resolution-policy';
import type {
  CountryChannelCount,
  LiveChannelsSummarySnapshot,
  LiveCountryChannelsSnapshot,
} from '@/lib/live-channels-types';
import type { Channel } from '@/types/channel';

const SUMMARY_CACHE_TTL_MS = 10 * 60_000;
const CHANNELS_CACHE_TTL_MS = 5 * 60_000;
const VISIBLE_STREAM_STATUSES = ['BROWSER_OK', 'VLC_ONLY', 'UNTESTED'] as const;

const AFRICAN_COUNTRY_NAME_BY_CODE = new Map(
  AFRICAN_COUNTRIES.map((c) => [c.code, c.name] as const),
);

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

let summaryCache: CachedEntry<LiveChannelsSummarySnapshot> | null = null;
let summaryInFlight: Promise<LiveChannelsSummarySnapshot> | null = null;
const countryChannelsCache = new Map<string, CachedEntry<Channel[]>>();

export function _clearLiveChannelsCache() {
  summaryCache = null;
  summaryInFlight = null;
  countryChannelsCache.clear();
}

export type LiveChannelsDb = typeof db;

export async function getAfricanChannelsSummary(
  customDb: LiveChannelsDb = db,
): Promise<LiveChannelsSummarySnapshot> {
  const now = Date.now();
  if (summaryCache && now - summaryCache.timestamp < SUMMARY_CACHE_TTL_MS) {
    return summaryCache.data;
  }

  if (summaryInFlight) {
    return summaryInFlight;
  }

  summaryInFlight = (async () => {
    try {
      const africanCodes = AFRICAN_COUNTRIES.map((c) => c.code);

      const rows = await customDb
        .select({
          countryCode: channels.countryCode,
          channelCount: sql<number>`count(DISTINCT ${channels.id})::int`,
          directWebCount: sql<number>`count(DISTINCT CASE WHEN ${streams.directEligibility} = 'PUBLIC_DIRECT_WEB' OR ${streams.status} = 'BROWSER_OK' THEN ${channels.id} END)::int`,
        })
        .from(channels)
        .innerJoin(
          streams,
          and(
            eq(streams.channelId, channels.id),
            eq(streams.active, true),
            sql`${streams.status} != 'OFFLINE'`,
            sql`${streams.directEligibility} != 'OFFLINE'`,
          ),
        )
        .where(
          and(
            eq(channels.active, true),
            publicCatalogChannelCondition(),
            inArray(channels.countryCode, africanCodes),
          ),
        )
        .groupBy(channels.countryCode);

      const countriesRecord: Record<string, CountryChannelCount> = {};
      let totalChannels = 0;
      let totalDirectWeb = 0;

      for (const row of rows) {
        if (!row.countryCode) continue;
        const code = row.countryCode.toUpperCase();
        const chCount = Number(row.channelCount) || 0;
        const webCount = Number(row.directWebCount) || 0;

        countriesRecord[code] = {
          countryCode: code,
          channelCount: chCount,
          directWebCount: webCount,
        };

        totalChannels += chCount;
        totalDirectWeb += webCount;
      }

      const snapshot: LiveChannelsSummarySnapshot = {
        updatedAt: new Date(now).toISOString(),
        countries: countriesRecord,
        totalChannels,
        totalDirectWeb,
      };

      summaryCache = { data: snapshot, timestamp: now };
      return snapshot;
    } catch (error) {
      if (summaryCache) {
        return { ...summaryCache.data, stale: true };
      }
      throw error;
    } finally {
      summaryInFlight = null;
    }
  })();

  return summaryInFlight;
}

export async function getChannelsForAfricanCountry(
  countryCode: string,
  canPlay: boolean,
  limit = 40,
  customDb: LiveChannelsDb = db,
): Promise<LiveCountryChannelsSnapshot> {
  const normalizedCode = countryCode.trim().toUpperCase();
  const countryName = AFRICAN_COUNTRY_NAME_BY_CODE.get(normalizedCode) ?? normalizedCode;
  const now = Date.now();

  const cached = countryChannelsCache.get(normalizedCode);
  if (cached && now - cached.timestamp < CHANNELS_CACHE_TTL_MS) {
    return {
      countryCode: normalizedCode,
      countryName,
      channels: cached.data.slice(0, limit),
      total: cached.data.length,
      canPlay,
    };
  }

  const freshnessCutoffDate = new Date(now - PLAYBACK_SOURCE_FRESHNESS_MS);

  // 1. Fetch active channels for this country
  const channelRows = await customDb
    .select()
    .from(channels)
    .where(
      and(
        eq(channels.active, true),
        eq(channels.countryCode, normalizedCode),
        publicCatalogChannelCondition(),
      ),
    )
    .orderBy(asc(channels.name), asc(channels.id))
    .limit(limit * 3);

  if (channelRows.length === 0) {
    return {
      countryCode: normalizedCode,
      countryName,
      channels: [],
      total: 0,
      canPlay,
    };
  }

  const channelIds = channelRows.map((c) => c.id);

  // 2. Fetch non-offline streams for these channels
  const streamRows = await customDb
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
        eq(streams.active, true),
        inArray(streams.status, VISIBLE_STREAM_STATUSES),
        sql`${streams.status} != 'OFFLINE'`,
        sql`${streams.directEligibility} != 'OFFLINE'`,
        inArray(streams.channelId, channelIds),
      ),
    );

  const streamsByChannelId = new Map<string, typeof streamRows>();
  for (const stream of streamRows) {
    const list = streamsByChannelId.get(stream.channelId) ?? [];
    list.push(stream);
    streamsByChannelId.set(stream.channelId, list);
  }

  const visibleChannels: Channel[] = [];

  for (const ch of channelRows) {
    const chStreams = streamsByChannelId.get(ch.id) ?? [];
    if (chStreams.length === 0) continue;

    const availabilityStatus = resolveChannelAvailability(
      chStreams,
      freshnessCutoffDate,
    );
    if (availabilityStatus === 'OFFLINE') continue;

    visibleChannels.push({
      id: ch.id,
      name: ch.name,
      logoUrl: ch.logoUrl,
      groupTitle: ch.groupTitle,
      countryCode: ch.countryCode,
      playbackMode: resolvePlaybackMode(chStreams),
      availabilityStatus,
    });
  }

  countryChannelsCache.set(normalizedCode, {
    data: visibleChannels,
    timestamp: now,
  });

  return {
    countryCode: normalizedCode,
    countryName,
    channels: visibleChannels.slice(0, limit),
    total: visibleChannels.length,
    canPlay,
  };
}
