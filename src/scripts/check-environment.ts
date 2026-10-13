import { loadEnvConfig } from '@next/env';
import { EnvironmentValidationError, validateServerEnvironment } from '../lib/server-environment';

const args = process.argv.slice(2);
if (args.some(arg => !['--production', '--staging'].includes(arg)) || args.length > 1) {
  console.error('Usage: npm run config:check -- [--production|--staging]');
  process.exitCode = 1;
} else {
  loadEnvConfig(process.cwd());
  try {
    const { editions } = validateServerEnvironment({
      ...process.env,
      ...(args.length ? { NODE_ENV: 'production', DEPLOYMENT_ENV: args[0] === '--staging' ? 'staging' : 'production' } : {}),
    });
    // Éditions linguistiques : une valeur inconnue est ignorée par le serveur (avertissement, pas une erreur de démarrage).
    if (editions.unknown.length) console.warn(`EDITIONS: ${editions.unknown.length} unknown value(s) ignored (allowed: fr, en, ar).`);
    if (editions.notReady.length) console.warn(`EDITIONS: ${editions.notReady.join(', ')} ignored until its dictionary exists.`);
    console.log(`Active editions: ${editions.editions.join(', ')}.`);
    console.log('Server configuration is valid. Credentials were not verified against external services.');
  } catch (error) {
    console.error(error instanceof EnvironmentValidationError ? error.message : 'Configuration validation failed.');
    process.exitCode = 1;
  }
}
