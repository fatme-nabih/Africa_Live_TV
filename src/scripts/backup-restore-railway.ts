import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

import { Pool } from 'pg';

type Inventory = {
  tables: number;
  channels: number;
  streams: number;
  users: number;
  favorites: number;
  migrations: number;
};

function postgresBinary(name: 'pg_dump' | 'pg_restore') {
  const directory = process.env.POSTGRES_BIN_DIR;
  if (!directory) throw new Error('POSTGRES_BIN_DIR_REQUIRED');
  return path.join(directory, process.platform === 'win32' ? `${name}.exe` : name);
}

function assertRailwayBackupEnvironment() {
  let database: URL;
  try {
    if (process.env.DATABASE_PUBLIC_URL) {
      database = new URL(process.env.DATABASE_PUBLIC_URL);
    } else {
      const host = process.env.RAILWAY_BACKUP_PROXY_HOST ?? '';
      const port = process.env.RAILWAY_BACKUP_PROXY_PORT ?? '';
      const databaseName = process.env.PGDATABASE ?? '';
      if (
        !host.endsWith('.proxy.rlwy.net') ||
        !/^\d{2,5}$/.test(port) ||
        !process.env.PGUSER ||
        !process.env.PGPASSWORD ||
        databaseName !== 'railway'
      ) {
        throw new Error('RAILWAY_BACKUP_PROXY_CONFIGURATION_INVALID');
      }
      database = new URL(`postgresql://${host}:${port}/${databaseName}`);
      database.username = process.env.PGUSER;
      database.password = process.env.PGPASSWORD;
      database.searchParams.set('sslmode', 'require');
      database.searchParams.set('uselibpqcompat', 'true');
    }
  } catch {
    throw new Error('RAILWAY_BACKUP_DATABASE_URL_INVALID');
  }

  if (
    process.env.RAILWAY_BACKUP_CONFIRMED_ROLE !== 'staging' ||
    !process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_BACKUP_CONFIRMED_PROJECT_ID !== process.env.RAILWAY_PROJECT_ID ||
    !process.env.RAILWAY_ENVIRONMENT_ID ||
    !process.env.RAILWAY_SERVICE_ID ||
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
    database.pathname !== '/railway'
  ) {
    throw new Error('RAILWAY_BACKUP_ENVIRONMENT_REFUSED');
  }

  return database;
}

function postgresEnvironment(database: URL, databaseName: string) {
  return {
    ...process.env,
    PGHOST: database.hostname,
    PGPORT: database.port || '5432',
    PGDATABASE: databaseName,
    PGUSER: decodeURIComponent(database.username),
    PGPASSWORD: decodeURIComponent(database.password),
    PGSSLMODE: database.searchParams.get('sslmode') ?? 'require',
  };
}

function redactedError(value: string) {
  return value.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL masked]').slice(0, 2_000);
}

function runBinary(file: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(file, args, {
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    let errorOutput = '';
    child.stderr.on('data', chunk => {
      errorOutput += String(chunk).slice(0, 2_000);
    });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`POSTGRES_TOOL_EXIT_${code}: ${redactedError(errorOutput)}`));
    });
  });
}

function runPowerShell(script: string, input: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    );
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', chunk => { output += String(chunk); });
    child.stderr.on('data', chunk => { errorOutput += String(chunk).slice(0, 2_000); });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`DPAPI_EXIT_${code}: ${redactedError(errorOutput)}`));
    });
    child.stdin.end(input);
  });
}

const protectScript = [
  'Add-Type -AssemblyName System.Security',
  '$raw = [Convert]::FromBase64String([Console]::In.ReadToEnd())',
  '$protected = [Security.Cryptography.ProtectedData]::Protect($raw, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)',
  '[Console]::Out.Write([Convert]::ToBase64String($protected))',
].join('; ');

const unprotectScript = [
  'Add-Type -AssemblyName System.Security',
  '$protected = [Convert]::FromBase64String([Console]::In.ReadToEnd())',
  '$raw = [Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)',
  '[Console]::Out.Write([Convert]::ToBase64String($raw))',
].join('; ');

