import type { Pool } from 'pg';

type Environment = Record<string, string | undefined>;

export function assertLocalE2ETarget(env: Environment, baseURL: string | undefined) {
  try {
    const database = new URL(env.DATABASE_URL ?? '');
    const app = new URL(baseURL ?? '');
    if (env.NODE_ENV === 'production' || env.LOCAL_DEV_MODE !== 'true' ||
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
      database.pathname !== '/africa_live_dev' || database.search || database.hash ||
      !['localhost', '127.0.0.1', '[::1]'].includes(app.hostname) ||
      app.protocol !== 'http:' || app.port !== '3001' || app.username || app.password
    ) throw new Error();
  } catch { throw new Error('Local E2E requires africa_live_dev and localhost:3001 in local development mode.'); }
}

export const integrationFlags = [
  'L3_INTEGRATION_TEST', 'CATALOG_INTEGRATION_TEST',
  'CLERK_BILLING_INTEGRATION_TEST', 'LOT8_RESOLUTION_INTEGRATION_TEST',
] as const;

// Only the runner creates these disposable schemas, inside the existing local DB.
export function integrationTestSchema(env: Environment): string | null {
  if (!env.INTEGRATION_TEST_SCHEMA && !integrationFlags.some(flag => env[flag] === '1')) return null;
  let url: URL;
  try { url = new URL(env.DATABASE_URL ?? ''); }
  catch { throw new Error('Unsafe integration target: invalid DATABASE_URL.'); }
  if (
    env.NODE_ENV !== 'test' || env.INTEGRATION_TEST_DATABASE !== 'africa_live_dev' ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/africa_live_dev' || url.search || url.hash ||
    !/^africa_live_test_[a-f0-9]{32}$/.test(env.INTEGRATION_TEST_SCHEMA ?? '')
  ) throw new Error('Unsafe integration target: use npm run test:integration.');
  return env.INTEGRATION_TEST_SCHEMA!;
}

export async function assertIntegrationTarget(pool: Pool) {
  const schema = integrationTestSchema(process.env);
  if (!schema) throw new Error('Integration tests require an isolated schema.');
  const result = await pool.query<{ database: string; schema: string }>(
    'select current_database() as database, current_schema() as schema',
  );
  if (result.rows[0]?.database !== 'africa_live_dev' || result.rows[0]?.schema !== schema) {
    throw new Error('Integration connection does not match the isolated target.');
  }
}
