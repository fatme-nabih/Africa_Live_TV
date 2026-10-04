import { and, eq, inArray, sql } from 'drizzle-orm';
import { channels, streams } from '@/db/schema';
export const VISIBLE_STREAM_STATUSES = ['BROWSER_OK', 'VLC_ONLY', 'UNTESTED'] as const;
export function catalogStreamCondition(status?: string, localPlayback=false) {
  return and(eq(streams.active, true), localPlayback ? undefined : inArray(streams.status, VISIBLE_STREAM_STATUSES),
    localPlayback ? undefined : sql`${streams.directEligibility} != 'OFFLINE'`, status ? eq(streams.status, status) : undefined);
}
export function catalogHasVisibleStream(localPlayback=false) {
  return sql`exists (select 1 from ${streams} where ${streams.channelId} = ${channels.id} and ${catalogStreamCondition(undefined,localPlayback)})`;
}
