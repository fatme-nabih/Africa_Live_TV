import { loadEnvConfig } from '@next/env';
import { randomBytes, createHash } from 'node:crypto';
import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool, type PoolClient } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { LOCAL_USER_ID } from '../lib/local-dev';

const DATABASE_NAME = 'africa_live_dev';

async function insertRows(client: PoolClient, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  if (![table, ...columns].every(value => /^[a-z_][a-z0-9_]*$/.test(value))) throw new Error('INVALID_IDENTIFIER');
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const placeholders = batch.map(row => '(' + columns.map(column => {
      const value = row[column];
      values.push(value !== null && typeof value === 'object' && !(value instanceof Date) ? JSON.stringify(value) : value);
      return `$${values.length}`;
    }).join(',') + ')');
    await client.query(`INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(',')}) VALUES ${placeholders.join(',')}`, values);
  }
}

function digest(rows: Record<string, unknown>[]) {
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

async function run() {
  const configExists = await access('.env.local').then(() => true, () => false);
  if (configExists) throw new Error('LOCAL_CONFIG_EXISTS_NO_OVERWRITE');
  const sourceDirectory = path.resolve(process.argv[2] || 'C:/Users/GAMER PC/IPTV');
  if (sourceDirectory === process.cwd()) throw new Error('SOURCE_MUST_BE_SEPARATE');
  const sourceConfig = loadEnvConfig(sourceDirectory, true, { info() {}, error() {} }, true);
  const sourceUrl = sourceConfig.combinedEnv.DATABASE_URL;
  if (!sourceUrl) throw new Error('SOURCE_DATABASE_URL_REQUIRED');
  const targetUrl = new URL(sourceUrl);
  if (targetUrl.pathname === `/${DATABASE_NAME}`) throw new Error('SOURCE_MUST_BE_SEPARATE');
  targetUrl.pathname = `/${DATABASE_NAME}`;
  const sourcePool = new Pool({ connectionString: sourceUrl, connectionTimeoutMillis: 5000 });
  const adminPool = new Pool({ connectionString: sourceUrl, connectionTimeoutMillis: 5000 });
  let targetPool: Pool | undefined;
  try {
    const exists = await adminPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [DATABASE_NAME]);
    if (!exists.rowCount) await adminPool.query('CREATE DATABASE africa_live_dev');
    targetPool = new Pool({ connectionString: targetUrl.toString(), connectionTimeoutMillis: 5000 });
    await migrate(drizzle(targetPool), { migrationsFolder: './drizzle' });
    const source = await sourcePool.connect();
    const target = await targetPool.connect();
    try {
      await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await target.query('BEGIN');
      const occupied = await target.query('SELECT (SELECT count(*) FROM channels) + (SELECT count(*) FROM streams) AS count');
      if (Number(occupied.rows[0].count) !== 0) throw new Error('TARGET_CATALOGUE_NOT_EMPTY_NO_OVERWRITE');
      const imports = (await source.query('SELECT id, source, content_sha256, status, started_at, completed_at, channel_count, stream_count FROM catalog_imports ORDER BY id')).rows;
      const channels = (await source.query('SELECT * FROM channels ORDER BY id')).rows;
      const streams = (await source.query('SELECT * FROM streams ORDER BY id')).rows;
      await insertRows(target, 'catalog_imports', imports);
      await insertRows(target, 'channels', channels);
      await insertRows(target, 'streams', streams);
      const targetChannels = (await target.query('SELECT * FROM channels ORDER BY id')).rows;
      const targetStreams = (await target.query('SELECT * FROM streams ORDER BY id')).rows;
      if (digest(channels) !== digest(targetChannels) || digest(streams) !== digest(targetStreams)) throw new Error('CATALOGUE_COPY_MISMATCH');
      await target.query("INSERT INTO users (id, clerk_user_id, trial_ends_at) VALUES ($1, 'local-development', now()) ON CONFLICT (id) DO NOTHING", [LOCAL_USER_ID]);
      await target.query('COMMIT');
      await source.query('ROLLBACK');
      console.log(JSON.stringify({ database: DATABASE_NAME, channels: channels.length, streams: streams.length, catalogueVerified: true, copiedUserData: false }));
    } catch (error) {
      await target.query('ROLLBACK');
      await source.query('ROLLBACK');
      throw error;
    } finally {
      source.release();
      target.release();
    }
    const secret = () => randomBytes(32).toString('hex');
    const env = [
      `DATABASE_URL=${targetUrl.toString()}`, 'LOCAL_DEV_MODE=true', 'NEXT_PUBLIC_LOCAL_DEV_MODE=true',
      'NEXT_PUBLIC_APP_URL=http://localhost:3001', 'BROWSER_TEST_ORIGIN=http://localhost:3001',
      'ENABLE_LOCAL_VLC=true', 'PLAYBACK_ELIGIBILITY_READY=false',
      `ABUSE_HASH_SECRET=${secret()}`, `CATALOG_CURSOR_SECRET=${secret()}`,
      'ABUSE_TRUSTED_PROXY_HEADER=disabled',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_Y2ktdGVzdC5jb20k', 'CLERK_SECRET_KEY=sk_test_local-placeholder',
    ].join('\n') + '\n';
    await writeFile('.env.local', env, { flag: 'wx' });
    console.log('Configuration locale créée. Démarrer avec npm run dev sur http://localhost:3001.');
  } finally {
    await Promise.all([sourcePool.end(), adminPool.end(), targetPool?.end()]);
  }
}

run().catch(error => {
  console.error(JSON.stringify({ event: 'local_setup_failed', reason: error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]') : 'UnknownError' }));
  process.exitCode = 1;
});
