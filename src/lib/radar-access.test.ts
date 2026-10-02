import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { compileFunction } from 'node:vm';
import ts from 'typescript';

import { evaluateAccess, type AccessDecision, type AccessSubscription } from './access-policy';

// Execute the actual handlers and page guards with only external boundaries
// replaced. No Clerk account, database, quota write or upstream request is used.
const nativeRequire = createRequire(import.meta.url);
const root = path.resolve('src');
type Exports = Record<string, unknown>;

function loadSource(entry: string, mocks: Record<string, Exports>) {
  const cache = new Map<string, Exports>();
  const load = (file: string): Exports => {
    if (cache.has(file)) return cache.get(file)!;
    const testModule = { exports: {} as Exports };
    cache.set(file, testModule.exports);
    const source = readFileSync(file, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText;
    const requireSource = (specifier: string) => {
      const local = specifier.startsWith('@/')
        ? path.resolve(root, specifier.slice(2))
        : specifier.startsWith('.') ? path.resolve(path.dirname(file), specifier) : null;
      const mockKey = local ? '@/' + path.relative(root, local).replaceAll('\\', '/') : specifier;
      if (Object.hasOwn(mocks, mockKey)) return mocks[mockKey];
      if (local) {
        const target = [local + '.ts', local + '.tsx'].find(existsSync);
        if (!target) throw new Error(`Missing source module: ${specifier}`);
        return load(target);
      }
      if (specifier === 'next/server' || specifier === 'react/jsx-runtime') return nativeRequire(specifier);
      throw new Error(`Unmocked external dependency: ${specifier}`);
    };
    compileFunction(output, ['require', 'module', 'exports'], { filename: file })(requireSource, testModule, testModule.exports);
    return testModule.exports;
  };
  return load(path.resolve(root, entry));
}

const now = new Date('2026-09-30T12:00:00.000Z');
const user = { id: 'standard-user', status: 'active', trialEndsAt: '2026-09-29T12:00:00.000Z' };
const subscription = (status: string, end: string): AccessSubscription => ({
  status, currentPeriodEnd: end, trialEndsAt: null, graceEndsAt: null,
});
const cases = [
  { name: 'anonymous', user: null, decision: evaluateAccess(null, [], now), status: 401 },
  { name: 'active trial', user, decision: evaluateAccess({ ...user, trialEndsAt: '2026-10-01T12:00:00Z' }, [], now), status: 200 },
  { name: 'active subscription', user, decision: evaluateAccess(user, [subscription('active', '2026-10-01T12:00:00Z')], now), status: 200 },
  { name: 'payment grace', user, decision: evaluateAccess(user, [subscription('past_due', '2026-09-29T12:00:00Z')], now), status: 200 },
  { name: 'expired trial', user, decision: evaluateAccess(user, [], now), status: 403 },
  { name: 'trial expires exactly now', user, decision: evaluateAccess({ ...user, trialEndsAt: now.toISOString() }, [], now), status: 403 },
  { name: 'expired subscription', user, decision: evaluateAccess(user, [subscription('expired', '2026-09-29T12:00:00Z')], now), status: 403 },
  { name: 'overdue after grace', user, decision: evaluateAccess(user, [subscription('past_due', '2026-09-27T12:00:00Z')], now), status: 403 },
  { name: 'blocked', user, decision: evaluateAccess({ ...user, status: 'blocked' }, [], now), status: 403 },
  { name: 'deleted', user, decision: evaluateAccess({ ...user, status: 'deleted' }, [], now), status: 403 },
  // Administrator validation itself is covered by admin-authorization.test.ts.
  { name: 'verified active administrator', user, decision: { status: 'active', hasAccess: true, expiresAt: null, reason: 'administrator_access' } satisfies AccessDecision, status: 200 },
];

type Scenario = typeof cases[number];
function harness(scenario: Scenario) {
  const state = { scenario, collectorCalls: 0, quotaCalls: 0, suspended: false, rateLimited: false, local: false };
  const collector = async () => { state.collectorCalls++; return { marker: 'private-radar-data' }; };
  const Dashboard = () => null;
  const mocks: Record<string, Exports> = {
    '@/lib/access-control': { getCurrentAccessDecision: async () => ({ user: state.scenario.user, decision: state.scenario.decision, subscriptions: [], clerkSessionId: null }) },
    '@/lib/local-dev': { isLocalDevMode: () => state.local, isLocalDevRequest: (request: Request) => new URL(request.url).hostname === 'localhost' },
    '@/lib/abuse-alerts': { getActiveAbuseSuspension: async () => state.suspended ? { id: 'suspension' } : null, recordRateLimitAlert: async () => {} },
    '@/lib/abuse-request-context': { getAbuseRequestContext: () => ({ networkFingerprint: null, trustedProxyHeader: null }) },
    '@/lib/rate-limit': { consumeRateLimits: async () => {
      state.quotaCalls++;
      return state.rateLimited ? { allowed: false, denied: { retryAfterSeconds: 60, limit: 30 } } : { allowed: true };
    } },
    '@/lib/structured-log': { structuredLog: () => {} },
    '@/lib/live-osint': { getRadarNews: collector },
    '@/lib/rss-collector': { getRadarRss: collector },
    '@/lib/live-weather': { getRadarWeather: collector },
    '@/lib/live-disasters': { getDisasterEventsSnapshot: collector },
    '@/lib/live-firms': { getFirmsSnapshot: collector },
    '@/lib/live-markets': { getLiveMarkets: collector },
    '@/lib/live-briefing': { getLiveBriefing: collector },
    '@/lib/live-channels': { getAfricanChannelsSummary: collector, getChannelsForAfricanCountry: collector },
    'next/navigation': { redirect: (destination: string) => { throw new Error(`redirect:${destination}`); } },
    '@/app/app/live/LiveRadarDashboard': { __esModule: true, default: Dashboard },
    '@/components/AppNavigation': { NavigationProvider: 'navigation-provider' },
    '@/lib/admin-access': { getAdministratorAccess: async () => ({ allowed: state.scenario.decision.reason === 'administrator_access' }) },
  };
  return { state, load: (file: string) => loadSource(file, mocks), Dashboard };
}

const routes = ['news', 'rss', 'weather', 'events', 'firms', 'markets', 'briefing', 'channels'];
type Handler = (request: Request, context?: unknown) => Promise<Response>;
const request = (route: string, query = '') => new Request(`http://localhost:3001/api/live/${route}${query}`);

test('RW-003: weather query rejects unknown country and empty/out-of-range coordinates after authorization', async () => {
  const { load, state } = harness(cases[2]);
  const GET = load('app/api/live/weather/route.ts').GET as Handler;
  for (const query of ['?code=ZZ', '?code=AFR', '?code=', '?lat=&lon=0', '?lat=0&lon=', '?lat=0', '?lat=91&lon=0', '?lat=0&lon=Infinity']) {
    assert.equal((await GET(request('weather', query))).status, 400, query);
    assert.equal(state.collectorCalls, 0);
  }
  state.scenario = cases[0];
  assert.equal((await GET(request('weather', '?code=ZZ'))).status, 401);
  state.scenario = cases[2];
  assert.equal((await GET(request('weather', '?code=ci'))).status, 200);
  assert.equal(state.collectorCalls, 1);
});

for (const route of routes) {
  test(`Radar ${route}: real GET enforces the complete access matrix before collecting data`, async () => {
    for (const scenario of cases) {
      const { load, state } = harness(scenario);
      const GET = load(`app/api/live/${route}/route.ts`).GET as Handler;
      for (const query of route === 'channels' ? ['?summary=true', '?country=SN'] : ['']) {
        const response = await GET(request(route, query));
        assert.equal(response.status, scenario.status, scenario.name);
        const body = await response.json();
        if (scenario.status === 200) {
          assert.equal(body.marker, 'private-radar-data');
          assert.equal(response.headers.get('cache-control'), 'private, no-store');
        } else {
          assert.equal(body.code, scenario.status === 401 ? 'AUTHENTICATION_REQUIRED' : scenario.decision.status === 'blocked' ? 'ACCOUNT_BLOCKED' : 'SUBSCRIPTION_REQUIRED');
          assert.equal(state.collectorCalls, 0);
          assert.equal(state.quotaCalls, 0);
        }
      }
    }
  });
}

test('dashboard guard denies expired accounts while the parent layout permits catalog browsing', async () => {
  for (const scenario of cases) {
    const { load, Dashboard } = harness(scenario);
    const layout = load('app/app/layout.tsx').default as (props: { children: string }) => Promise<{ props: { children: string; admin: boolean } }>;
    const page = load('app/app/live/page.tsx').default as () => Promise<{ type: unknown }>;
    if (!scenario.user) {
      await assert.rejects(layout({ children: 'catalog' }), /redirect:\/sign-in\?redirect_url=\/app\/live/);
      await assert.rejects(page(), /redirect:\/sign-in\?redirect_url=\/app\/live/);
    } else if (scenario.decision.status === 'blocked') {
      await assert.rejects(layout({ children: 'catalog' }), /redirect:\/account\?access=required/);
      await assert.rejects(page(), /redirect:\/account\?access=required/);
    } else {
      const rendered = await layout({ children: 'catalog' });
      assert.equal(rendered.props.children, 'catalog');
      assert.equal(rendered.props.admin, scenario.decision.reason === 'administrator_access');
      if (scenario.status === 200) assert.equal((await page()).type, Dashboard);
      else await assert.rejects(page(), /redirect:\/account\?access=required/);
    }
  }
});

test('Radar rejects an account that expires between requests, including forced refresh', async () => {
  for (const route of routes) {
    const { load, state } = harness(cases[2]);
    const GET = load(`app/api/live/${route}/route.ts`).GET as Handler;
    assert.equal((await GET(request(route))).status, 200);
    state.scenario = cases[6];
    assert.equal((await GET(request(route, '?refresh=true'))).status, 403);
    assert.equal(state.collectorCalls, 1);
  }
});

test('Radar still enforces abuse suspension, quotas and local origin protection', async () => {
  const { load, state } = harness(cases[2]);
  const GET = load('app/api/live/news/route.ts').GET as Handler;
  state.suspended = true;
  const suspended = await GET(request('news'));
  assert.equal(suspended.status, 403);
  assert.equal((await suspended.json()).code, 'ABUSE_REVIEW_REQUIRED');
  assert.equal(state.collectorCalls, 0);
  state.suspended = false;
  state.rateLimited = true;
  const limited = await GET(request('news'));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '60');
  assert.equal(state.collectorCalls, 0);
  state.local = true;
  assert.equal((await GET(new Request('https://foreign.example/api/live/news'))).status, 403);
});

test('expired users retain catalog authorization but cannot obtain playback/favorite authorization', async () => {
  const { load, state } = harness(cases[6]);
  const authorization = load('lib/require-app-access.ts') as {
    authorizeCatalogRequest: (options: { bucket: string; limit: number }, request: Request) => Promise<{ ok: boolean }>;
    authorizeAppRequest: (options: { bucket: string; limit: number }, request: Request) => Promise<{ ok: boolean; response: Response }>;
  };
  const options = { bucket: 'test.catalog', limit: 30 };
  assert.equal((await authorization.authorizeCatalogRequest(options, request('news'))).ok, true);
  const denied = await authorization.authorizeAppRequest(options, request('news'));
  assert.equal(denied.ok, false);
  assert.equal(denied.response.status, 403);
  assert.equal(state.quotaCalls, 1);
});
