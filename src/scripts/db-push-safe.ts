import { spawnSync } from 'node:child_process';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const deploymentEnv = process.env.DEPLOYMENT_ENV ?? 'local';
const isProductionLike = deploymentEnv === 'production' || deploymentEnv === 'staging';
const databaseUrl = process.env.DATABASE_URL;
let database: URL | null = null;
try {
  database = databaseUrl ? new URL(databaseUrl) : null;
} catch {
  database = null;
}

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const explicitlyLocal =
  process.env.NODE_ENV !== 'production' &&
  process.env.LOCAL_DEV_MODE === 'true' &&
  deploymentEnv === 'local' &&
  database?.pathname === '/africa_live_dev' &&
  localHosts.has(database.hostname);

if (isProductionLike || !explicitlyLocal) {
  console.error('\n[CRITICAL ERROR]: "db:push" is restricted to the explicit local africa_live_dev configuration.');
  console.error('Use forward-only migrations for staging and production.\n');
  process.exit(1);
}

if (!process.argv.slice(2).includes('--confirm-local-africa-live-dev')) {
  console.error('Refusing db:push without --confirm-local-africa-live-dev.');
  process.exit(1);
}

console.log('[OK] Explicit local africa_live_dev target confirmed. Running drizzle-kit push...');

const result = spawnSync('npx', ['drizzle-kit', 'push'], {
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  console.error("Error executing drizzle-kit push:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
