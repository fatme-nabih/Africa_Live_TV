type Environment = Record<string, string | undefined>;

export class EnvironmentValidationError extends Error {
  constructor(readonly issues: string[]) {
    // Only variable names and fixed diagnostics: never include submitted values.
    super(`Invalid server configuration:\n${issues.map(issue => `- ${issue}`).join('\n')}`);
    this.name = 'EnvironmentValidationError';
  }
}

function placeholder(value: string) {
  return /placeholder|change[-_]?me|replace[-_]|example|dummy|local-placeholder|development-.*secret|ci-test/i.test(value);
}

function parsedUrl(value: string | undefined) {
  try { return new URL(value ?? ''); } catch { return null; }
}

/** Pure validation, shared by startup and CLI. No secrets returned or logged. */
export function validateServerEnvironment(env: Environment) {
  const issues: string[] = [];
  const productionRuntime = env.NODE_ENV === 'production';
  const deployment = env.DEPLOYMENT_ENV ?? 'production';
  const local = env.LOCAL_DEV_MODE === 'true' && !productionRuntime;
  const database = parsedUrl(env.DATABASE_URL);
  if (!database || !['postgres:', 'postgresql:'].includes(database.protocol) || database.pathname.length < 2) {
    issues.push('DATABASE_URL must be a PostgreSQL connection URL with a database name.');
  }
  for (const name of ['LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_PLAYBACK', 'ENABLE_LOCAL_VLC', 'PLAYBACK_ELIGIBILITY_READY']) {
    if (env[name] !== undefined && !['true', 'false'].includes(env[name]!)) issues.push(`${name} must be true or false.`);
  }
  if (local) {
    if (database?.pathname !== '/africa_live_dev') issues.push('DATABASE_URL must target africa_live_dev in local mode.');
    if (env.NEXT_PUBLIC_LOCAL_DEV_MODE !== 'true') issues.push('NEXT_PUBLIC_LOCAL_DEV_MODE must match LOCAL_DEV_MODE.');
  } else if (!productionRuntime && env.NEXT_PUBLIC_LOCAL_DEV_MODE === 'true') {
    issues.push('NEXT_PUBLIC_LOCAL_DEV_MODE must match LOCAL_DEV_MODE.');
  }

  const app = parsedUrl(env.NEXT_PUBLIC_APP_URL);
  if (env.NEXT_PUBLIC_LOCAL_PLAYBACK === 'true') {
    if (productionRuntime) issues.push('NEXT_PUBLIC_LOCAL_PLAYBACK is forbidden in a deployed server.');
    if (database?.pathname !== '/africa_live_dev') issues.push('Local playback requires africa_live_dev.');
    if (!app || !['localhost', '127.0.0.1', '[::1]'].includes(app.hostname) || app.port !== '3001' || app.protocol !== 'http:') {
      issues.push('Local playback requires http://localhost:3001.');
    }
  }
  if (!app || !['http:', 'https:'].includes(app.protocol) || app.username || app.password || app.search || app.hash || app.pathname !== '/') {
    issues.push('NEXT_PUBLIC_APP_URL must be an HTTP(S) origin without credentials, path or query.');
  }
  if (local && app && (!['localhost', '127.0.0.1', '[::1]'].includes(app.hostname) || app.port !== '3001' || app.protocol !== 'http:')) {
    issues.push('NEXT_PUBLIC_APP_URL must use localhost:3001 in local mode.');
  }
  const proxy = env.ABUSE_TRUSTED_PROXY_HEADER ?? 'disabled';
  if (!['disabled', 'cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'].includes(proxy)) {
    issues.push('ABUSE_TRUSTED_PROXY_HEADER is unsupported.');
  }

  if (productionRuntime) {
    if (proxy === 'disabled') issues.push('ABUSE_TRUSTED_PROXY_HEADER must be configured in deployed environments (e.g., x-forwarded-for).');
    if (!['production', 'staging'].includes(deployment)) issues.push('DEPLOYMENT_ENV must be production or staging.');
    for (const name of ['LOCAL_DEV_MODE', 'NEXT_PUBLIC_LOCAL_DEV_MODE', 'ENABLE_LOCAL_VLC']) {
      if (env[name] !== 'false') issues.push(`${name} must explicitly be false in a deployed server.`);
    }
    if (env.INTEGRATION_TEST_SCHEMA || env.INTEGRATION_TEST_DATABASE || Object.keys(env).some(key => key.endsWith('_INTEGRATION_TEST') && env[key] === '1')) {
      issues.push('Integration test configuration is forbidden in a deployed server.');
    }
    if (database?.pathname === '/africa_live_dev') issues.push('DATABASE_URL must not target the local development database in a deployed server.');
    if (database && placeholder(database.password)) issues.push('DATABASE_URL contains a placeholder password.');
    if (app && (app.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname))) {
      issues.push('NEXT_PUBLIC_APP_URL must be a public HTTPS origin.');
    }
    if (env.BROWSER_TEST_ORIGIN && env.BROWSER_TEST_ORIGIN !== app?.origin) {
      issues.push('BROWSER_TEST_ORIGIN must match NEXT_PUBLIC_APP_URL when configured.');
    }
    if (!['true', 'false'].includes(env.PLAYBACK_ELIGIBILITY_READY ?? '')) {
      issues.push('PLAYBACK_ELIGIBILITY_READY must explicitly be true or false.');
    }
    for (const name of ['ABUSE_HASH_SECRET', 'CATALOG_CURSOR_SECRET']) {
      const value = env[name] ?? '';
      if (value.length < 32 || value.trim() !== value || placeholder(value) || new Set(value).size < 10) {
        issues.push(`${name} must contain at least 32 random characters and cannot be a placeholder.`);
      }
    }
    if (env.ABUSE_HASH_SECRET && env.ABUSE_HASH_SECRET === env.CATALOG_CURSOR_SECRET) {
      issues.push('ABUSE_HASH_SECRET and CATALOG_CURSOR_SECRET must be distinct.');
    }
    const mode = deployment === 'staging' ? '(?:test|live)' : 'live';
    const publishable = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
    const secret = env.CLERK_SECRET_KEY ?? '';
    if (!new RegExp(`^pk_${mode}_[A-Za-z0-9+/=_-]+$`).test(publishable) || placeholder(publishable)) {
      issues.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must match the deployment environment.');
    }
    // Clerk embeds its frontend domain in the publishable key.
    const encoded = publishable.replace(/^pk_(?:test|live)_/, '');
    if (placeholder(Buffer.from(encoded, 'base64').toString('utf8'))) {
      issues.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY contains a placeholder domain.');
    }
    if (!new RegExp(`^sk_${mode}_[A-Za-z0-9_-]{20,}$`).test(secret) || placeholder(secret)) {
      issues.push('CLERK_SECRET_KEY must match the deployment environment and cannot be a placeholder.');
    }
    if (publishable.split('_')[1] !== secret.split('_')[1]) issues.push('Clerk public and secret key modes must match.');
    const signingSecret = env.CLERK_WEBHOOK_SIGNING_SECRET ?? '';
    if (!/^whsec_[A-Za-z0-9+/=_-]{20,}$/.test(signingSecret) || placeholder(signingSecret)) {
      issues.push('CLERK_WEBHOOK_SIGNING_SECRET must be configured with a real signing secret.');
    }
    if (!env.CLERK_BILLING_PLAN_SLUG?.trim() && !env.CLERK_BILLING_PLAN_ID?.trim()) {
      issues.push('CLERK_BILLING_PLAN_SLUG or CLERK_BILLING_PLAN_ID must explicitly identify the configured plan.');
    }
  }
  if (issues.length) throw new EnvironmentValidationError(issues);
}
