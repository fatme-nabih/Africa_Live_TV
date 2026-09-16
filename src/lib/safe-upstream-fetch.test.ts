import assert from 'node:assert/strict';
import test from 'node:test';

import {
  attemptUpstreamAddresses,
  createPinnedLookup,
  isPrivateNetworkAddress,
  prioritizeUpstreamAddresses,
  readResponseTextWithLimit,
  resolveSafeUpstreamAddresses,
  safeUpstreamFetch,
  upstreamResponseCanHaveBody,
} from './safe-upstream-fetch';

test('upstream address validation blocks local and private networks', () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '100.64.0.1',
    '172.16.4.2',
    '192.168.1.1',
    '169.254.1.1',
    '224.0.0.1',
    '::1',
    'fd00::1',
    'fe80::1',
    'fec0::1',
    'ff02::1',
    '2001:db8::1',
    '::ffff:127.0.0.1',
    '::ffff:a9fe:a9fe',
    '64:ff9b::a9fe:a9fe',
    '2002:7f00:1::',
  ]) {
    assert.equal(isPrivateNetworkAddress(address), true, address);
  }
  assert.equal(isPrivateNetworkAddress('185.9.2.18'), false);
  assert.equal(isPrivateNetworkAddress('2606:4700:4700::1111'), false);
});

test('safe targets reject credentials and private literals before opening a socket', async () => {
  await assert.rejects(
    resolveSafeUpstreamAddresses(new URL('https://user:password@example.test/live')),
    /UNSAFE_UPSTREAM_URL/,
  );
  await assert.rejects(
    resolveSafeUpstreamAddresses(
      new URL(`https://example.test/live?value=${'a'.repeat(4_096)}`),
    ),
    /UNSAFE_UPSTREAM_URL/,
  );
  await assert.rejects(
    safeUpstreamFetch(new URL('http://127.0.0.1/private')),
    /PRIVATE_UPSTREAM_HOST/,
  );
  await assert.rejects(
    safeUpstreamFetch(new URL('http://[::1]/private')),
    /PRIVATE_UPSTREAM_HOST/,
  );
});

test('public literal addresses are retained for connection pinning', async () => {
  assert.deepEqual(
    await resolveSafeUpstreamAddresses(new URL('https://1.1.1.1/')),
    {
      hostname: '1.1.1.1',
      addresses: [{ address: '1.1.1.1', family: 4 }],
    },
  );
});

test('public IPv4 addresses are attempted before IPv6 without changing the set', () => {
  assert.deepEqual(
    prioritizeUpstreamAddresses([
      { address: '2606:4700:4700::1111', family: 6 },
      { address: '1.1.1.1', family: 4 },
      { address: '8.8.8.8', family: 4 },
    ]),
    [
      { address: '1.1.1.1', family: 4 },
      { address: '8.8.8.8', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ],
  );
});

test('all validated addresses are attempted until one connects', async () => {
  const addresses = [
    { address: '1.1.1.1', family: 4 as const },
    { address: '2606:4700:4700::1111', family: 6 as const },
  ];
  const attempts: string[] = [];
  const result = await attemptUpstreamAddresses(addresses, async (address) => {
    attempts.push(address.address);
    if (address.family === 4) throw new Error('first address unavailable');
    return 'connected';
  });

  assert.equal(result, 'connected');
  assert.deepEqual(attempts, addresses.map(({ address }) => address));
});

test('pinned DNS lookup supports the Node 22 all-addresses callback contract', async () => {
  const pinned = { address: '1.1.1.1', family: 4 as const };
  const lookup = createPinnedLookup(pinned);

  const allAddresses = await new Promise<unknown>((resolve, reject) => {
    lookup('ignored.example', { all: true }, (error, addresses) => {
      if (error) reject(error);
      else resolve(addresses);
    });
  });
  assert.deepEqual(allAddresses, [pinned]);

  const singleAddress = await new Promise<unknown>((resolve, reject) => {
    lookup('ignored.example', { all: false }, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
  assert.deepEqual(singleAddress, pinned);
});

test('bodyless HTTP statuses remain compatible with the Web Response API', () => {
  assert.equal(upstreamResponseCanHaveBody('GET', 200), true);
  assert.equal(upstreamResponseCanHaveBody('HEAD', 200), false);
  assert.equal(upstreamResponseCanHaveBody('GET', 204), false);
  assert.equal(upstreamResponseCanHaveBody('GET', 205), false);
  assert.equal(upstreamResponseCanHaveBody('GET', 304), false);
});

test('bounded response reads stop oversized remote imports and manifests', async () => {
  const response = new Response('123456789');
  await assert.rejects(
    readResponseTextWithLimit(response, 8, 'UPSTREAM_TOO_LARGE'),
    /UPSTREAM_TOO_LARGE/,
  );
});
