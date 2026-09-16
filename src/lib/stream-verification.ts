import { safeUpstreamFetch } from './safe-upstream-fetch';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAX_MANIFEST_BYTES = 1024 * 1024;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export type HlsCheckOptions = {
  timeoutMs: number;
  retries: number;
  backoffBaseMs?: number;
  origin?: string;
  userAgent?: string;
  fetcher?: UpstreamFetcher;
};

export type UpstreamFetcher = (url: URL, init: RequestInit) => Promise<Response>;

export type HlsCheckResult = {
  available: boolean;
  playableStatus: 'BROWSER_OK' | 'VLC_ONLY' | null;
  temporaryFailure: boolean;
  corsAllowed: boolean;
  mixedContent: boolean;
  httpStatus: number | null;
  failureReason: string | null;
  finalUrl: string | null;
  redirected: boolean;
  setsCookie: boolean;
  attempts: number;
};

class ProbeError extends Error {
  constructor(
    message: string,
    readonly details: {
      retryable: boolean;
      temporary: boolean;
      httpStatus?: number | null;
      finalUrl?: string | null;
      corsAllowed?: boolean;
      redirected?: boolean;
      setsCookie?: boolean;
    },
  ) {
    super(message);
    this.name = 'ProbeError';
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sanitizedFailureReason(error: unknown) {
  if (error instanceof ProbeError) return error.message.slice(0, 100);
  const errorCode =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const errorMessage = error instanceof Error ? error.message : '';
  const networkSignal = `${errorCode} ${errorMessage}`.toUpperCase();
  if (/\b(?:ENOTFOUND|EAI_AGAIN|EAI_FAIL|ENODATA)\b/.test(networkSignal)) {
    return 'DNS_RESOLUTION_FAILED';
  }
  if (/\bECONNREFUSED\b/.test(networkSignal)) {
    return 'CONNECTION_REFUSED';
  }
  if (/\b(?:ECONNRESET|EPIPE)\b/.test(networkSignal)) {
    return 'CONNECTION_RESET';
  }
  if (/\b(?:ENETUNREACH|EHOSTUNREACH)\b/.test(networkSignal)) {
    return 'NETWORK_UNREACHABLE';
  }
  if (/\b(?:ETIMEDOUT|ESOCKETTIMEDOUT)\b/.test(networkSignal)) {
    return 'TIMEOUT';
  }
  if (
    /\b(?:CERT_|ERR_TLS_|UNABLE_TO_VERIFY_LEAF_SIGNATURE|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN)\b/.test(
      networkSignal,
    )
  ) {
    return 'TLS_VALIDATION_FAILED';
  }
  if (
    error instanceof Error &&
    [
      'UNSAFE_UPSTREAM_URL',
      'PRIVATE_UPSTREAM_HOST',
      'UPSTREAM_REDIRECT_REJECTED',
      'UPSTREAM_REQUEST_BODY_UNSUPPORTED',
      'INVALID_UPSTREAM_STATUS',
      'UPSTREAM_CONNECTION_FAILED',
    ].includes(error.message)
  ) {
    return error.message;
  }
  return 'CONNECTION_FAILED';
}

async function cancelBody(response: Response) {
  if (!response.body || response.body.locked) return;
  try {
    await response.body.cancel();
  } catch {
    // The socket may already be closed by the remote server.
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetcher: UpstreamFetcher,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetcher(new URL(url), {
    ...init,
    signal: controller.signal,
  }).catch((error) => {
    clearTimeout(timeout);
    throw error;
  });
  return {
    response,
    release: () => clearTimeout(timeout),
  };
}

async function readManifest(response: Response) {
  if (!response.body) return '';
  const advertisedLength = Number(response.headers.get('content-length'));
  if (
    Number.isFinite(advertisedLength) &&
    advertisedLength > MAX_MANIFEST_BYTES
  ) {
    throw new ProbeError('MANIFEST_TOO_LARGE', {
      retryable: false,
      temporary: false,
      httpStatus: response.status,
      finalUrl: response.url,
      redirected: response.redirected,
      setsCookie: response.headers.has('set-cookie'),
    });
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
      if (byteCount > MAX_MANIFEST_BYTES) {
        throw new ProbeError('MANIFEST_TOO_LARGE', {
          retryable: false,
          temporary: false,
          httpStatus: response.status,
          finalUrl: response.url,
          redirected: response.redirected,
          setsCookie: response.headers.has('set-cookie'),
        });
      }
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
    return content;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Reading to EOF already releases the connection.
    }
  }
}

function isHtml(contentType: string, content: string) {
  return (
    contentType.toLowerCase().includes('text/html') ||
    /^\s*(?:<!doctype\s+html|<html|<head|<body)/i.test(content)
  );
}

function corsAllowed(response: Response, origin: string) {
  const header = response.headers.get('access-control-allow-origin');
  const allowed = header?.split(',').map((value) => value.trim().toLowerCase()) ?? [];
  return allowed.includes('*') || allowed.includes(origin.toLowerCase());
}

function firstMediaReference(manifest: string) {
  const lines = manifest.split(/\r?\n/).map((line) => line.trim());
  const firstReference = lines.find((line) => line.length > 0 && !line.startsWith('#'));
  return {
    reference: firstReference ?? null,
    isMaster: lines.some((line) => line.startsWith('#EXT-X-STREAM-INF')),
  };
}

function assertHttpResponse(response: Response) {
  if (response.ok) return;

  const unauthorized = response.status === 401 || response.status === 403;
  throw new ProbeError(
    unauthorized ? 'TOKEN_EXPIRED_OR_FORBIDDEN' : `HTTP_${response.status}`,
    {
      retryable: RETRYABLE_HTTP_STATUSES.has(response.status),
      temporary: unauthorized || RETRYABLE_HTTP_STATUSES.has(response.status),
      httpStatus: response.status,
      finalUrl: response.url,
      redirected: response.redirected,
      setsCookie: response.headers.has('set-cookie'),
    },
  );
}

async function fetchManifest(
  url: string,
  requestInit: RequestInit,
  timeoutMs: number,
  origin: string,
  fetcher: UpstreamFetcher,
) {
  const timedResponse = await fetchWithTimeout(url, requestInit, timeoutMs, fetcher);
  const { response } = timedResponse;
  try {
    assertHttpResponse(response);
    const manifest = await readManifest(response);
    const contentType = response.headers.get('content-type') || '';
    if (isHtml(contentType, manifest)) {
      throw new ProbeError(response.redirected ? 'REDIRECTED_TO_HTML' : 'HTML_RESPONSE', {
        retryable: false,
        temporary: false,
        httpStatus: response.status,
        finalUrl: response.url,
        corsAllowed: corsAllowed(response, origin),
        redirected: response.redirected,
        setsCookie: response.headers.has('set-cookie'),
      });
    }
    if (!/^\s*#EXTM3U(?:\s|$)/i.test(manifest)) {
      throw new ProbeError('INVALID_HLS_MANIFEST', {
        retryable: false,
        temporary: false,
        httpStatus: response.status,
        finalUrl: response.url,
        corsAllowed: corsAllowed(response, origin),
        redirected: response.redirected,
        setsCookie: response.headers.has('set-cookie'),
      });
    }
    return {
      manifest,
      responseUrl: response.url || url,
      httpStatus: response.status,
      corsAllowed: corsAllowed(response, origin),
      redirected: response.redirected,
      setsCookie: response.headers.has('set-cookie'),
    };
  } finally {
    await cancelBody(response);
    timedResponse.release();
  }
}

type ResolvedHlsCheckOptions = Required<Omit<HlsCheckOptions, 'fetcher'>> & {
  fetcher: UpstreamFetcher;
};

async function probeOnce(url: string, options: ResolvedHlsCheckOptions) {
  const requestInit: RequestInit = {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
      Origin: options.origin,
      'User-Agent': options.userAgent,
    },
  };
  const root = await fetchManifest(
    url,
    requestInit,
    options.timeoutMs,
    options.origin,
    options.fetcher,
  );
  let media = root;
  let reference = firstMediaReference(media.manifest);

  if (reference.isMaster) {
    if (!reference.reference) {
      throw new ProbeError('MASTER_WITHOUT_VARIANT', {
        retryable: false,
        temporary: false,
        httpStatus: root.httpStatus,
        finalUrl: root.responseUrl,
        corsAllowed: root.corsAllowed,
        redirected: root.redirected,
        setsCookie: root.setsCookie,
      });
    }
    media = await fetchManifest(
      new URL(reference.reference, root.responseUrl).toString(),
      requestInit,
      options.timeoutMs,
      options.origin,
      options.fetcher,
    );
    reference = firstMediaReference(media.manifest);
  }

  if (!reference.reference || reference.isMaster) {
    const manifestsAllowCors = root.corsAllowed && media.corsAllowed;
    throw new ProbeError('MANIFEST_WITHOUT_SEGMENT', {
      retryable: false,
      temporary: false,
      httpStatus: media.httpStatus,
      finalUrl: media.responseUrl,
      corsAllowed: manifestsAllowCors,
      redirected: root.redirected || media.redirected,
      setsCookie: root.setsCookie || media.setsCookie,
    });
  }

  const segmentUrl = new URL(reference.reference, media.responseUrl).toString();
  const timedSegment = await fetchWithTimeout(
    segmentUrl,
    {
      ...requestInit,
      headers: { ...requestInit.headers, Range: 'bytes=0-1023' },
    },
    options.timeoutMs,
    options.fetcher,
  );
  const { response: segmentResponse } = timedSegment;
  const browserCorsAllowed =
    root.corsAllowed &&
    media.corsAllowed &&
    corsAllowed(segmentResponse, options.origin);
  try {
    assertHttpResponse(segmentResponse);
    const contentType = segmentResponse.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('text/html')) {
      throw new ProbeError('HTML_SEGMENT_RESPONSE', {
        retryable: false,
        temporary: false,
        httpStatus: segmentResponse.status,
        finalUrl: segmentResponse.url,
        corsAllowed: browserCorsAllowed,
        redirected: root.redirected || media.redirected || segmentResponse.redirected,
        setsCookie:
          root.setsCookie ||
          media.setsCookie ||
          segmentResponse.headers.has('set-cookie'),
      });
    }
  } finally {
    await cancelBody(segmentResponse);
    timedSegment.release();
  }

