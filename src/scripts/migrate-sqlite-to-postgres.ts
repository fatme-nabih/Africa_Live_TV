import { createHash } from 'node:crypto';
import path from 'node:path';

import { loadEnvConfig } from '@next/env';
import Database from 'better-sqlite3';

import {
  runCatalogDraftImport,
  type CatalogDraft,
  type InitialStreamState,
} from '../lib/catalog-import';
import { STREAM_STATUSES, type StreamStatus } from '../types/channel';

loadEnvConfig(process.cwd());

const sqlitePath = path.resolve(process.cwd(), 'iptv.db');

type SqliteChannel = {
  id: string;
  name: string;
  normalized_name: string;
  tvg_id: string | null;
  logo_url: string | null;
  group_title: string | null;
  country_code: string | null;
  language: string | null;
};

type SqliteStream = {
  id: string;
  channel_id: string;
  url: string;
  status: string;
  cors_allowed: 0 | 1;
  mixed_content: 0 | 1;
  http_status: number | null;
  last_checked_at: string | null;
  failure_reason: string | null;
};

function parseArgs(args: string[]) {
  const normalized = args.filter((argument) => argument !== '--');
  const unknown = normalized.filter(
    (argument) => argument !== '--dry-run' && argument !== '--force',
  );
  if (unknown.length) throw new Error(`Argument(s) inconnu(s): ${unknown.join(', ')}`);
  if (normalized.includes('--force')) {
    console.warn('--force est obsolète : la migration est désormais transactionnelle.');
  }
  return { dryRun: normalized.includes('--dry-run') };
}

function normalizeStatus(value: string): StreamStatus {
  return STREAM_STATUSES.includes(value as StreamStatus) ? (value as StreamStatus) : 'UNTESTED';
}

function buildDraft(sqliteChannels: SqliteChannel[], sqliteStreams: SqliteStream[]) {
  const channelIds = new Set(sqliteChannels.map((channel) => channel.id));
  const seenUrls = new Set<string>();
  const errors: string[] = [];
  let duplicateUrls = 0;
  const initialStreamStates = new Map<string, InitialStreamState>();
  const stagedStreams: CatalogDraft['streams'] = [];

  for (const stream of sqliteStreams) {
    const url = stream.url.trim();
    if (!channelIds.has(stream.channel_id)) {
      errors.push(`Flux ${stream.id}: chaîne ${stream.channel_id} absente`);
      continue;
    }
    if (seenUrls.has(url)) {
      duplicateUrls += 1;
      continue;
    }
    seenUrls.add(url);
    stagedStreams.push({
      streamId: stream.id,
      channelId: stream.channel_id,
      url,
      mixedContent: Boolean(stream.mixed_content) || url.startsWith('http://'),
    });
    initialStreamStates.set(stream.id, {
      status: normalizeStatus(stream.status),
      corsAllowed: Boolean(stream.cors_allowed),
      httpStatus: stream.http_status,
      lastCheckedAt: stream.last_checked_at,
      failureReason: stream.failure_reason,
    });
  }

  const contentSha256 = createHash('sha256')
    .update(JSON.stringify({ sqliteChannels, sqliteStreams }))
    .digest('hex');
  const draft: CatalogDraft = {
    contentSha256,
    channels: sqliteChannels.map((channel) => ({
      channelId: channel.id,
      name: channel.name,
      normalizedName: channel.normalized_name,
      tvgId: channel.tvg_id,
      logoUrl: channel.logo_url,
      groupTitle: channel.group_title,
      countryCode: channel.country_code,
      language: channel.language,
    })),
    streams: stagedStreams,
    errors,
    duplicateUrls,
  };
  return { draft, initialStreamStates };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const sqlite = new Database(sqlitePath, { readonly: true });
  try {
    const sqliteChannels = sqlite.prepare('select * from channels').all() as SqliteChannel[];
    const sqliteStreams = sqlite.prepare('select * from streams').all() as SqliteStream[];
    const { draft, initialStreamStates } = buildDraft(sqliteChannels, sqliteStreams);
    console.log(`SQLite: ${sqliteChannels.length} chaînes, ${sqliteStreams.length} flux.`);
    const report = await runCatalogDraftImport({
      source: `sqlite:${sqlitePath}`,
      draft,
      dryRun: options.dryRun,
      initialStreamStates,
    });
    console.log(JSON.stringify(report, null, 2));
    console.log(
      options.dryRun
        ? 'Dry-run SQLite terminé : aucune écriture.'
        : 'Migration SQLite publiée atomiquement.',
    );
  } finally {
    sqlite.close();
  }
}

run().catch((error) => {
  console.error('Erreur migration PostgreSQL:', error);
  process.exit(1);
});
