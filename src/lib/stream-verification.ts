import { createDecipheriv } from 'node:crypto';
import { safeUpstreamFetch, upstreamResponseUrlChain } from './safe-upstream-fetch';
import { parseHlsProbeResources, mediaSampleEvidence, type HlsResource, type HlsKey, type MediaEvidence } from './hls-probe-resources';

const MAX_MANIFEST_BYTES = 1024 * 1024;
export const MAX_MEDIA_SAMPLE_BYTES = 4096;
export const DEFAULT_PROBE_BUDGET_MS = 60_000;
const RETRYABLE = new Set([408,425,429,500,502,503,504]);
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
export type UpstreamFetcher = (url: URL, init: RequestInit) => Promise<Response>;
export type HlsCheckOptions = { timeoutMs: number; retries: number; backoffBaseMs?: number; origin?: string; userAgent?: string; fetcher?: UpstreamFetcher; totalBudgetMs?: number };
export type HlsCheckResult = {
  available: boolean; playableStatus: 'BROWSER_OK'|'VLC_ONLY'|null; temporaryFailure: boolean;
  corsAllowed: boolean; mixedContent: boolean; httpStatus: number|null; failureReason: string|null;
  finalUrl: string|null; redirected: boolean; setsCookie: boolean; attempts: number;
  evidence?: 'valid'|'invalid'|'incomplete'|'network';
};
class ProbeError extends Error {
  constructor(readonly code: string, readonly evidence: 'invalid'|'incomplete'|'network', readonly temporary = false, readonly retryable = false) { super(code); }
}
function waitFor<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException('deadline', 'AbortError'));
  let abort!: () => void;
  const deadline = new Promise<never>((_, reject) => {
    abort = () => reject(new DOMException('deadline', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
  });
  return Promise.race([operation, deadline]).finally(() => signal.removeEventListener('abort', abort));
}
async function sample(response: Response, maximum: number, signal: AbortSignal) {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const pieces: Uint8Array[] = []; let length = 0;
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    while (length < maximum) {
      const { done, value } = await waitFor(reader.read(), signal);
      if (done) break;
      const piece = value.slice(0, maximum - length);
      pieces.push(piece); length += piece.length;
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const piece of pieces) { bytes.set(piece, offset); offset += piece.length; }
    return bytes;
  } finally {
    signal.removeEventListener('abort', cancel); cancel(); reader.releaseLock();
  }
}
function safeReason(error: unknown) {
  if (error instanceof ProbeError) return error.code;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if (/ENOTFOUND|EAI_AGAIN|EAI_FAIL|ENODATA/.test(code + message)) return 'DNS_RESOLUTION_FAILED';
  if (/ECONNREFUSED/.test(code + message)) return 'CONNECTION_REFUSED';
  if (/ECONNRESET|EPIPE/.test(code + message)) return 'CONNECTION_RESET';
  if (/ENETUNREACH|EHOSTUNREACH/.test(code + message)) return 'NETWORK_UNREACHABLE';
  if (/ETIMEDOUT|ESOCKETTIMEDOUT/.test(code + message)) return 'TIMEOUT';
  if (/CERT_|ERR_TLS_|UNABLE_TO_VERIFY|SELF_SIGNED/.test(code + message)) return 'TLS_VALIDATION_FAILED';
  return ['UNSAFE_UPSTREAM_URL','PRIVATE_UPSTREAM_HOST','UPSTREAM_REDIRECT_REJECTED','UPSTREAM_REQUEST_BODY_UNSUPPORTED','INVALID_UPSTREAM_STATUS','UPSTREAM_CONNECTION_FAILED'].includes(message) ? message : 'CONNECTION_FAILED';
}
function resourceUrl(uri: string, base: string) {
  const value = new URL(uri, base);
  if (!uri || value.href.length > 4096 || !['http:', 'https:'].includes(value.protocol) || value.username || value.password) throw new ProbeError('UNSAFE_UPSTREAM_URL', 'incomplete');
  return value.href;
}

