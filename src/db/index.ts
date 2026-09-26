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

export function parseDatabaseMaxConnections(value: string | undefined) {
  if (value === undefined || value === '') return 10;
  if (!/^\d+$/.test(value)) {
    throw new Error('DATABASE_MAX_CONNECTIONS must be an integer between 2 and 10.');
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 2 || parsed > 10) {
    throw new Error('DATABASE_MAX_CONNECTIONS must be an integer between 2 and 10.');
  }
  return parsed;
}

const maxConnections = parseDatabaseMaxConnections(process.env.DATABASE_MAX_CONNECTIONS);

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
    ...(testSchema ? { options: `-c search_path=${testSchema}` } : {}),
  });

if (!globalForDb.pgPool) {
  pool.on('error', (err) => {
    console.error('Erreur inattendue sur le pool de connexions PostgreSQL', err);
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export * as schema from './schema';
