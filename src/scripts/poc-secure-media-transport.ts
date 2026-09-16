import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';

import { and, desc, eq, ne } from 'drizzle-orm';

import { db, pool } from '../db';
import { streams } from '../db/schema';
import {
  average,
  containsSourceExposure,
  firstManifestResource,
  parseHlsManifestMetrics,
  percentile,
  providerFingerprint,
} from '../lib/secure-media-assessment';
import { safeUpstreamFetch } from '../lib/safe-upstream-fetch';
import { isPocHlsManifest, rewritePocHlsManifest } from './poc-hls-rewrite';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_MANIFEST_BYTES = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_MAX_CANDIDATES = 60;
const MAX_CLIENT_READ_BYTES = 256 * 1024;

type Options = {
  streamId: string | null;
  concurrency: number;
  timeoutMs: number;
  maxCandidates: number;
  json: boolean;
};

type Candidate = {
  id: string;
  url: string;
};

type RelayStats = {
  clientRequests: number;
  upstreamRequests: number;
  rangeRequests: number;
  headRequests: number;
  bytesToClient: number;
  backpressureWaits: number;
  clientAborts: number;
  upstreamTimeouts: number;
};

type OpaqueRelay = {
  server: Server;
  entryUrl: string;
  stats: RelayStats;
  close: () => Promise<void>;
};

