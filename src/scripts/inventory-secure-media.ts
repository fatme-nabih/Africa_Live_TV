import { createHash } from 'node:crypto';

import { and, desc, eq, ne } from 'drizzle-orm';

import { db, pool } from '../db';
import { channels, streams } from '../db/schema';
import {
  average,
  classifyStreamUrl,
  firstManifestResource,
  looksLikeHls,
  parseHlsManifestMetrics,
  percentile,
  type ProtocolHint,
} from '../lib/secure-media-assessment';
import { safeUpstreamFetch } from '../lib/safe-upstream-fetch';

const DEFAULT_SAMPLE_SIZE = 30;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

type Options = {
  sampleSize: number;
  concurrency: number;
  timeoutMs: number;
  json: boolean;
};

type StreamRow = {
  id: string;
  url: string;
  status: string;
  lastSuccessAt: string | null;
  failureReason: string | null;
  channelName: string;
};

type ProbeResult = {
  providerId: string | null;
  outcome: 'hls' | 'other-media' | 'html' | 'forbidden' | 'geoblocked' | 'unavailable' | 'blocked';
  redirected: boolean;
  setCookie: boolean;
  contentType: string | null;
  rootManifestBytes: number | null;
  mediaManifestBytes: number | null;
  declaredBandwidths: number[];
  segmentDurations: number[];
};