export async function checkHlsStream(url: string, options: HlsCheckOptions): Promise<HlsCheckResult> {
  const fetcher = options.fetcher ?? safeUpstreamFetch;
  const origin = options.origin ?? 'http://localhost:3001';
  const budget = new AbortController();
  const timer = setTimeout(() => budget.abort(), options.totalBudgetMs ?? DEFAULT_PROBE_BUDGET_MS);
  let attempts = 0;
  const facts = { corsAllowed: true, mixedContent: false, httpStatus: null as number|null, finalUrl: null as string|null, redirected: false, setsCookie: false };
  const headers = { Accept: 'application/vnd.apple.mpegurl, */*', Origin: origin, 'User-Agent': options.userAgent ?? DEFAULT_USER_AGENT };
  async function request<T>(target: string, role: string, read: (response: Response, signal: AbortSignal) => Promise<T>, extraHeaders: Record<string,string> = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    budget.signal.addEventListener('abort', abort, { once: true });
    if (budget.signal.aborted) abort();
    const deadline = setTimeout(abort, options.timeoutMs);
    let response: Response | undefined;
    try {
      const operation = fetcher(new URL(target), { method: 'GET', headers: { ...headers, ...extraHeaders }, signal: controller.signal });
      void operation.then(late => { if (controller.signal.aborted && !late.body?.locked) void late.body?.cancel().catch(() => {}); }).catch(() => {});
      response = await waitFor(operation, controller.signal);
      const chain = [target, response.url || target, ...upstreamResponseUrlChain(response)];
      facts.mixedContent ||= chain.some(value => new URL(value).protocol === 'http:');
      facts.redirected ||= response.redirected || chain.some(value => value !== target);
      facts.setsCookie ||= response.headers.has('set-cookie');
      const cors = response.headers.get('access-control-allow-origin');
      facts.corsAllowed &&= cors === '*' || cors === origin;
      if (role === 'MANIFEST' && facts.finalUrl === null) { facts.finalUrl = response.url || target; facts.httpStatus = response.status; }
      if (!response.ok) {
        facts.httpStatus = response.status;
        const temporary = response.status === 401 || response.status === 403 || RETRYABLE.has(response.status);
        const code = role === 'MANIFEST' && [401,403].includes(response.status) ? 'TOKEN_EXPIRED_OR_FORBIDDEN' : (role === 'MANIFEST' ? 'HTTP_' : role + '_HTTP_') + response.status;
        throw new ProbeError(code, role !== 'MANIFEST' && !RETRYABLE.has(response.status) ? 'incomplete' : 'network', temporary, RETRYABLE.has(response.status));
      }
      return await waitFor(read(response, controller.signal), controller.signal);
    } finally {
      clearTimeout(deadline); budget.signal.removeEventListener('abort', abort);
      if (response?.body && !response.body.locked) void response.body.cancel().catch(() => {});
    }
  }
  async function manifest(target: string) {
    return request(target, 'MANIFEST', async (response, signal) => {
      const bytes = await sample(response, MAX_MANIFEST_BYTES + 1, signal);
      if (bytes.length > MAX_MANIFEST_BYTES) throw new ProbeError('MANIFEST_TOO_LARGE', 'invalid');
      const text = new TextDecoder().decode(bytes);
      if (/^\s*(?:<!doctype|<html|<head|<body)/i.test(text) || response.headers.get('content-type')?.includes('text/html')) throw new ProbeError(response.redirected ? 'REDIRECTED_TO_HTML' : 'HTML_RESPONSE', 'invalid');
      if (!/^\s*#EXTM3U(?:\s|$)/i.test(text)) throw new ProbeError('INVALID_HLS_MANIFEST', 'invalid');
      return { text, url: response.url || target };
    });
  }
  async function binary(resource: HlsResource, base: string, role: string, limit: number) {
    const range = resource.range;
    return request(resourceUrl(resource.uri, base), role, async (response, signal) => {
      const wanted = Math.min(limit,range?.length ?? limit);
      if (range) {
        const received = /^bytes (\d+)-(\d+)\/(\d+|\*)$/i.exec(response.headers.get('content-range') ?? '');
        if ((range.offset > 0 && response.status !== 206) || (response.status === 206 && (!received || Number(received[1]) !== range.offset || Number(received[2]) !== range.offset+wanted-1 || (received[3] !== '*' && Number(received[3]) <= Number(received[2]))))) throw new ProbeError('UNPROVEN_BYTE_RANGE','incomplete');
      }
      const bytes = await sample(response,wanted,signal);
      if (range && bytes.length !== wanted) throw new ProbeError('INCOMPLETE_BYTE_RANGE','incomplete');
      return { bytes, type: response.headers.get('content-type') ?? '' };
    }, role === 'KEY' ? {} : { Range: 'bytes=' + (range?.offset ?? 0) + '-' + ((range?.offset ?? 0) + Math.min(limit, range?.length ?? limit) - 1) });
  }
  try {
    for (attempts = 1; attempts <= options.retries + 1; attempts++) {
      try {
        Object.assign(facts, { corsAllowed: true, httpStatus: null, finalUrl: null });
        let media = await manifest(resourceUrl(url, url));
        const parse = (text: string) => {
          try { return parseHlsProbeResources(text); } catch { throw new ProbeError('UNSUPPORTED_HLS_STRUCTURE', 'incomplete'); }
        };
        let resources = parse(media.text);
        if (resources.variant) {
          if (resources.incomplete) throw new ProbeError('UNPROVEN_EXTERNAL_RENDITION', 'incomplete');
          media = await manifest(resourceUrl(resources.variant, media.url));
          resources = parse(media.text);
        }
        if (!resources.segment || resources.variant) throw new ProbeError('MANIFEST_WITHOUT_SEGMENT', 'incomplete');
        const keys: Uint8Array[] = [];
        const keyCache = new Map<string,Uint8Array>();
        try {
          const loadKey = async (descriptor: HlsKey|undefined) => {
            if (!descriptor) return null;
            if (descriptor.method !== 'AES-128' || descriptor.format !== 'identity') throw new ProbeError('UNSUPPORTED_HLS_ENCRYPTION', 'incomplete');
            const target = resourceUrl(descriptor.uri,media.url), cached = keyCache.get(target);
            if (cached) return cached;
            const key = (await binary(descriptor, media.url, 'KEY', 17)).bytes;
            keys.push(key);
            if (key.length !== 16) throw new ProbeError('INVALID_AES_KEY_SIZE', 'invalid');
            keyCache.set(target,key);
            return key;
          };
          const key = await loadKey(resources.key);
          const initKey = resources.initialization?.key ? await loadKey(resources.initialization.key) : null;
          const decrypt = (bytes: Uint8Array, descriptor: HlsKey|undefined, key: Uint8Array|null, initialization = false) => {
            if (!key) return bytes;
            const explicit = descriptor?.iv;
            if (initialization && !explicit) throw new ProbeError('UNPROVEN_ENCRYPTED_INITIALIZATION', 'incomplete');
            if ((explicit && !/^0x[0-9a-f]{1,32}$/i.test(explicit)) || resources.sequence >= BigInt(2) ** BigInt(128) || bytes.length < 16) throw new ProbeError('INVALID_AES_EVIDENCE', 'incomplete');
            const iv = Buffer.from((explicit ? explicit.slice(2) : resources.sequence.toString(16)).padStart(32, '0'), 'hex');
            const cipher = createDecipheriv('aes-128-cbc', key, iv); cipher.setAutoPadding(false);
            return Buffer.concat([cipher.update(bytes.subarray(0, bytes.length - bytes.length % 16)), cipher.final()]);
          };
          function assertEvidence(evidence: MediaEvidence, role: string) {
            if (evidence !== 'valid') throw new ProbeError(evidence === 'invalid' ? 'INVALID_' + role + '_CONTENT' : 'UNPROVEN_' + role + '_FORMAT', evidence);
          }
          if (resources.initialization) {
            const init = await binary(resources.initialization, media.url, 'INITIALIZATION', MAX_MEDIA_SAMPLE_BYTES);
            assertEvidence(mediaSampleEvidence(decrypt(init.bytes, resources.initialization.key,initKey,true), init.type, true), 'INITIALIZATION');
          }
          const segment = await binary(resources.segment, media.url, 'SEGMENT', MAX_MEDIA_SAMPLE_BYTES);
          const decoded = decrypt(segment.bytes,resources.key,key);
          if (!resources.initialization && ['moof','styp'].includes(new TextDecoder().decode(decoded.subarray(4,8)))) throw new ProbeError('MISSING_FMP4_INITIALIZATION', 'incomplete');
          assertEvidence(mediaSampleEvidence(decoded, segment.type), 'SEGMENT');
        } finally { for (const key of keys) key.fill(0); }
        return { ...facts, available: true, playableStatus: facts.mixedContent || !facts.corsAllowed ? 'VLC_ONLY' : 'BROWSER_OK', temporaryFailure: false, failureReason: null, attempts, evidence: 'valid' };
      } catch (error) {
        const timeout = error instanceof Error && error.name === 'AbortError';
        const reason = safeReason(error);
        const unsafe = ['UNSAFE_UPSTREAM_URL','PRIVATE_UPSTREAM_HOST','UPSTREAM_REDIRECT_REJECTED'].includes(reason);
        const retryable = !unsafe && (timeout || !(error instanceof ProbeError) || error.retryable);
        if (retryable && attempts <= options.retries && !budget.signal.aborted) {
          const delay = Math.min((options.backoffBaseMs ?? 250) * 2 ** (attempts - 1), 10_000);
          let backoff: ReturnType<typeof setTimeout> | undefined;
          try { await waitFor(new Promise<void>(resolve => { backoff = setTimeout(resolve, delay); }), budget.signal); }
          finally { clearTimeout(backoff); }
          continue;
        }
        return { ...facts, available: false, playableStatus: null, temporaryFailure: !unsafe && (timeout || !(error instanceof ProbeError) || error.temporary), failureReason: timeout ? 'TIMEOUT' : reason, attempts, evidence: error instanceof ProbeError ? error.evidence : unsafe ? 'incomplete' : 'network' };
      }
    }
    throw new Error('Unreachable probe');
  } catch {
    return { ...facts, available: false, playableStatus: null, temporaryFailure: true, failureReason: 'TIMEOUT', attempts, evidence: 'network' };
  } finally { clearTimeout(timer); }
}
