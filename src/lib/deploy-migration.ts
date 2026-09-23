type Environment = Record<string, string | undefined>;

export const DEPLOY_MIGRATION_LOCK = 'africa-live-schema-migrations';

export function assertDeployMigrationEnvironment(env: Environment) {
  let database: URL;
  try {
    database = new URL(env.DATABASE_URL ?? '');
  } catch {
    throw new Error('DEPLOY_DATABASE_URL_INVALID');
  }

  if (
    !['staging', 'production'].includes(env.DEPLOYMENT_ENV ?? '') ||
    !env.RAILWAY_PROJECT_ID ||
    !env.RAILWAY_ENVIRONMENT_ID ||
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    ['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
    database.pathname === '/africa_live_dev'
  ) {
    throw new Error('DEPLOY_MIGRATION_ENVIRONMENT_REFUSED');
  }
}
