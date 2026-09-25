import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const drizzleCli = path.resolve('node_modules', 'drizzle-kit', 'bin.cjs');

if (!existsSync(drizzleCli)) {
  throw new Error('drizzle-kit is not installed. Run npm install before checking schema drift.');
}

const result = spawnSync(
  process.execPath,
  [
    drizzleCli,
    'generate',
    '--config',
    path.resolve('drizzle.config.ts'),
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    timeout: 120_000,
    windowsHide: true,
  },
);

if (result.error) {
  throw result.error;
}

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(
  /\u001b\[[0-9;]*m/g,
  '',
);

if (result.status === 0 && (output.includes('No schema changes') || output.includes('No changes'))) {
  console.log('Aucune dérive détectée entre src/db/schema.ts et les migrations existantes.');
  process.exit(0);
}

console.error('Dérive détectée : src/db/schema.ts a été modifié mais de nouvelles migrations doivent être générées.');
console.error(output.trim());
process.exit(1);
