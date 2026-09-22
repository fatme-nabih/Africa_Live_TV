import { loadEnvConfig } from '@next/env';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool, type PoolClient } from 'pg';

import {
  assertDeployMigrationEnvironment,
  DEPLOY_MIGRATION_LOCK,
} from '../lib/deploy-migration';

async function releaseLock(client: PoolClient | undefined) {
  if (!client) return;
  try {
    await client.query('select pg_advisory_unlock(hashtext($1))', [DEPLOY_MIGRATION_LOCK]);
  } catch {
    // The connection close below also releases a session advisory lock.
  }
}

async function run() {
  loadEnvConfig(process.cwd());
  assertDeployMigrationEnvironment(process.env);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    const lock = await client.query<{ acquired: boolean }>(
      'select pg_try_advisory_lock(hashtext($1)) as acquired',
      [DEPLOY_MIGRATION_LOCK],
    );
    if (!lock.rows[0]?.acquired) throw new Error('DEPLOY_MIGRATION_ALREADY_RUNNING');

    await client.query("set lock_timeout = '10s'");
    await client.query("set statement_timeout = '240s'");
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log('Deployment migrations completed inside the Drizzle PostgreSQL transaction.');
  } finally {
    await releaseLock(client);
    client?.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Deployment migration failed:', error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[URL masquée]') : 'UNKNOWN_ERROR');
  process.exitCode = 1;
});