  const mixedContent = url.startsWith('http://');
  return {
    available: true,
    playableStatus: !mixedContent && browserCorsAllowed ? 'BROWSER_OK' : 'VLC_ONLY',
    temporaryFailure: false,
    corsAllowed: browserCorsAllowed,
    mixedContent,
    httpStatus: root.httpStatus,
    failureReason: null,
    finalUrl: root.responseUrl,
    redirected: root.redirected || media.redirected || segmentResponse.redirected,
    setsCookie:
      root.setsCookie ||
      media.setsCookie ||
      segmentResponse.headers.has('set-cookie'),
  } satisfies Omit<HlsCheckResult, 'attempts'>;
}

export async function checkHlsStream(
  url: string,
  options: HlsCheckOptions,
): Promise<HlsCheckResult> {
  const resolvedOptions: ResolvedHlsCheckOptions = {
    timeoutMs: options.timeoutMs,
    retries: options.retries,
    backoffBaseMs: options.backoffBaseMs ?? 250,
    origin: options.origin ?? 'http://localhost:3000',
    userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
    fetcher: options.fetcher ?? safeUpstreamFetch,
  };
  const mixedContent = url.startsWith('http://');

  for (let attempt = 1; attempt <= resolvedOptions.retries + 1; attempt += 1) {
    try {
      return { ...(await probeOnce(url, resolvedOptions)), attempts: attempt };
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      const details =
        error instanceof ProbeError
          ? error.details
          : {
              retryable: true,
              temporary: true,
              httpStatus: null,
              finalUrl: null,
              corsAllowed: false,
              redirected: false,
              setsCookie: false,
            };
      const retryable = aborted || details.retryable;

      if (retryable && attempt <= resolvedOptions.retries) {
        await delay(resolvedOptions.backoffBaseMs * 2 ** (attempt - 1));
        continue;
      }

      return {
        available: false,
        playableStatus: null,
        temporaryFailure: aborted || details.temporary,
        corsAllowed: details.corsAllowed ?? false,
        mixedContent,
        httpStatus: details.httpStatus ?? null,
        failureReason: aborted
          ? 'TIMEOUT'
          : sanitizedFailureReason(error),
        finalUrl: details.finalUrl ?? null,
        redirected: details.redirected ?? false,
        setsCookie: details.setsCookie ?? false,
        attempts: attempt,
      };
    }
  }

  throw new Error('Unreachable verification state');
}
