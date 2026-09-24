import { createHash, randomUUID } from 'node:crypto';

import { loadEnvConfig } from '@next/env';
import { Pool, type PoolClient } from 'pg';

loadEnvConfig(process.cwd());

type ChannelRow = {
  id: string;
  name: string;
  normalized_name: string;
  tvg_id: string | null;
  logo_url: string | null;
  group_title: string | null;
  country_code: string | null;
  language: string | null;
};

type StreamRow = {
  id: string;
  channel_id: string;
  url: string;
  mixed_content: boolean;
};

function requireDatabaseUrl(name: string, expectedDatabase: string, allowTunnel: boolean) {
  const value = process.env[name] ?? (
    name === 'LOCAL_CATALOG_DATABASE_URL' ? process.env.DATABASE_URL : undefined
  );
  if (!value) throw new Error(`${name}_REQUIRED`);
  const parsed = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${name}_PROTOCOL_REFUSED`);
  }
  if (parsed.pathname !== `/${expectedDatabase}` || (!allowTunnel && !loopback) || (allowTunnel && !loopback)) {
    throw new Error(`${name}_TARGET_REFUSED`);
  }
  return parsed.toString();
}

function assertRailwayRole() {
  if (
    process.env.RAILWAY_CATALOG_CONFIRMED_ROLE !== 'staging' ||
    process.env.RAILWAY_PROJECT_ID !== process.env.RAILWAY_CATALOG_CONFIRMED_PROJECT_ID ||
    !process.env.RAILWAY_PROJECT_ID ||
    !process.env.RAILWAY_ENVIRONMENT_ID ||
    !process.env.RAILWAY_SERVICE_ID
  ) {
    throw new Error('RAILWAY_CATALOG_ENVIRONMENT_REFUSED');
  }
}

async function counts(client: Pool | PoolClient) {
  const result = await client.query(`
    select
      (select count(*)::int from channels where active = true) as channels,
      (select count(*)::int from streams where active = true) as streams,
      (select count(*)::int from users) as users,
      (select count(*)::int from user_favorites) as favorites
  `);
  return result.rows[0] as { channels: number; streams: number; users: number; favorites: number };
}

async function run() {
  const apply = process.argv.slice(2).includes('--apply');
  if (process.argv.slice(2).some(argument => argument !== '--apply')) {
    throw new Error('UNKNOWN_ARGUMENT');
  }
  assertRailwayRole();
  const localUrl = requireDatabaseUrl('LOCAL_CATALOG_DATABASE_URL', 'africa_live_dev', false);
  const railwayUrl = requireDatabaseUrl('RAILWAY_CATALOG_DATABASE_URL', 'railway', true);
  const localPool = new Pool({ connectionString: localUrl, max: 1 });
  const railwayPool = new Pool({ connectionString: railwayUrl, max: 1 });

  try {
    const [channelResult, streamResult, railwayBefore] = await Promise.all([
      localPool.query<ChannelRow>(`
        select id, name, normalized_name, tvg_id, logo_url, group_title, country_code, language
        from channels where active = true order by id
      `),
      localPool.query<StreamRow>(`
        select id, channel_id, url, mixed_content
        from streams where active = true order by id
      `),
      counts(railwayPool),
    ]);
    const channels = channelResult.rows;
    const streams = streamResult.rows;
    if (channels.length !== 11_778 || streams.length !== 12_396) {
      throw new Error('LOCAL_CATALOG_INVENTORY_REFUSED');
    }

    const fingerprint = createHash('sha256');
    for (const channel of channels) fingerprint.update(JSON.stringify(channel));
    for (const stream of streams) fingerprint.update(JSON.stringify(stream));
    const contentSha256 = fingerprint.digest('hex');
    const targetIds = await railwayPool.query<{ id: string; kind: 'channel' | 'stream' }>(`
      select id, 'channel'::text as kind from channels where active = true
      union all
      select id, 'stream'::text as kind from streams where active = true
    `);
    const targetChannelIds = new Set(targetIds.rows.filter(row => row.kind === 'channel').map(row => row.id));
    const targetStreamIds = new Set(targetIds.rows.filter(row => row.kind === 'stream').map(row => row.id));
    const sourceChannelIds = new Set(channels.map(row => row.id));
    const sourceStreamIds = new Set(streams.map(row => row.id));
    const report = {
      source: { channels: channels.length, streams: streams.length, contentSha256 },
      targetBefore: railwayBefore,
      changes: {
        addedChannels: channels.filter(row => !targetChannelIds.has(row.id)).length,
        disappearedChannels: [...targetChannelIds].filter(id => !sourceChannelIds.has(id)).length,
        addedStreams: streams.filter(row => !targetStreamIds.has(row.id)).length,
        disappearedStreams: [...targetStreamIds].filter(id => !sourceStreamIds.has(id)).length,
      },
      apply,
    };
    if (!apply) {
      console.log(JSON.stringify({ event: 'railway_catalog_sync_dry_run', ...report }));
      return;
    }

    const client = await railwayPool.connect();
    const importId = randomUUID();
    const startedAt = new Date().toISOString();
    try {
      await client.query('begin');
      await client.query("select pg_advisory_xact_lock(hashtext('africa_live_catalog_sync'))");
      await client.query(
        `insert into catalog_imports (
          id, source, content_sha256, status, started_at, channel_count, stream_count,
          added_channels, updated_channels, disappeared_channels,
          added_streams, updated_streams, disappeared_streams, error_count, report
        ) values ($1, $2, $3, 'STAGING', $4, $5, $6, $7, 0, $8, $9, 0, $10, 0, $11::jsonb)`,
        [
          importId,
          'local-africa-live-dev-sync',
          contentSha256,
          startedAt,
          channels.length,
          streams.length,
          report.changes.addedChannels,
          report.changes.disappearedChannels,
          report.changes.addedStreams,
          report.changes.disappearedStreams,
          JSON.stringify(report),
        ],
      );
      await client.query(
        `insert into channels (
          id, name, normalized_name, tvg_id, logo_url, group_title, country_code, language,
          active, first_seen_import_id, last_seen_import_id, inactive_at, updated_at
        )
        select *, true, $9, $9, null, $10
        from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
        on conflict (id) do update set
          name = excluded.name,
          normalized_name = excluded.normalized_name,
          tvg_id = excluded.tvg_id,
          logo_url = excluded.logo_url,
          group_title = excluded.group_title,
          country_code = excluded.country_code,
          language = excluded.language,
          active = true,
          first_seen_import_id = coalesce(channels.first_seen_import_id, excluded.first_seen_import_id),
          last_seen_import_id = excluded.last_seen_import_id,
          inactive_at = null,
          updated_at = excluded.updated_at`,
        [
          channels.map(row => row.id),
          channels.map(row => row.name),
          channels.map(row => row.normalized_name),
          channels.map(row => row.tvg_id),
          channels.map(row => row.logo_url),
          channels.map(row => row.group_title),
          channels.map(row => row.country_code),
          channels.map(row => row.language),
          importId,
          startedAt,
        ],
      );
      await client.query(
        `insert into streams (
          id, channel_id, url, status, cors_allowed, mixed_content, http_status,
          last_checked_at, failure_reason, active, first_seen_import_id, last_seen_import_id,
          inactive_at, verification_state, direct_eligibility, eligibility_reason,
          eligibility_checked_at, consecutive_failures, last_success_at, next_check_at,
          final_url, updated_at
        )
        select id, channel_id, url, 'UNTESTED', false, mixed_content, null,
          null, null, true, $5, $5, null, 'NEVER_CHECKED', 'REVIEW_REQUIRED',
          'NOT_REVALIDATED', null, 0, null, $6, null, $6
        from unnest($1::text[], $2::text[], $3::text[], $4::boolean[]) as incoming(id, channel_id, url, mixed_content)
        on conflict (id) do update set
          channel_id = excluded.channel_id,
          url = excluded.url,
          status = 'UNTESTED',
          cors_allowed = false,
          mixed_content = excluded.mixed_content,
          http_status = null,
          last_checked_at = null,
          failure_reason = null,
          active = true,
          first_seen_import_id = coalesce(streams.first_seen_import_id, excluded.first_seen_import_id),
          last_seen_import_id = excluded.last_seen_import_id,
          inactive_at = null,
          verification_state = 'NEVER_CHECKED',
          direct_eligibility = 'REVIEW_REQUIRED',
          eligibility_reason = 'NOT_REVALIDATED',
          eligibility_checked_at = null,
          consecutive_failures = 0,
          last_success_at = null,
          next_check_at = excluded.next_check_at,
          final_url = null,
          updated_at = excluded.updated_at`,
        [
          streams.map(row => row.id),
          streams.map(row => row.channel_id),
          streams.map(row => row.url),
          streams.map(row => row.mixed_content),
          importId,
          startedAt,
        ],
      );
      await client.query(
        `update streams set active = false, inactive_at = $2, updated_at = $2
         where active = true and not (id = any($1::text[]))`,
        [streams.map(row => row.id), startedAt],
      );
      await client.query(
        `update channels set active = false, inactive_at = $2, updated_at = $2
         where active = true and not (id = any($1::text[]))`,
        [channels.map(row => row.id), startedAt],
      );
      await client.query(
        `update catalog_imports set status = 'PUBLISHED', completed_at = now()
         where id = $1`,
        [importId],
      );
      const after = await counts(client);
      if (
        after.channels !== channels.length ||
        after.streams !== streams.length ||
        after.users !== railwayBefore.users ||
        after.favorites !== railwayBefore.favorites
      ) {
        throw new Error('RAILWAY_CATALOG_POSTCONDITION_FAILED');
      }
      await client.query('commit');
      console.log(JSON.stringify({ event: 'railway_catalog_sync_succeeded', importId, ...report, targetAfter: after }));
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await Promise.all([localPool.end(), railwayPool.end()]);
  }
}

run().catch(error => {
  console.error('Railway catalog sync failed:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
