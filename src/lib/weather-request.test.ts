import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { requestAuthorizedWeather, weatherDeadline, WeatherRequestError, readWeatherJson } from './weather-request';

// These integration cases must use native fetch regardless of earlier request mocks.
const nativeFetch = globalThis.fetch;

test('RW-001: only a recognized JSON weather 503 permits a single direct request', async t => {
  let direct = 0;
  const cases = [401, 403, 429, 500, 503].map(status => ({ status, body: { error: 'refus', code: 'OTHER' } }));
  cases.push({ status: 503, body: { error: 'panne', code: 'LIVE_WEATHER_UNAVAILABLE' } });
  for (const item of cases) {
    t.mock.method(globalThis, 'fetch', async () => Response.json(item.body, { status: item.status, headers: { 'Retry-After': '120' } }));
    const action = requestAuthorizedWeather('SN', new AbortController().signal, () => 'internal', async () => { direct++; return 'direct'; });
    if (item.body.code === 'LIVE_WEATHER_UNAVAILABLE') assert.equal(await action, 'direct');
    else await assert.rejects(action);
  }
  assert.equal(direct, 1);
});

test('RW-001: HTML, malformed JSON, redirects and network failure never prove access', async t => {
  for (const response of [new Response('<html/>', { status: 503 }), new Response('{', { status: 503, headers: { 'Content-Type': 'application/json' } }), Response.redirect('https://example.org')]) {
    t.mock.method(globalThis, 'fetch', async () => response);
    await assert.rejects(requestAuthorizedWeather('SN', new AbortController().signal, () => true, async () => assert.fail('direct fetch')));
  }
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('network'); });
  await assert.rejects(requestAuthorizedWeather('SN', new AbortController().signal, () => true, async () => assert.fail('direct fetch')));
});

test('RW-001: rate limit carries a retry deadline; body and unresponsive fetch are bounded', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({}, { status: 429, headers: { 'Retry-After': '120' } }));
  await assert.rejects(requestAuthorizedWeather('SN', new AbortController().signal, () => true, async () => true),
    (e: unknown) => e instanceof WeatherRequestError && e.retryAt >= Date.now() + 119_000);
  await assert.rejects(weatherDeadline(new AbortController().signal, 10, async () => new Promise(() => {})), { name: 'TimeoutError' });
  await assert.rejects(weatherDeadline(new AbortController().signal, 10, signal =>
    readWeatherJson(new Response(new ReadableStream({ start() {} })), signal)), { name: 'TimeoutError' });
});

for (const mode of ['deadline', 'parent-abort'] as const) {
  test(`RW-001: real HTTP body ${mode} rejects once without an unhandled cancellation`, async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.write('{"current":');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    let readingBody = false;
    let abortTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const address = server.address();
      assert.ok(address && typeof address === 'object');
      const parent = new AbortController();
      await assert.rejects(weatherDeadline(parent.signal, 1_000, async signal => {
        const response = await nativeFetch(`http://127.0.0.1:${address.port}`, { signal });
        readingBody = true;
        if (mode === 'parent-abort') abortTimer = setTimeout(() => parent.abort(), 20);
        return readWeatherJson(response, signal);
      }), { name: mode === 'deadline' ? 'TimeoutError' : 'AbortError' });
      assert.equal(readingBody, true);
      // Let Node report any unhandled cancellation promise before the test ends.
      await new Promise<void>(resolve => setImmediate(resolve));
    } finally {
      clearTimeout(abortTimer);
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
}