function positiveInt(value: string | undefined, name: string) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} doit être un entier positif.`);
  return parsed;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    streamId: null,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxCandidates: DEFAULT_MAX_CANDIDATES,
    json: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    switch (args[index]) {
      case '--stream-id':
        options.streamId = args[++index] || null;
        if (!options.streamId) throw new Error('--stream-id exige une valeur.');
        break;
      case '--concurrency':
        options.concurrency = positiveInt(args[++index], '--concurrency');
        if (options.concurrency > 16) throw new Error('--concurrency ne peut pas dépasser 16.');
        break;
      case '--timeout':
        options.timeoutMs = positiveInt(args[++index], '--timeout');
        break;
      case '--max-candidates':
        options.maxCandidates = positiveInt(args[++index], '--max-candidates');
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: npm run poc:media -- --concurrency 4 --timeout 15000 [--stream-id id] [--json]',
        );
        process.exit(0);
      default:
        throw new Error(`Argument inconnu: ${args[index]}`);
    }
  }
  return options;
}

async function readWebBodyLimited(response: Response, maximumBytes: number) {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maximumBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = maximumBytes - total;
      const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
      chunks.push(chunk);
      total += chunk.byteLength;
      if (value.byteLength > remaining) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function requestHeaders(request: IncomingMessage) {
  const headers = new Headers({
    Accept: request.headers.accept ||
      'application/vnd.apple.mpegurl, application/x-mpegURL, video/*, audio/*, */*',
    'User-Agent': USER_AGENT,
  });
  if (request.headers.range) headers.set('Range', request.headers.range);
  return headers;
}

function copySafeResponseHeaders(upstream: Response, response: ServerResponse) {
  for (const name of [
    'accept-ranges',
    'content-length',
    'content-range',
    'content-type',
    'etag',
    'last-modified',
  ]) {
    const value = upstream.headers.get(name);
    if (value) response.setHeader(name, value);
  }
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

async function readManifest(upstream: Response) {
  const bytes = await readWebBodyLimited(upstream, MAX_MANIFEST_BYTES + 1);
  if (bytes.byteLength > MAX_MANIFEST_BYTES) throw new Error('MANIFEST_TOO_LARGE');
  return new TextDecoder().decode(bytes);
}

async function streamWithBackpressure(
  upstream: Response,
  response: ServerResponse,
  stats: RelayStats,
) {
  if (!upstream.body) {
    response.end();
    return;
  }
  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      stats.bytesToClient += value.byteLength;
      if (!response.write(Buffer.from(value))) {
        stats.backpressureWaits += 1;
        await once(response, 'drain');
      }
    }
    response.end();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

function startOpaqueRelay(sourceUrl: string, timeoutMs: number): Promise<OpaqueRelay> {
  const targets = new Map<string, string>();
  const rootId = randomUUID();
  targets.set(rootId, sourceUrl);
  const stats: RelayStats = {
    clientRequests: 0,
    upstreamRequests: 0,
    rangeRequests: 0,
    headRequests: 0,
    bytesToClient: 0,
    backpressureWaits: 0,
    clientAborts: 0,
    upstreamTimeouts: 0,
  };

  const server = createServer(async (request, response) => {
    stats.clientRequests += 1;
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const match = /^\/resource\/([a-f0-9-]+)$/.exec(requestUrl.pathname);
    const target = match ? targets.get(match[1]) : null;
    if (!target) {
      response.writeHead(404, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: 'Ressource inconnue.', code: 'OPAQUE_RESOURCE_NOT_FOUND' }));
      return;
    }

    const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
    if (method === 'HEAD') stats.headRequests += 1;
    if (request.headers.range) stats.rangeRequests += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let responseCompleted = false;
    response.once('close', () => {
      if (!responseCompleted) {
        stats.clientAborts += 1;
        controller.abort();
      }
    });

    try {
      stats.upstreamRequests += 1;
      const upstream = await safeUpstreamFetch(new URL(target), {
        method,
        cache: 'no-store',
        headers: requestHeaders(request),
        signal: controller.signal,
      });
      response.statusCode = upstream.status;
      copySafeResponseHeaders(upstream, response);

      if (method === 'HEAD') {
        await upstream.body?.cancel();
        responseCompleted = true;
        response.end();
        return;
      }

      const finalUrl = new URL(upstream.url || target);
      if (upstream.ok && isPocHlsManifest(upstream.headers.get('content-type'), finalUrl)) {
        const manifest = await readManifest(upstream);
        if (!/^\s*#EXTM3U(?:\s|$)/i.test(manifest)) throw new Error('INVALID_HLS_MANIFEST');
        const rewritten = rewritePocHlsManifest(manifest, finalUrl.toString(), (absoluteUrl) => {
          const id = randomUUID();
          targets.set(id, absoluteUrl);
          return `/resource/${id}`;
        });
        response.removeHeader('content-length');
        response.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        const payload = Buffer.from(rewritten, 'utf8');
        stats.bytesToClient += payload.byteLength;
        responseCompleted = true;
        response.end(payload);
        return;
      }

      await streamWithBackpressure(upstream, response, stats);
      responseCompleted = true;
    } catch (error) {
      if (controller.signal.aborted) stats.upstreamTimeouts += 1;
      if (!response.headersSent) {
        response.writeHead(502, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      }
      if (!response.writableEnded) {
        response.end(JSON.stringify({
          error: 'Le relais POC ne peut pas joindre la ressource.',
          code: 'POC_RELAY_UNAVAILABLE',
        }));
      }
      if (!(error instanceof Error)) return;
    } finally {
      clearTimeout(timeout);
    }
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('POC_RELAY_LISTEN_FAILED'));
        return;
      }
      resolve({
        server,
        entryUrl: `http://127.0.0.1:${address.port}/resource/${rootId}`,
        stats,
        close: async () => {
          server.close();
          await once(server, 'close');
        },
      });
    });
  });
}

async function fetchCandidateManifest(candidate: Candidate, timeoutMs: number) {
  const upstream = await safeUpstreamFetch(new URL(candidate.url), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await readManifest(upstream);
  return {
    text,
    ok: upstream.ok,
    metrics: parseHlsManifestMetrics(text),
  };
}

async function findMasterCandidate(options: Options) {
  const query = db
    .select({ id: streams.id, url: streams.url })
    .from(streams)
    .where(and(eq(streams.active, true), ne(streams.status, 'OFFLINE')))
    .orderBy(desc(streams.lastSuccessAt))
    .limit(options.streamId ? 1 : options.maxCandidates);
  const candidates = options.streamId
    ? await db
        .select({ id: streams.id, url: streams.url })
        .from(streams)
        .where(and(eq(streams.id, options.streamId), eq(streams.active, true), ne(streams.status, 'OFFLINE')))
        .limit(1)
    : await query;

  for (const candidate of candidates) {
    try {
      const manifest = await fetchCandidateManifest(candidate, options.timeoutMs);
      if (manifest.ok && manifest.metrics.isHls && manifest.metrics.isMaster) return candidate;
    } catch {
      // Candidate probing is best-effort and never logs a source URL.
    }
  }
  throw new Error('NO_WORKING_MASTER_PLAYLIST_FOUND');
}

async function fetchText(url: string) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();
  return { response, text };
}

