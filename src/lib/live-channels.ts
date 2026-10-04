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
  LiveChannelsSummarySnapshot,
  LiveCountryChannelsSnapshot,
} from '@/lib/live-channels-types';
import { summarizeChannelCandidates } from './live-channel-summary';
import type { Channel } from '@/types/channel';

const SUMMARY_CACHE_TTL_MS = 10 * 60_000;
const CHANNELS_CACHE_TTL_MS = 5 * 60_000;
import { catalogHasVisibleStream, catalogStreamCondition } from './catalog-visibility';

const AFRICAN_COUNTRY_NAME_BY_CODE = new Map(
  AFRICAN_COUNTRIES.map((c) => [c.code, c.name] as const),
);

interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

let summaryCache: CachedEntry<LiveChannelsSummarySnapshot> | null = null;
let summaryInFlight: Promise<LiveChannelsSummarySnapshot> | null = null;
const countryChannelsCache = new Map<string, CachedEntry<{channels:Channel[];total:number}>>();

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
          channelId: channels.id, url: streams.url, status: streams.status,
          corsAllowed: streams.corsAllowed, mixedContent: streams.mixedContent,
          lastSuccessAt: streams.lastSuccessAt, directEligibility: streams.directEligibility,
          eligibilityReason: streams.eligibilityReason,
        })
        .from(channels)
        .leftJoin(
          streams,
          and(
            eq(streams.channelId, channels.id),
            eq(streams.active, true),
          ),
        )
        .where(
          and(
            eq(channels.active, true),
            publicCatalogChannelCondition(),
            inArray(channels.countryCode, africanCodes),
          ),
        )
        .orderBy(asc(channels.id));

      const snapshot = summarizeChannelCandidates(rows, new Date(now));

      summaryCache = { data: snapshot, timestamp: now };
      return snapshot;
    } catch (error) {
      if (summaryCache && now - summaryCache.timestamp <= 6 * 60 * 60_000) {
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
  countryCode: string, canPlay: boolean, limit = 40, customDb: LiveChannelsDb = db, localPlayback = false,
): Promise<LiveCountryChannelsSnapshot> {
  const normalizedCode = countryCode.trim().toUpperCase();
  const countryName = AFRICAN_COUNTRY_NAME_BY_CODE.get(normalizedCode) ?? normalizedCode;
  if (!AFRICAN_COUNTRY_NAME_BY_CODE.has(normalizedCode)) return {countryCode:normalizedCode,countryName,channels:[],total:0,canPlay};
  limit = Math.max(1, Math.min(100, Math.trunc(limit) || 40));
  const now = Date.now();
  const key = normalizedCode + ':' + localPlayback + ':' + limit;
  const cached = countryChannelsCache.get(key);
  if (cached && now - cached.timestamp < CHANNELS_CACHE_TTL_MS) return {countryCode:normalizedCode,countryName,...cached.data,canPlay};
  for (const [key,entry] of countryChannelsCache) if(now-entry.timestamp>=CHANNELS_CACHE_TTL_MS)countryChannelsCache.delete(key);
  const condition = and(eq(channels.active,true),eq(channels.countryCode,normalizedCode),publicCatalogChannelCondition(),catalogHasVisibleStream(localPlayback));
  const [channelRows, counts] = await Promise.all([
    customDb.select().from(channels).where(condition).orderBy(asc(channels.name),asc(channels.id)).limit(limit),
    customDb.select({total:sql<number>`count(*)::int`}).from(channels).where(condition),
  ]);
  const total=counts[0]?.total ?? 0;
  const streamRows=channelRows.length ? await customDb.select({channelId:streams.channelId,url:streams.url,status:streams.status,
    verificationState:streams.verificationState,directEligibility:streams.directEligibility,lastSuccessAt:streams.lastSuccessAt})
    .from(streams).where(and(catalogStreamCondition(undefined,localPlayback),inArray(streams.channelId,channelRows.map(c=>c.id)))) : [];
  const byChannel=new Map<string,typeof streamRows>();
  for(const stream of streamRows) {const group=byChannel.get(stream.channelId)??[];group.push(stream);byChannel.set(stream.channelId,group);}
  const visible:Channel[]=channelRows.map(ch=>{
    const sources=byChannel.get(ch.id)??[];
    return {id:ch.id,name:ch.name,logoUrl:ch.logoUrl,groupTitle:ch.groupTitle,countryCode:ch.countryCode,
      playbackMode:resolvePlaybackMode(sources),availabilityStatus:resolveChannelAvailability(sources,new Date(now-PLAYBACK_SOURCE_FRESHNESS_MS))};
  });
  if(countryChannelsCache.size>=256)countryChannelsCache.delete(countryChannelsCache.keys().next().value!);
  const data={channels:visible,total};
  countryChannelsCache.set(key,{data,timestamp:now});
  return {countryCode:normalizedCode,countryName,...data,canPlay};
}
