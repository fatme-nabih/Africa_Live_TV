import { createHash, randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import parser from 'iptv-playlist-parser';

import { db } from '@/db';
import {
  catalogImportChannels,
  catalogImports,
  catalogImportStreams,
  channels,
  streams,
} from '@/db/schema';
import { serializeLanguageCodes } from '@/lib/channel-language';

const BATCH_SIZE = 500;
const MAX_REPORTED_ERRORS = 100;

export type StagedChannel = typeof catalogImportChannels.$inferInsert;
export type StagedStream = typeof catalogImportStreams.$inferInsert;

export type CatalogDraft = {
  contentSha256: string;
  channels: Omit<StagedChannel, 'importId'>[];
  streams: Omit<StagedStream, 'importId'>[];
  errors: string[];
  duplicateUrls: number;
};

export type CatalogImportReport = {
  importId: string | null;
  source: string;
  contentSha256: string;
  dryRun: boolean;
  before: {
    activeChannels: number;
    activeStreams: number;
  };
  after: {
    activeChannels: number;
    activeStreams: number;
  };
  channels: {
    total: number;
    added: number;
    updated: number;
    disappeared: number;
  };
  streams: {
    total: number;
    added: number;
    updated: number;
    disappeared: number;
    duplicateUrls: number;
  };
  errors: {
    count: number;
    samples: string[];
  };
};

type RunCatalogImportOptions = {
  source: string;
  content: string;
  dryRun?: boolean;
  beforePublish?: () => void | Promise<void>;
};

export type InitialStreamState = {
  status: 'BROWSER_OK' | 'VLC_ONLY' | 'OFFLINE' | 'UNTESTED';
  corsAllowed: boolean;
  httpStatus: number | null;
  lastCheckedAt: string | null;
  failureReason: string | null;
};

type RunCatalogDraftImportOptions = {
  source: string;
  draft: CatalogDraft;
  dryRun?: boolean;
  beforePublish?: () => void | Promise<void>;
  initialStreamStates?: ReadonlyMap<string, InitialStreamState>;
};

function cleanChannelName(name: string) {
  return name
    .replace(/\s*\(\d+p\)/gi, '')
    .replace(/\s*\[geo-blocked\]/gi, '')
    .replace(/\s*\[not 24\/7\]/gi, '')
    .trim();
}

function normalizeChannelName(name: string) {
  return cleanChannelName(name).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ');
}

function deriveCountryCode(tvgId: string | null) {
  if (!tvgId) return null;

  const parts = tvgId.split('.');
  if (parts.length <= 1) return null;

  const code = parts.at(-1)?.split('@')[0].toUpperCase();
  return code?.length === 2 ? code : null;
}

function hashString(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 20);
}