function positiveInt(value: string | undefined, name: string) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} doit être un entier positif.`);
  return parsed;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    sampleSize: DEFAULT_SAMPLE_SIZE,
    concurrency: DEFAULT_CONCURRENCY,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    json: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    switch (args[index]) {
      case '--sample':
        options.sampleSize = positiveInt(args[++index], '--sample');
        break;
      case '--concurrency':
        options.concurrency = positiveInt(args[++index], '--concurrency');
        if (options.concurrency > 20) throw new Error('--concurrency ne peut pas dépasser 20.');
        break;
      case '--timeout':
        options.timeoutMs = positiveInt(args[++index], '--timeout');
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        console.log(
          'Usage: npm run inventory:media -- --sample 30 --concurrency 5 --timeout 10000 [--json]',
        );
        process.exit(0);
      default:
        throw new Error(`Argument inconnu: ${args[index]}`);
    }
  }
  return options;
}

function increment(record: Record<string, number>, key: string) {
  record[key] = (record[key] ?? 0) + 1;
}

async function readPrefix(response: Response, maximumBytes: number) {
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
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return joined;
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function sanitizedErrorOutcome(error: unknown): ProbeResult['outcome'] {
  if (!(error instanceof Error)) return 'unavailable';
  if (error.message === 'UNSAFE_UPSTREAM_URL' || error.message === 'PRIVATE_UPSTREAM_HOST') {
    return 'blocked';
  }
  return 'unavailable';
}

async function fetchManifest(url: URL, timeoutMs: number) {
  const response = await safeUpstreamFetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, video/*, audio/*, */*',
      'User-Agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const bytes = await readPrefix(response, MAX_MANIFEST_BYTES);
  return { response, text: decodeText(bytes), bytes: bytes.byteLength };
}

async function probeStream(stream: StreamRow, timeoutMs: number): Promise<ProbeResult> {
  const classification = classifyStreamUrl(stream.url);
  if (!classification.valid || !['http:', 'https:'].includes(classification.scheme)) {
    return {
      providerId: classification.providerId,
      outcome: 'blocked',
      redirected: false,
      setCookie: false,
      contentType: null,
      rootManifestBytes: null,
      mediaManifestBytes: null,
      declaredBandwidths: [],
      segmentDurations: [],
    };
  }

  try {
    const rootUrl = new URL(stream.url);
    const root = await fetchManifest(rootUrl, timeoutMs);
    const rootType = root.response.headers.get('content-type');
    const common = {
      providerId: classification.providerId,
      redirected: root.response.url !== rootUrl.toString(),
      setCookie: root.response.headers.has('set-cookie'),
      contentType: rootType?.split(';', 1)[0].toLowerCase() ?? null,
    };

    if (root.response.status === 451) {
      return {
        ...common,
        outcome: 'geoblocked',
        rootManifestBytes: null,
        mediaManifestBytes: null,
        declaredBandwidths: [],
        segmentDurations: [],
      };
    }
    if (root.response.status === 401 || root.response.status === 403) {
      return {
        ...common,
        outcome: 'forbidden',
        rootManifestBytes: null,
        mediaManifestBytes: null,
        declaredBandwidths: [],
        segmentDurations: [],
      };
    }
    if (!root.response.ok) {
      return {
        ...common,
        outcome: 'unavailable',
        rootManifestBytes: null,
        mediaManifestBytes: null,
        declaredBandwidths: [],
        segmentDurations: [],
      };
    }

    if (!looksLikeHls(rootType, root.text)) {
      const html = rootType?.includes('text/html') || /^\s*(?:<!doctype|<html|<body)/i.test(root.text);
      return {
        ...common,
        outcome: html ? 'html' : 'other-media',
        rootManifestBytes: null,
        mediaManifestBytes: null,
        declaredBandwidths: [],
        segmentDurations: [],
      };
    }

    const rootMetrics = parseHlsManifestMetrics(root.text);
    let mediaMetrics = rootMetrics;
    let mediaBytes: number | null = root.bytes;
    if (rootMetrics.isMaster) {
      const reference = firstManifestResource(root.text);
      if (reference) {
        const media = await fetchManifest(new URL(reference, root.response.url || rootUrl), timeoutMs);
        if (media.response.ok && looksLikeHls(media.response.headers.get('content-type'), media.text)) {
          mediaMetrics = parseHlsManifestMetrics(media.text);
          mediaBytes = media.bytes;
        } else {
          mediaBytes = null;
        }
      }
    }

    return {
      ...common,
      outcome: 'hls',
      rootManifestBytes: root.bytes,
      mediaManifestBytes: mediaBytes,
      declaredBandwidths: rootMetrics.declaredBandwidths,
      segmentDurations: mediaMetrics.segmentDurationsSeconds,
    };
  } catch (error) {
    return {
      providerId: classification.providerId,
      outcome: sanitizedErrorOutcome(error),
      redirected: false,
      setCookie: false,
      contentType: null,
      rootManifestBytes: null,
      mediaManifestBytes: null,
      declaredBandwidths: [],
      segmentDurations: [],
    };
  }
}

async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }));
  return results;
}

function round(value: number | null, digits = 1) {
  return value == null ? null : Number(value.toFixed(digits));
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const rows = await db
    .select({
      id: streams.id,
      url: streams.url,
      status: streams.status,
      lastSuccessAt: streams.lastSuccessAt,
      failureReason: streams.failureReason,
      channelName: channels.name,
    })
    .from(streams)
    .innerJoin(channels, eq(channels.id, streams.channelId))
    .where(and(eq(streams.active, true), ne(streams.status, 'OFFLINE')))
    .orderBy(desc(streams.lastSuccessAt));

  const byStatus: Record<string, number> = {};
  const byScheme: Record<string, number> = {};
  const byProtocolHint: Record<ProtocolHint, number> = {
    hls: 0,
    'mpeg-ts': 0,
    mp4: 0,
    audio: 0,
    'other-video': 0,
    'http-unknown': 0,
    'non-http': 0,
    invalid: 0,
  };
  const providerCounts = new Map<string, number>();
  let hasEmbeddedCredentials = 0;
  let hasQuery = 0;
  let hasAuthLikeQuery = 0;
  let hasExpiryLikeQuery = 0;
  let hasSignatureLikeQuery = 0;
  let catalogGeoblockLabels = 0;
  let previousForbiddenOrExpired = 0;
  let previousTimeout = 0;

  for (const stream of rows) {
    const classification = classifyStreamUrl(stream.url);
    increment(byStatus, stream.status);
    increment(byScheme, classification.scheme);
    byProtocolHint[classification.protocolHint] += 1;
    if (classification.providerId) {
      providerCounts.set(
        classification.providerId,
        (providerCounts.get(classification.providerId) ?? 0) + 1,
      );
    }
    if (classification.hasEmbeddedCredentials) hasEmbeddedCredentials += 1;
    if (classification.hasQuery) hasQuery += 1;
    if (classification.hasAuthLikeQuery) hasAuthLikeQuery += 1;
    if (classification.hasExpiryLikeQuery) hasExpiryLikeQuery += 1;
    if (classification.hasSignatureLikeQuery) hasSignatureLikeQuery += 1;
    if (/geo(?:-| )?block|géo(?:-| )?bloqu|not available in/i.test(stream.channelName)) {
      catalogGeoblockLabels += 1;
    }
    if (/forbidden|expired|token|http_?(?:401|403)/i.test(stream.failureReason ?? '')) {
      previousForbiddenOrExpired += 1;
    }
    if (/timeout/i.test(stream.failureReason ?? '')) previousTimeout += 1;
  }

  const deterministicSample = [...rows]
    .sort((left, right) => (
      createHash('sha256').update(left.id).digest('hex')
        .localeCompare(createHash('sha256').update(right.id).digest('hex'))
    ))
    .slice(0, Math.min(options.sampleSize, rows.length));
  const probes = await mapConcurrent(
    deterministicSample,
    options.concurrency,
    (stream) => probeStream(stream, options.timeoutMs),
  );

  const outcomes: Record<string, number> = {};
  const contentTypes: Record<string, number> = {};
  const manifestSizes = probes.flatMap((probe) =>
    [probe.rootManifestBytes, probe.mediaManifestBytes].filter((value): value is number => value != null),
  );
  const bandwidths = probes.flatMap((probe) => probe.declaredBandwidths);
  const durations = probes.flatMap((probe) => probe.segmentDurations);
  for (const probe of probes) {
    increment(outcomes, probe.outcome);
    if (probe.contentType) increment(contentTypes, probe.contentType);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    privacy: 'No source URL or provider hostname is included. Provider identifiers are SHA-256 prefixes.',
    scope: {
      activeNonOfflineStreams: rows.length,
      networkSampleRequested: deterministicSample.length,
      timeoutMs: options.timeoutMs,
      concurrency: options.concurrency,
    },
    staticInventory: {
      byStatus,
      byScheme,
      byProtocolHint,
      uniqueProviderCount: providerCounts.size,
      topProviderConcentration: [...providerCounts.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 10)
        .map(([providerId, count]) => ({ providerId, count })),
      urlSignals: {
        hasEmbeddedCredentials,
        hasQuery,
        hasAuthLikeQuery,
        hasExpiryLikeQuery,
        hasSignatureLikeQuery,
      },
      knownAccessSignals: {
        catalogGeoblockLabels,
        previousForbiddenOrExpired,
        previousTimeout,
      },
    },
    networkSample: {
      outcomes,
      contentTypes,
      redirected: probes.filter((probe) => probe.redirected).length,
      setsCookie: probes.filter((probe) => probe.setCookie).length,
      suspectedHeaderOrAuthorizationRequirement: probes.filter((probe) => probe.outcome === 'forbidden').length,
      suspectedGeoblocking: probes.filter((probe) => probe.outcome === 'geoblocked').length,
      manifestBytes: {
        samples: manifestSizes.length,
        average: round(average(manifestSizes)),
        p95: percentile(manifestSizes, 0.95),
        maximum: manifestSizes.length ? Math.max(...manifestSizes) : null,
      },
      declaredBandwidthMbps: {
        samples: bandwidths.length,
        average: round(average(bandwidths.map((value) => value / 1_000_000)), 3),
        p95: round((percentile(bandwidths, 0.95) ?? 0) / 1_000_000, 3),
      },
      segmentDurationSeconds: {
        samples: durations.length,
        average: round(average(durations), 3),
        p95: percentile(durations, 0.95),
      },
    },
  };

  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('Inventaire sécurisé des flux');
    console.log(JSON.stringify(report, null, 2));
  }
}

run()
  .catch((error) => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'secure_media.inventory_failed',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
