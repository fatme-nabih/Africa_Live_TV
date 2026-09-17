import { drizzle } from 'drizzle-orm/node-postgres';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
import * as schema from './schema';
import { integrationTestSchema } from '../lib/integration-test-safety';

loadEnvConfig(process.cwd());
const testSchema = integrationTestSchema(process.env);

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

if (
  process.env.LOCAL_DEV_MODE === 'true' &&
  process.env.NODE_ENV !== 'production' &&
  new URL(connectionString).pathname !== '/africa_live_dev'
) {
  throw new Error('Le MVP local doit utiliser la base dédiée africa_live_dev.');
}

const globalForDb = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    // No public fallback: a missing test table must fail, never reach local data.
    ...(testSchema ? { options: `-c search_path=${testSchema}` } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export * as schema from './schema';