function normalizeStreamUrl(value: string) {
  const trimmed = value.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`protocole non pris en charge: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('identifiants intégrés interdits');
  }
  return trimmed;
}

function nullableEqual(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? null) === (right ?? null);
}

export function buildCatalogDraft(content: string): CatalogDraft {
  const parsed = parser.parse(content);
  const channelMap = new Map<string, Omit<StagedChannel, 'importId'>>();
  const streamMap = new Map<string, Omit<StagedStream, 'importId'>>();
  const seenUrls = new Set<string>();
  const errors: string[] = [];
  let duplicateUrls = 0;

  for (const [index, item] of parsed.items.entries()) {
    if (!item.url) {
      errors.push(`Entrée ${index + 1}: URL absente`);
      continue;
    }

    let url: string;
    try {
      url = normalizeStreamUrl(item.url);
    } catch (error) {
      errors.push(
        `Entrée ${index + 1}: ${error instanceof Error ? error.message : 'URL invalide'}`,
      );
      continue;
    }

    if (seenUrls.has(url)) {
      duplicateUrls += 1;
      continue;
    }
    seenUrls.add(url);

    const name = cleanChannelName(item.name || 'Chaîne inconnue') || 'Chaîne inconnue';
    const normalizedName = normalizeChannelName(name);
    const tvgId = item.tvg?.id?.trim() || null;
    const countryCode = deriveCountryCode(tvgId);
    const channelKey = tvgId
      ? `tvg:${tvgId.toLowerCase()}`
      : `name:${normalizedName}:${countryCode || 'unknown'}`;
    const channelId = hashString(channelKey);
    const streamId = hashString(`stream:${url}`);

    const existingStream = streamMap.get(streamId);
    if (existingStream && existingStream.url !== url) {
      errors.push(`Entrée ${index + 1}: collision d’identifiant de flux`);
      continue;
    }

    if (!channelMap.has(channelId)) {
      channelMap.set(channelId, {
        channelId,
        name,
        normalizedName,
        tvgId,
        logoUrl: item.tvg?.logo?.trim() || null,
        groupTitle: item.group?.title?.trim() || null,
        countryCode,
        language: serializeLanguageCodes(item.lang),
      });
    }

    streamMap.set(streamId, {
      streamId,
      channelId,
      url,
      mixedContent: url.startsWith('http://'),
    });
  }

  return {
    contentSha256: createHash('sha256').update(content).digest('hex'),
    channels: [...channelMap.values()],
    streams: [...streamMap.values()],
    errors,
    duplicateUrls,
  };
}

async function buildReport(
  draft: CatalogDraft,
  source: string,
  importId: string | null,
  dryRun: boolean,
): Promise<CatalogImportReport> {
  const [existingChannels, existingStreams] = await Promise.all([
    db.select().from(channels),
    db.select().from(streams),
  ]);
  const channelById = new Map(existingChannels.map((channel) => [channel.id, channel]));
  const streamById = new Map(existingStreams.map((stream) => [stream.id, stream]));
  const incomingChannelIds = new Set(draft.channels.map((channel) => channel.channelId));
  const incomingStreamIds = new Set(draft.streams.map((stream) => stream.streamId));

  let addedChannels = 0;
  let updatedChannels = 0;
  for (const channel of draft.channels) {
    const existing = channelById.get(channel.channelId);
    if (!existing) {
      addedChannels += 1;
      continue;
    }
    if (
      !existing.active ||
      existing.name !== channel.name ||
      existing.normalizedName !== channel.normalizedName ||
      !nullableEqual(existing.tvgId, channel.tvgId) ||
      !nullableEqual(existing.logoUrl, channel.logoUrl) ||
      !nullableEqual(existing.groupTitle, channel.groupTitle) ||
      !nullableEqual(existing.countryCode, channel.countryCode) ||
      (
        channel.language != null &&
        !nullableEqual(existing.language, channel.language)
      )
    ) {
      updatedChannels += 1;
    }
  }

  let addedStreams = 0;
  let updatedStreams = 0;
  for (const stream of draft.streams) {
    const existing = streamById.get(stream.streamId);
    if (!existing) {
      addedStreams += 1;
      continue;
    }
    if (
      !existing.active ||
      existing.channelId !== stream.channelId ||
      existing.url !== stream.url ||
      existing.mixedContent !== stream.mixedContent
    ) {
      updatedStreams += 1;
    }
  }

  const disappearedChannels = existingChannels.filter(
    (channel) => channel.active && !incomingChannelIds.has(channel.id),
  ).length;
  const disappearedStreams = existingStreams.filter(
    (stream) => stream.active && !incomingStreamIds.has(stream.id),
  ).length;

  return {
    importId,
    source,
    contentSha256: draft.contentSha256,
    dryRun,
    before: {
      activeChannels: existingChannels.filter((channel) => channel.active).length,
      activeStreams: existingStreams.filter((stream) => stream.active).length,
    },
    after: {
      activeChannels: draft.channels.length,
      activeStreams: draft.streams.length,
    },
    channels: {
      total: draft.channels.length,
      added: addedChannels,
      updated: updatedChannels,
      disappeared: disappearedChannels,
    },
    streams: {
      total: draft.streams.length,
      added: addedStreams,
      updated: updatedStreams,
      disappeared: disappearedStreams,
      duplicateUrls: draft.duplicateUrls,
    },
    errors: {
      count: draft.errors.length,
      samples: draft.errors.slice(0, MAX_REPORTED_ERRORS),
    },
  };
}

async function insertInBatches<T>(
  values: T[],
  insert: (batch: T[]) => Promise<unknown>,
) {
  for (let offset = 0; offset < values.length; offset += BATCH_SIZE) {
    await insert(values.slice(offset, offset + BATCH_SIZE));
  }
}

function reportValues(report: CatalogImportReport) {
  return {
    channelCount: report.channels.total,
    streamCount: report.streams.total,
    addedChannels: report.channels.added,
    updatedChannels: report.channels.updated,
    disappearedChannels: report.channels.disappeared,
    addedStreams: report.streams.added,
    updatedStreams: report.streams.updated,
    disappearedStreams: report.streams.disappeared,
    errorCount: report.errors.count,
    report: report as unknown as Record<string, unknown>,
  };
}

export async function runCatalogImport({
  source,
  content,
  dryRun = false,
  beforePublish,
}: RunCatalogImportOptions) {
  const draft = buildCatalogDraft(content);
  return runCatalogDraftImport({ source, draft, dryRun, beforePublish });
}

export async function runCatalogDraftImport({
  source,
  draft,
  dryRun = false,
  beforePublish,
  initialStreamStates = new Map(),
}: RunCatalogDraftImportOptions) {
  if (draft.channels.length === 0 || draft.streams.length === 0) {
    throw new Error('La source ne contient aucun catalogue publiable.');
  }

  if (dryRun) {
    return buildReport(draft, source, null, true);
  }

  const importId = randomUUID();
  const report = await buildReport(draft, source, importId, false);
  const startedAt = new Date().toISOString();

  await db.insert(catalogImports).values({
    id: importId,
    source,
    contentSha256: draft.contentSha256,
    status: 'STAGING',
    startedAt,
    ...reportValues(report),
  });

  try {
    await insertInBatches(
      draft.channels.map((channel) => ({ ...channel, importId })),
      (batch) => db.insert(catalogImportChannels).values(batch),
    );
    await insertInBatches(
      draft.streams.map((stream) => ({ ...stream, importId })),
      (batch) => db.insert(catalogImportStreams).values(batch),
    );

    await db.transaction(async (tx) => {
      const [stagedChannels, stagedStreams] = await Promise.all([
        tx
          .select()
          .from(catalogImportChannels)
          .where(eq(catalogImportChannels.importId, importId)),
        tx
          .select()
          .from(catalogImportStreams)
          .where(eq(catalogImportStreams.importId, importId)),
      ]);

      await insertInBatches(stagedChannels, (batch) =>
        tx
          .insert(channels)
          .values(
            batch.map((channel) => ({
              id: channel.channelId,
              name: channel.name,
              normalizedName: channel.normalizedName,
              tvgId: channel.tvgId,
              logoUrl: channel.logoUrl,
              groupTitle: channel.groupTitle,
              countryCode: channel.countryCode,
              language: channel.language,
              active: true,
              firstSeenImportId: importId,
              lastSeenImportId: importId,
              inactiveAt: null,
              updatedAt: startedAt,
            })),
          )
          .onConflictDoUpdate({
            target: channels.id,
            set: {
              name: sql`excluded.name`,
              normalizedName: sql`excluded.normalized_name`,
              tvgId: sql`excluded.tvg_id`,
              logoUrl: sql`excluded.logo_url`,
              groupTitle: sql`excluded.group_title`,
              countryCode: sql`excluded.country_code`,
              language: sql`coalesce(excluded.language, ${channels.language})`,
              active: true,
              firstSeenImportId: sql`coalesce(${channels.firstSeenImportId}, excluded.first_seen_import_id)`,
              lastSeenImportId: importId,
              inactiveAt: null,
              updatedAt: startedAt,
            },
          }),
      );

      await beforePublish?.();

      await insertInBatches(stagedStreams, (batch) =>
        tx
          .insert(streams)
          .values(
            batch.map((stream) => {
              const initial = initialStreamStates.get(stream.streamId);
              const healthy =
                initial?.status === 'BROWSER_OK' || initial?.status === 'VLC_ONLY';
              const offline = initial?.status === 'OFFLINE';
              return {
                id: stream.streamId,
                channelId: stream.channelId,
                url: stream.url,
                status: initial?.status ?? 'UNTESTED',
                corsAllowed: initial?.corsAllowed ?? false,
                mixedContent: stream.mixedContent,
                httpStatus: initial?.httpStatus ?? null,
                lastCheckedAt: initial?.lastCheckedAt ?? null,
                failureReason: initial?.failureReason ?? null,
                active: true,
                firstSeenImportId: importId,
                lastSeenImportId: importId,
                inactiveAt: null,
                verificationState: healthy
                  ? 'HEALTHY'
                  : offline
                    ? 'CONFIRMED_FAILURE'
                    : 'NEVER_CHECKED',
                directEligibility: 'REVIEW_REQUIRED',
                eligibilityReason: 'NOT_REVALIDATED',
                eligibilityCheckedAt: null,
                consecutiveFailures: offline ? 3 : 0,
                lastSuccessAt: healthy ? initial.lastCheckedAt : null,
                nextCheckAt: startedAt,
                finalUrl: stream.url,
                updatedAt: startedAt,
              };
            }),
          )
          .onConflictDoUpdate({
            target: streams.id,
            set: {
              channelId: sql`excluded.channel_id`,
              url: sql`excluded.url`,
              mixedContent: sql`excluded.mixed_content`,
              active: true,
              firstSeenImportId: sql`coalesce(${streams.firstSeenImportId}, excluded.first_seen_import_id)`,
              lastSeenImportId: importId,
              inactiveAt: null,
              directEligibility: sql`case when ${streams.active} = false then 'REVIEW_REQUIRED' else ${streams.directEligibility} end`,
              eligibilityReason: sql`case when ${streams.active} = false then 'REACTIVATED_SOURCE' else ${streams.eligibilityReason} end`,
              eligibilityCheckedAt: sql`case when ${streams.active} = false then null else ${streams.eligibilityCheckedAt} end`,
              updatedAt: startedAt,
            },
          }),
      );

      await tx
        .update(streams)
        .set({ active: false, inactiveAt: startedAt, updatedAt: startedAt })
        .where(
          and(
            eq(streams.active, true),
            sql`not exists (
              select 1 from ${catalogImportStreams} staged
              where staged.import_id = ${importId}
                and staged.stream_id = ${streams.id}
            )`,
          ),
        );

      await tx
        .update(channels)
        .set({ active: false, inactiveAt: startedAt, updatedAt: startedAt })
        .where(
          and(
            eq(channels.active, true),
            sql`not exists (
              select 1 from ${catalogImportChannels} staged
              where staged.import_id = ${importId}
                and staged.channel_id = ${channels.id}
            )`,
          ),
        );

      await tx
        .update(catalogImports)
        .set({
          status: 'PUBLISHED',
          completedAt: new Date().toISOString(),
          errorMessage: null,
          ...reportValues(report),
        })
        .where(eq(catalogImports.id, importId));

      await tx
        .delete(catalogImportStreams)
        .where(eq(catalogImportStreams.importId, importId));
      await tx
        .delete(catalogImportChannels)
        .where(eq(catalogImportChannels.importId, importId));
    });

    return report;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message.slice(0, 500) : 'Erreur inconnue';
    await db
      .update(catalogImports)
      .set({
        status: 'FAILED',
        completedAt: new Date().toISOString(),
        errorCount: report.errors.count + 1,
        errorMessage,
      })
      .where(eq(catalogImports.id, importId));
    throw error;
  }
}
