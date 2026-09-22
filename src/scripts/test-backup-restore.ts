import { spawn } from 'node:child_process';
import { mkdtemp, rmdir, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

function postgresBinary(name: 'pg_dump' | 'pg_restore') {
  const configured = process.env.POSTGRES_BIN_DIR;
  if (configured) return path.join(configured, `${name}.exe`);
  if (process.platform === 'win32') return `C:/Program Files/PostgreSQL/17/bin/${name}.exe`;
  return name;
}

function postgresEnvironment(database: URL, databaseName: string) {
  return {
    ...process.env,
    PGHOST: database.hostname,
    PGPORT: database.port || '5432',
    PGDATABASE: databaseName,
    PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password),
    PGSSLMODE: database.searchParams.get('sslmode') ?? 'prefer',
  };
}

function runBinary(file: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, { env, stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let errorOutput = '';
    child.stderr.on('data', chunk => { errorOutput += String(chunk).slice(0, 2_000); });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`POSTGRES_TOOL_EXIT_${code}: ${errorOutput.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL masquée]')}`)));
  });
}

async function inventory(pool: Pool) {
  const result = await pool.query<{
    tables: number;
    channels: number;
    streams: number;
    users: number;
    favorites: number;
    migrations: number;
  }>(`
    select
      (select count(*)::int from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
      (select count(*)::int from public.channels) as channels,
      (select count(*)::int from public.streams) as streams,
      (select count(*)::int from public.users) as users,
      (select count(*)::int from public.user_favorites) as favorites,
      (select count(*)::int from drizzle.__drizzle_migrations) as migrations
  `);
  return result.rows[0];
}

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('LOCAL_RESTORE_DRILL_FORBIDDEN_IN_PRODUCTION');
  loadEnvConfig(process.cwd());

  const database = new URL(process.env.DATABASE_URL ?? '');
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
    database.pathname !== '/africa_live_dev' ||
    database.search ||
    database.hash
  ) {
    throw new Error('LOCAL_RESTORE_DRILL_REQUIRES_AFRICA_LIVE_DEV');
  }

  const scratchName = `africa_live_restore_${randomBytes(8).toString('hex')}`;
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'africa-live-restore-'));
  const dumpPath = path.join(temporaryDirectory, 'backup.dump');
  const adminUrl = new URL(database);
  adminUrl.pathname = '/postgres';
  const sourcePool = new Pool({ connectionString: database.toString(), max: 1, connectionTimeoutMillis: 5_000 });
  const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000 });
  let scratchPool: Pool | undefined;
  let scratchCreated = false;
  const startedAt = Date.now();

  try {
    const source = await inventory(sourcePool);
    await runBinary(postgresBinary('pg_dump'), ['--format=custom', '--no-owner', '--no-acl', '--file', dumpPath], postgresEnvironment(database, 'africa_live_dev'));
    await adminPool.query(`create database "${scratchName}"`);
    scratchCreated = true;
    await runBinary(
      postgresBinary('pg_restore'),
      ['--dbname', scratchName, '--no-owner', '--no-acl', '--exit-on-error', dumpPath],
      postgresEnvironment(database, scratchName),
    );

    const scratchUrl = new URL(database);
    scratchUrl.pathname = `/${scratchName}`;
    scratchPool = new Pool({ connectionString: scratchUrl.toString(), max: 1, connectionTimeoutMillis: 5_000 });
    const restored = await inventory(scratchPool);
    if (JSON.stringify(restored) !== JSON.stringify(source)) throw new Error('RESTORE_INVENTORY_MISMATCH');

    console.log(JSON.stringify({
      event: 'local_restore_drill_succeeded',
      durationMs: Date.now() - startedAt,
      inventory: restored,
      backupRetained: false,
    }));
  } finally {
    await scratchPool?.end();
    if (scratchCreated) {
      await adminPool.query('select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()', [scratchName]);
      await adminPool.query(`drop database "${scratchName}"`);
    }
    await Promise.all([sourcePool.end(), adminPool.end()]);
    await unlink(dumpPath).catch(() => undefined);
    await rmdir(temporaryDirectory).catch(() => undefined);
  }
}

run().catch((error) => {
  console.error('Backup/restore drill failed:', error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL masquée]') : 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