async function inventory(pool: Pool): Promise<Inventory> {
  const result = await pool.query<Inventory>(`
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

async function sha256(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function encryptDump(source: string, destination: string, key: Buffer, iv: Buffer) {
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  await pipeline(createReadStream(source), cipher, createWriteStream(destination, { flags: 'wx' }));
  return cipher.getAuthTag();
}

async function decryptDump(source: string, destination: string, key: Buffer, iv: Buffer, authTag: Buffer) {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  await pipeline(createReadStream(source), decipher, createWriteStream(destination, { flags: 'wx' }));
}

function databaseUrl(source: URL, databaseName: string) {
  const result = new URL(source);
  result.pathname = `/${databaseName}`;
  return result;
}

async function run() {
  if (process.platform !== 'win32') throw new Error('WINDOWS_DPAPI_REQUIRED');
  const database = assertRailwayBackupEnvironment();
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const scratchName = `africa_live_restore_${randomBytes(8).toString('hex')}`;
  const backupDirectory = path.resolve('backups', 'railway');
  const prefix = path.join(backupDirectory, `railway-${stamp}`);
  const encryptedPath = `${prefix}.dump.aes256gcm`;
  const keyPath = `${prefix}.key.dpapi`;
  const metadataPath = `${prefix}.json`;
  const temporaryDirectory = path.join(tmpdir(), `africa-live-railway-${randomBytes(8).toString('hex')}`);
  const plainDumpPath = path.join(temporaryDirectory, 'source.dump');
  const restoredDumpPath = path.join(temporaryDirectory, 'restored.dump');
  const sourcePool = new Pool({
    connectionString: database.toString(),
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  const adminPool = new Pool({
    connectionString: databaseUrl(database, 'postgres').toString(),
    max: 1,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
  });
  let scratchPool: Pool | undefined;
  let scratchCreated = false;
  let completed = false;
  const startedAt = Date.now();

  await mkdir(backupDirectory, { recursive: true });
  await mkdir(temporaryDirectory, { recursive: true });

  try {
    const source = await inventory(sourcePool);
    await runBinary(
      postgresBinary('pg_dump'),
      ['--format=custom', '--no-owner', '--no-acl', '--file', plainDumpPath],
      postgresEnvironment(database, 'railway'),
    );

    const plainDigest = await sha256(plainDumpPath);
    const key = randomBytes(32);
    const iv = randomBytes(12);
    const authTag = await encryptDump(plainDumpPath, encryptedPath, key, iv);
    const protectedKey = await runPowerShell(protectScript, key.toString('base64'));
    await writeFile(keyPath, `${protectedKey}\n`, { encoding: 'utf8', flag: 'wx' });
    await rm(plainDumpPath, { force: true });

    const recoveredKey = Buffer.from(
      await runPowerShell(unprotectScript, (await readFile(keyPath, 'utf8')).trim()),
      'base64',
    );
    await decryptDump(encryptedPath, restoredDumpPath, recoveredKey, iv, authTag);
    if ((await sha256(restoredDumpPath)) !== plainDigest) {
      throw new Error('RAILWAY_BACKUP_DECRYPTION_DIGEST_MISMATCH');
    }

    await adminPool.query(`create database "${scratchName}"`);
    scratchCreated = true;
    await runBinary(
      postgresBinary('pg_restore'),
      ['--dbname', scratchName, '--no-owner', '--no-acl', '--exit-on-error', restoredDumpPath],
      postgresEnvironment(database, scratchName),
    );

    scratchPool = new Pool({
      connectionString: databaseUrl(database, scratchName).toString(),
      max: 1,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
    });
    const restored = await inventory(scratchPool);
    if (JSON.stringify(restored) !== JSON.stringify(source)) {
      throw new Error('RAILWAY_RESTORE_INVENTORY_MISMATCH');
    }

    const encryptedDigest = await sha256(encryptedPath);
    const encryptedSize = (await stat(encryptedPath)).size;
    await writeFile(metadataPath, `${JSON.stringify({
      formatVersion: 1,
      createdAt: now.toISOString(),
      algorithm: 'aes-256-gcm',
      keyProtection: 'windows-dpapi-current-user',
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      plainSha256: plainDigest,
      encryptedSha256: encryptedDigest,
      encryptedBytes: encryptedSize,
      projectId: process.env.RAILWAY_PROJECT_ID,
      environmentId: process.env.RAILWAY_ENVIRONMENT_ID,
      sourceServiceId: process.env.RAILWAY_SERVICE_ID,
      sourceDeploymentId: process.env.RAILWAY_DEPLOYMENT_ID ?? null,
      sourceCommit: process.env.RAILWAY_GIT_COMMIT_SHA ?? null,
      inventory: restored,
      restoreDrillDurationMs: Date.now() - startedAt,
      encryptedDump: path.basename(encryptedPath),
      protectedKey: path.basename(keyPath),
    }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    completed = true;

    console.log(JSON.stringify({
      event: 'railway_backup_restore_drill_succeeded',
      durationMs: Date.now() - startedAt,
      inventory: restored,
      encryptedBytes: encryptedSize,
      backupDirectory,
      encryptedDump: path.basename(encryptedPath),
      metadata: path.basename(metadataPath),
      keyProtection: 'windows-dpapi-current-user',
      scratchDatabaseRetained: false,
    }));
  } finally {
    await scratchPool?.end();
    if (scratchCreated) {
      await adminPool.query(
        'select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()',
        [scratchName],
      );
      await adminPool.query(`drop database "${scratchName}"`);
    }
    await Promise.all([sourcePool.end(), adminPool.end()]);
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (!completed) {
      await Promise.all([
        rm(encryptedPath, { force: true }),
        rm(keyPath, { force: true }),
        rm(metadataPath, { force: true }),
      ]);
    }
  }
}

run().catch(error => {
  console.error(
    'Railway backup/restore drill failed:',
    error instanceof Error ? redactedError(error.message) : 'UNKNOWN_ERROR',
  );
  process.exitCode = 1;
});
