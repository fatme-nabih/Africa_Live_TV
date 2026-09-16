import { createHash } from 'node:crypto';

const HLS_CONTENT_TYPES = [
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'audio/mpegurl',
  'audio/x-mpegurl',
];

const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav']);
const VIDEO_EXTENSIONS = new Set(['.m4s', '.mkv', '.mov', '.webm']);
const AUTH_QUERY_KEYS = /(?:^|[-_])(auth|authorization|credential|key|password|session|token)(?:$|[-_])/i;
const EXPIRY_QUERY_KEYS = /(?:^|[-_])(e|exp|expire|expires|expiry|st|start|valid)(?:$|[-_])/i;
const SIGNATURE_QUERY_KEYS = /(?:^|[-_])(hash|hmac|policy|sig|signature)(?:$|[-_])/i;

export type ProtocolHint =
  | 'hls'
  | 'mpeg-ts'
  | 'mp4'
  | 'audio'
  | 'other-video'
  | 'http-unknown'
  | 'non-http'
  | 'invalid';

export type StaticStreamClassification = {
  valid: boolean;
  scheme: string;
  protocolHint: ProtocolHint;
  providerId: string | null;
  hasEmbeddedCredentials: boolean;
  hasQuery: boolean;
  hasAuthLikeQuery: boolean;
  hasExpiryLikeQuery: boolean;
  hasSignatureLikeQuery: boolean;
  hasReviewableTimeWindowQuery: boolean;
};

export type HlsManifestMetrics = {
  isHls: boolean;
  isMaster: boolean;
  byteLength: number;
  resourceReferences: number;
  declaredBandwidths: number[];
  segmentDurationsSeconds: number[];
};

export function providerFingerprint(hostname: string) {
  return createHash('sha256').update(hostname.toLowerCase()).digest('hex').slice(0, 12);
}

function pathnameExtension(pathname: string) {
  const match = /(\.[a-z0-9]{1,8})$/i.exec(pathname);
  return match?.[1].toLowerCase() ?? '';
}

export function classifyStreamUrl(rawUrl: string): StaticStreamClassification {
  try {
    const url = new URL(rawUrl);
    const scheme = url.protocol.toLowerCase();
    const extension = pathnameExtension(url.pathname);
    const isHttp = scheme === 'http:' || scheme === 'https:';
    let protocolHint: ProtocolHint = 'http-unknown';

    if (!isHttp) protocolHint = 'non-http';
    else if (extension === '.m3u8' || extension === '.m3u') protocolHint = 'hls';
    else if (extension === '.ts') protocolHint = 'mpeg-ts';
    else if (extension === '.mp4') protocolHint = 'mp4';
    else if (AUDIO_EXTENSIONS.has(extension)) protocolHint = 'audio';
    else if (VIDEO_EXTENSIONS.has(extension)) protocolHint = 'other-video';

    const queryKeys = [...url.searchParams.keys()];
    const normalizedQueryKeys = new Set(
      queryKeys.map((key) => key.toLowerCase()),
    );
    const hasReviewableTimeWindowQuery =
      normalizedQueryKeys.size === 2 &&
      normalizedQueryKeys.has('start') &&
      normalizedQueryKeys.has('end');
    return {
      valid: true,
      scheme,
      protocolHint,
      providerId: url.hostname ? providerFingerprint(url.hostname) : null,
      hasEmbeddedCredentials: Boolean(url.username || url.password),
      hasQuery: queryKeys.length > 0,
      hasAuthLikeQuery: queryKeys.some((key) => AUTH_QUERY_KEYS.test(key)),
      hasExpiryLikeQuery: queryKeys.some((key) => EXPIRY_QUERY_KEYS.test(key)),
      hasSignatureLikeQuery: queryKeys.some((key) => SIGNATURE_QUERY_KEYS.test(key)),
      hasReviewableTimeWindowQuery,
    };
  } catch {
    return {
      valid: false,
      scheme: 'invalid',
      protocolHint: 'invalid',
      providerId: null,
      hasEmbeddedCredentials: false,
      hasQuery: false,
      hasAuthLikeQuery: false,
      hasExpiryLikeQuery: false,
      hasSignatureLikeQuery: false,
      hasReviewableTimeWindowQuery: false,
    };
  }
}

export function looksLikeHls(contentType: string | null, payload: string) {
  const normalized = contentType?.split(';', 1)[0].trim().toLowerCase() ?? '';
  return HLS_CONTENT_TYPES.includes(normalized) || /^\s*#EXTM3U(?:\s|$)/i.test(payload);
}

export function parseHlsManifestMetrics(manifest: string): HlsManifestMetrics {
  const lines = manifest.split(/\r?\n/);
  const declaredBandwidths: number[] = [];
  const segmentDurationsSeconds: number[] = [];
  let resourceReferences = 0;
  let isMaster = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.startsWith('#')) {
      resourceReferences += 1;
      continue;
    }

    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      isMaster = true;
      const match = /(?:^|,)BANDWIDTH=(\d+)/i.exec(line.slice('#EXT-X-STREAM-INF:'.length));
      if (match) declaredBandwidths.push(Number(match[1]));
    }
    if (line.startsWith('#EXT-X-I-FRAME-STREAM-INF:')) {
      isMaster = true;
      const match = /(?:^|,)BANDWIDTH=(\d+)/i.exec(line.slice('#EXT-X-I-FRAME-STREAM-INF:'.length));
      if (match) declaredBandwidths.push(Number(match[1]));
    }
    if (line.startsWith('#EXTINF:')) {
      const duration = Number.parseFloat(line.slice('#EXTINF:'.length).split(',', 1)[0]);
      if (Number.isFinite(duration) && duration >= 0) segmentDurationsSeconds.push(duration);
    }
    resourceReferences += [...line.matchAll(/URI="([^"]+)"/gi)].length;
  }

  return {
    isHls: /^\s*#EXTM3U(?:\s|$)/i.test(manifest),
    isMaster,
    byteLength: Buffer.byteLength(manifest, 'utf8'),
    resourceReferences,
    declaredBandwidths,
    segmentDurationsSeconds,
  };
}

export function firstManifestResource(manifest: string) {
  return manifest
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#')) ?? null;
}

export function containsSourceExposure(
  text: string,
  sourceUrl: string,
  sourceHostname: string,
) {
  return text.includes(sourceUrl) || (
    sourceHostname.length > 0 && text.toLowerCase().includes(sourceHostname.toLowerCase())
  );
}

export function percentile(values: number[], quantile: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(quantile * sorted.length) - 1));
  return sorted[index];
}

export function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function estimateMonthlyEgressGiB({
  concurrentStreams,
  averageBitrateMbps,
  activeHoursPerDay,
  daysPerMonth = 30,
}: {
  concurrentStreams: number;
  averageBitrateMbps: number;
  activeHoursPerDay: number;
  daysPerMonth?: number;
}) {
  const totalBits =
    concurrentStreams *
    averageBitrateMbps *
    1_000_000 *
    activeHoursPerDay *
    60 *
    60 *
    daysPerMonth;
  return totalBits / 8 / 1024 ** 3;
}
