import { spawnSync } from 'node:child_process';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const deploymentEnv = process.env.DEPLOYMENT_ENV ?? 'local';
const isProductionLike = deploymentEnv === 'production' || deploymentEnv === 'staging';

if (isProductionLike) {
  console.error(`\n[CRITICAL ERROR]: "db:push" is forbidden in environment '${deploymentEnv}'.`);
  console.error(`Please use "npm run db:migrate" for production.\n`);
  process.exit(1);
}

console.log(`[OK] Environment '${deploymentEnv}' detected. Running drizzle-kit push...`);

const result = spawnSync('npx', ['drizzle-kit', 'push'], {
  stdio: 'inherit',
  shell: true,
});

if (result.error) {
  console.error("Error executing drizzle-kit push:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
