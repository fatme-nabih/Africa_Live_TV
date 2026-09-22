import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';
import { integrationFlags, integrationTestSchema } from '../lib/integration-test-safety';

async function catalogFingerprint(pool: Pool) {
  const results = [];
  for (const table of ['channels', 'streams']) {
    const result = await pool.query(`select count(*)::int as count, md5(string_agg(row_digest, ',' order by row_digest)) as digest from (select md5(row_to_json(t)::text) as row_digest from public.${table} t) rows`);
    results.push(result.rows[0]);
  }
  return JSON.stringify(results);
}

async function run() {
  if (process.env.NODE_ENV === 'production') throw new Error('Integration runner is disabled in production.');
  loadEnvConfig(process.cwd());
  const schema = `africa_live_test_${randomUUID().replaceAll('-', '')}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env, NODE_ENV: 'test', LOCAL_DEV_MODE: 'false', NEXT_PUBLIC_LOCAL_DEV_MODE: 'false',
    INTEGRATION_TEST_DATABASE: 'africa_live_dev', INTEGRATION_TEST_SCHEMA: schema,
    ...Object.fromEntries(integrationFlags.map(flag => [flag, '1'])),
  };
  integrationTestSchema(env); // Reject before opening a connection or writing anything.
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5_000, options: `-c search_path=${schema}` });
  let created = false;
  try {
    const check = await pool.query("select current_database() as name, exists(select 1 from pg_extension where extname='pg_trgm') as extension");
    if (check.rows[0]?.name !== 'africa_live_dev' || !check.rows[0]?.extension) {
      throw new Error('Tests require africa_live_dev with pg_trgm already installed.');
    }
    const catalogBefore = await catalogFingerprint(pool);
    await pool.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await pool.query(`SET search_path TO "${schema}"`);
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8')) as { entries: { tag: string }[] };
    for (const { tag } of journal.entries) {
      const source = await readFile(`drizzle/${tag}.sql`, 'utf8');
      // Test-only namespace relocation; production migration files remain untouched.
      const relocated = source
        .replaceAll('CREATE EXTENSION IF NOT EXISTS "pg_trgm";', '')
        .replaceAll('"public".', `"${schema}".`)
        .replaceAll("'public'", `'${schema}'`)
        .replaceAll(' gin_trgm_ops', ' public.gin_trgm_ops');
      for (const statement of relocated.split('--> statement-breakpoint')) {
        if (statement.trim()) await pool.query(statement);
      }
    }
    let expectedFailureObserved = false;
    try {
      await pool.query('begin');
      await pool.query('create table migration_rollback_probe (id integer primary key)');
      await pool.query('insert into migration_rollback_probe (id) values (1)');
      await pool.query('select migration_failure_probe()');
    } catch {
      expectedFailureObserved = true;
    } finally {
      await pool.query('rollback');
    }
    if (!expectedFailureObserved) throw new Error('Migration rollback probe did not fail as expected.');
    const rollbackProbe = await pool.query("select to_regclass('migration_rollback_probe') as relation");
    if (rollbackProbe.rows[0]?.relation !== null) throw new Error('Failed migration left schema changes behind.');
    console.log('Failed migration transaction rolled back without residual schema changes.');
    const witness = `witness-${randomUUID()}`;
    await pool.query('insert into api_rate_limits (key, window_started_at, request_count, expires_at, updated_at) values ($1, now(), 7, now() + interval \'1 hour\', now())', [witness]);
    const tests = (await readdir('src/lib')).filter(file => file.endsWith('.integration.test.ts')).sort();
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(process.execPath, [
        '--conditions=react-server', '--import', 'tsx', '--test', '--test-concurrency=1',
        ...tests.map(file => `src/lib/${file}`),
      ], { env, stdio: 'inherit', windowsHide: true });
      child.once('error', reject);
      child.once('exit', code => resolve(code ?? 1));
    });
    const survived = await pool.query('select request_count from api_rate_limits where key=$1', [witness]);
    if (survived.rows[0]?.request_count !== 7) throw new Error('Unrelated quota witness was modified by the tests.');
    console.log('Unrelated quota witness preserved.');
    if (await catalogFingerprint(pool) !== catalogBefore) throw new Error('Local catalog changed during the tests.');
    console.log('Public catalog counts and fingerprints unchanged.');
    if (exitCode !== 0) throw new Error('Integration suite failed.');
  } finally {
    try {
      // schema is generated above, validated, and was created exclusively by this run.
      if (created) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally { await pool.end(); }
  }
}

run().catch(error => {
  // Driver errors can include connection details; expose only controlled diagnostics.
  console.error('Integration runner failed:', error instanceof Error ? error.name : 'UnknownError');
  process.exitCode = 1;
});