async function readClientResponseLimited(response: Response, maximumBytes: number, slow = false) {
  if (!response.body) return 0;
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    while (bytes < maximumBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += Math.min(value.byteLength, maximumBytes - bytes);
      if (slow) await new Promise((resolve) => setTimeout(resolve, 2));
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return bytes;
}

async function runConcurrencyProbe(segmentUrl: string, concurrency: number) {
  const startedAt = performance.now();
  const latencies: number[] = [];
  const bytes = await Promise.all(Array.from({ length: concurrency }, async () => {
    const requestStartedAt = performance.now();
    const response = await fetch(segmentUrl, {
      cache: 'no-store',
      headers: { Range: 'bytes=0-65535' },
    });
    const received = await readClientResponseLimited(response, 65_536);
    latencies.push(performance.now() - requestStartedAt);
    return received;
  }));
  const durationMs = performance.now() - startedAt;
  const totalBytes = bytes.reduce((sum, value) => sum + value, 0);
  return {
    requested: concurrency,
    completed: bytes.length,
    totalBytes,
    durationMs: Number(durationMs.toFixed(1)),
    latencyP50Ms: Number((percentile(latencies, 0.5) ?? 0).toFixed(1)),
    latencyP95Ms: Number((percentile(latencies, 0.95) ?? 0).toFixed(1)),
    effectiveThroughputMbps: Number((totalBytes * 8 / Math.max(durationMs, 1) / 1000).toFixed(3)),
  };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const candidate = await findMasterCandidate(options);
  const source = new URL(candidate.url);
  const sourceFingerprint = providerFingerprint(source.hostname);
  const relay = await startOpaqueRelay(candidate.url, options.timeoutMs);
  const cpuBefore = process.cpuUsage();
  const memoryBefore = process.memoryUsage();
  const startedAt = performance.now();

  try {
    const root = await fetchText(relay.entryUrl);
    if (!root.response.ok) throw new Error('POC_ROOT_FETCH_FAILED');
    const rootMetrics = parseHlsManifestMetrics(root.text);
    if (!rootMetrics.isMaster) throw new Error('POC_ROOT_IS_NOT_MASTER');
    const rootReference = firstManifestResource(root.text);
    if (!rootReference) throw new Error('POC_MASTER_WITHOUT_VARIANT');
    const mediaUrl = new URL(rootReference, relay.entryUrl).toString();

    const media = await fetchText(mediaUrl);
    if (!media.response.ok) throw new Error('POC_MEDIA_FETCH_FAILED');
    const mediaMetrics = parseHlsManifestMetrics(media.text);
    if (!mediaMetrics.isHls || mediaMetrics.isMaster) throw new Error('POC_MEDIA_PLAYLIST_INVALID');
    const segmentReference = firstManifestResource(media.text);
    if (!segmentReference) throw new Error('POC_MEDIA_WITHOUT_SEGMENT');
    const segmentUrl = new URL(segmentReference, mediaUrl).toString();

    const rangeStartedAt = performance.now();
    const rangeResponse = await fetch(segmentUrl, {
      cache: 'no-store',
      headers: { Range: 'bytes=0-65535' },
    });
    const rangeBytes = await readClientResponseLimited(rangeResponse, 65_536);
    const rangeLatencyMs = performance.now() - rangeStartedAt;

    const headStartedAt = performance.now();
    const headResponse = await fetch(segmentUrl, { method: 'HEAD', cache: 'no-store' });
    const headLatencyMs = performance.now() - headStartedAt;
    await headResponse.body?.cancel();

    const slowResponse = await fetch(segmentUrl, {
      cache: 'no-store',
      headers: { Range: 'bytes=0-262143' },
    });
    const slowReadBytes = await readClientResponseLimited(slowResponse, MAX_CLIENT_READ_BYTES, true);

    const abortResponse = await fetch(segmentUrl, { cache: 'no-store' });
    const abortReader = abortResponse.body?.getReader();
    const firstChunk = abortReader ? await abortReader.read() : { done: true, value: undefined };
    await abortReader?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 50));

    let timeoutEnforced = false;
    try {
      const timeoutResponse = await safeUpstreamFetch(new URL(candidate.url), {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(1),
      });
      await timeoutResponse.body?.cancel();
    } catch (error) {
      timeoutEnforced =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError');
    }

    const concurrency = await runConcurrencyProbe(segmentUrl, options.concurrency);
    const durationMs = performance.now() - startedAt;
    const cpu = process.cpuUsage(cpuBefore);
    const memoryAfter = process.memoryUsage();
    const rootConcealed = !containsSourceExposure(root.text, candidate.url, source.hostname);
    const mediaConcealed = !containsSourceExposure(media.text, candidate.url, source.hostname);
    const opaqueReferences = [rootReference, segmentReference].every((reference) =>
      /^\/resource\/[a-f0-9-]+$/.test(new URL(reference, relay.entryUrl).pathname),
    );
    if (!rootConcealed || !mediaConcealed || !opaqueReferences) {
      throw new Error('POC_SOURCE_EXPOSURE_DETECTED');
    }

    const report = {
      generatedAt: new Date().toISOString(),
      privacy: 'The source URL and hostname are intentionally omitted.',
      source: {
        streamId: candidate.id,
        providerId: sourceFingerprint,
      },
      confidentiality: {
        masterContainsNoSource: rootConcealed,
        mediaContainsNoSource: mediaConcealed,
        clientReferencesAreOpaque: opaqueReferences,
        responseLocationExposed: Boolean(
          root.response.headers.get('location') || media.response.headers.get('location'),
        ),
      },
      hls: {
        masterManifestBytes: rootMetrics.byteLength,
        mediaManifestBytes: mediaMetrics.byteLength,
        declaredBandwidthMbps: rootMetrics.declaredBandwidths.map((value) =>
          Number((value / 1_000_000).toFixed(3))
        ),
        averageDeclaredBandwidthMbps: Number((
          average(rootMetrics.declaredBandwidths.map((value) => value / 1_000_000)) ?? 0
        ).toFixed(3)),
        segmentDurationSamples: mediaMetrics.segmentDurationsSeconds.length,
        averageSegmentDurationSeconds: Number((
          average(mediaMetrics.segmentDurationsSeconds) ?? 0
        ).toFixed(3)),
      },
      transport: {
        range: {
          status: rangeResponse.status,
          partialContent: rangeResponse.status === 206,
          bytesRead: rangeBytes,
          latencyMs: Number(rangeLatencyMs.toFixed(1)),
        },
        head: {
          status: headResponse.status,
          accepted: headResponse.ok,
          latencyMs: Number(headLatencyMs.toFixed(1)),
        },
        slowConsumer: {
          bytesRead: slowReadBytes,
          backpressureObserved: relay.stats.backpressureWaits > 0,
        },
        cancellation: {
          firstChunkBytes: firstChunk.value?.byteLength ?? 0,
          relayObservedAbort: relay.stats.clientAborts > 0,
        },
        timeoutEnforced,
        concurrency,
      },
      resources: {
        wallTimeMs: Number(durationMs.toFixed(1)),
        cpuUserMs: Number((cpu.user / 1000).toFixed(1)),
        cpuSystemMs: Number((cpu.system / 1000).toFixed(1)),
        rssDeltaMiB: Number(((memoryAfter.rss - memoryBefore.rss) / 1024 ** 2).toFixed(2)),
        heapUsedDeltaMiB: Number((
          (memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 ** 2
        ).toFixed(2)),
        relay: relay.stats,
      },
      caveats: [
        'This is a bounded workstation POC, not a production capacity benchmark.',
        'Provider behavior and hosting egress limits still require validation in the target environment.',
      ],
    };

    if (options.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log('POC de relais média opaque');
      console.log(JSON.stringify(report, null, 2));
    }
  } finally {
    await relay.close();
  }
}

run()
  .catch((error) => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'secure_media.poc_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      code: error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
        ? error.message
        : 'UNEXPECTED_FAILURE',
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
