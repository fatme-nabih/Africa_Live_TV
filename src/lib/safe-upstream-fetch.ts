import { lookup } from 'node:dns/promises';
import { request as httpRequest, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';
import { Readable } from 'node:stream';

export const MAX_UPSTREAM_REDIRECTS = 5;
export const MAX_UPSTREAM_URL_LENGTH = 4_096;
export const UPSTREAM_ADDRESS_CONNECT_TIMEOUT_MS = 3_000;

export type ResolvedAddress = {
  address: string;
  family: 4 | 6;
};

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const) {
  blockedIpv4Addresses.addSubnet(network, prefix, 'ipv4');
}

for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['64:ff9b::', 96],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
] as const) {
  blockedIpv6Addresses.addSubnet(network, prefix, 'ipv6');
}

export function isPrivateNetworkAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return blockedIpv4Addresses.check(address, 'ipv4');
  if (family === 6) {
    return blockedIpv6Addresses.check(address.split('%')[0], 'ipv6');
  }
  return true;
}

function unbracketHostname(hostname: string) {
  return hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname;
}

export function prioritizeUpstreamAddresses(addresses: ResolvedAddress[]) {
  return [...addresses].sort((left, right) => left.family - right.family);
}

export function createPinnedLookup(address: ResolvedAddress): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: address.address, family: address.family }]);
      return;
    }
    callback(null, address.address, address.family);
  };
}

export function upstreamResponseCanHaveBody(method: string, status: number) {
  return (
    method.toUpperCase() !== 'HEAD' &&
    status !== 204 &&
    status !== 205 &&
    status !== 304
  );
}

export async function attemptUpstreamAddresses<T>(
  addresses: ResolvedAddress[],
  attempt: (address: ResolvedAddress) => Promise<T>,
  signal?: AbortSignal | null,
) {
  let lastError: unknown = null;
  for (const address of addresses) {
    try {
      return await attempt(address);
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError ?? new Error('UPSTREAM_CONNECTION_FAILED');
}

export async function resolveSafeUpstreamAddresses(url: URL) {
  if (
    url.toString().length > MAX_UPSTREAM_URL_LENGTH ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('UNSAFE_UPSTREAM_URL');
  }

  const hostname = unbracketHostname(url.hostname).toLowerCase();
  if (!hostname || hostname === 'localhost') throw new Error('PRIVATE_UPSTREAM_HOST');

  const literalFamily = isIP(hostname);
  const addresses = prioritizeUpstreamAddresses(
    literalFamily
      ? [{ address: hostname, family: literalFamily as 4 | 6 }]
      : (await lookup(hostname, { all: true, verbatim: true })).map(
          ({ address, family }) => ({ address, family: family as 4 | 6 }),
        ),
  );

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateNetworkAddress(address))
  ) {
    throw new Error('PRIVATE_UPSTREAM_HOST');
  }

  return { hostname, addresses };
}

function responseHeaders(rawHeaders: string[]) {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    const name = rawHeaders[index];
    const value = rawHeaders[index + 1];
    if (name && value != null) headers.append(name, value);
  }
  return headers;
}

function requestPinnedAddress(
  url: URL,
  init: RequestInit,
  target: { hostname: string; address: ResolvedAddress },
  redirected: boolean,
) {
  return new Promise<Response>((resolve, reject) => {
    if (init.body != null) {
      reject(new Error('UPSTREAM_REQUEST_BODY_UNSUPPORTED'));
      return;
    }

    const requestHeaders = new Headers(init.headers);
    if (!requestHeaders.has('accept-encoding')) {
      requestHeaders.set('accept-encoding', 'identity');
    }
    const headers = Object.fromEntries(requestHeaders.entries());
    const options: RequestOptions & { servername?: string } = {
      method: init.method ?? 'GET',
      headers,
      signal: init.signal ?? undefined,
      servername: isIP(target.hostname) ? undefined : target.hostname,
      maxHeaderSize: 32 * 1024,
      lookup: createPinnedLookup(target.address),
    };
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
      url,
      options,
      (message) => {
        request.setTimeout(0);
        const status = message.statusCode ?? 0;
        if (status < 200 || status > 599) {
          message.resume();
          reject(new Error('INVALID_UPSTREAM_STATUS'));
          return;
        }

        const body = upstreamResponseCanHaveBody(init.method ?? 'GET', status)
          ? Readable.toWeb(message) as ReadableStream<Uint8Array>
          : null;
        if (body == null) message.resume();
        const response = new Response(body, {
          status,
          statusText: message.statusMessage,
          headers: responseHeaders(message.rawHeaders),
        });
        Object.defineProperties(response, {
          url: { value: url.toString() },
          redirected: { value: redirected },
        });
        resolve(response);
      },
    );
    request.setTimeout(UPSTREAM_ADDRESS_CONNECT_TIMEOUT_MS, () => {
      request.destroy(
        Object.assign(new Error('UPSTREAM_CONNECTION_TIMEOUT'), {
          code: 'ETIMEDOUT',
        }),
      );
    });
    request.once('error', reject);
    request.end();
  });
}

async function fetchPinned(
  url: URL,
  init: RequestInit,
  redirected: boolean,
) {
  const resolved = await resolveSafeUpstreamAddresses(url);
  return attemptUpstreamAddresses(
    resolved.addresses,
    (address) =>
      requestPinnedAddress(
        url,
        init,
        { hostname: resolved.hostname, address },
        redirected,
      ),
    init.signal,
  );
}

export async function safeUpstreamFetch(
  initialUrl: URL,
  init: RequestInit = {},
  redirects = 0,
): Promise<Response> {
  const response = await fetchPinned(initialUrl, init, redirects > 0);
  if (response.status < 300 || response.status >= 400) return response;

  const location = response.headers.get('location');
  await response.body?.cancel().catch(() => undefined);
  if (!location || redirects >= MAX_UPSTREAM_REDIRECTS) {
    throw new Error('UPSTREAM_REDIRECT_REJECTED');
  }

  return safeUpstreamFetch(new URL(location, initialUrl), init, redirects + 1);
}

export async function readResponseTextWithLimit(
  response: Response,
  maximumBytes: number,
  errorCode: string,
) {
  if (!response.body) return '';
  const advertisedLength = Number(response.headers.get('content-length'));
  if (
    Number.isFinite(advertisedLength) &&
    advertisedLength > maximumBytes
  ) {
    await response.body.cancel().catch(() => undefined);
    throw new Error(errorCode);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let byteCount = 0;
  let content = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maximumBytes) throw new Error(errorCode);
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
    return content;
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
