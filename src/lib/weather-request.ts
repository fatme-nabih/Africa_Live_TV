export const WEATHER_INTERNAL_TIMEOUT_MS = 20_000;
export const WEATHER_DIRECT_TIMEOUT_MS = 8_000;
export const MAX_WEATHER_BYTES = 100_000;

export class WeatherRequestError extends Error {
  constructor(message: string, readonly status = 0, readonly retryAt = 0) {
    super(message);
  }
}

export async function readWeatherJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_WEATHER_BYTES) {
    await response.body?.cancel();
    throw new Error('Réponse météo trop volumineuse.');
  }
  if (!response.body) throw new Error('Réponse météo vide.');
  const reader = response.body.getReader();
  // Fetch may have already errored the stream when this abort listener runs.
  // Preserve the original abort reason without leaving cancel's rejection unhandled.
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  let bytes = 0;
  let text = '';
  const decoder = new TextDecoder();
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_WEATHER_BYTES) {
        await reader.cancel();
        throw new Error('Réponse météo trop volumineuse.');
      }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

// Deadline includes fetch AND body consumption, and is cleared on every exit.
export async function weatherDeadline<T>(parent: AbortSignal, timeoutMs: number,
  action: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  parent.addEventListener('abort', abort, { once: true });
  if (parent.aborted) abort();
  const timer = setTimeout(() => controller.abort(new DOMException('Délai météo dépassé.', 'TimeoutError')), timeoutMs);
  let onAbort: () => void = () => {};
  try {
    const cancelled = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      if (controller.signal.aborted) onAbort();
    });
    controller.signal.throwIfAborted();
    return await Promise.race([action(controller.signal), cancelled]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', onAbort);
  }
}

export function retryAfterAt(value: string | null, now = Date.now()) {
  if (!value) return now + 60_000;
  const seconds = /^\d+$/.test(value) ? Number(value) : NaN;
  const at = Number.isFinite(seconds) ? now + seconds * 1000 : Date.parse(value);
  return Number.isFinite(at) ? Math.max(now, at) : now + 60_000;
}

export async function requestAuthorizedWeather<T>(code: string, parent: AbortSignal,
  parse: (value: unknown) => T, direct: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const result = await weatherDeadline<{ kind: 'snapshot'; snapshot: T } | { kind: 'fallback' }>(parent, WEATHER_INTERNAL_TIMEOUT_MS, async signal => {
    const response = await fetch(`/api/live/weather?code=${encodeURIComponent(code)}`, {
      cache: 'no-store', redirect: 'error', signal,
    });
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      throw new WeatherRequestError(response.status === 401
        ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
        : 'Votre compte ne permet pas cet accès. Consultez votre abonnement.', response.status);
    }
    if (response.status === 429) {
      await response.body?.cancel();
      throw new WeatherRequestError('Trop de demandes météo. Réessayez après le délai indiqué.', 429,
        retryAfterAt(response.headers.get('retry-after')));
    }
    if (response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      throw new WeatherRequestError('Réponse météo interne non reconnue.');
    }
    const body = await readWeatherJson(response, signal);
    if (response.ok) return { kind: 'snapshot', snapshot: parse(body) };
    if (response.status === 503 && body && typeof body === 'object' && !Array.isArray(body)
      && 'code' in body && body.code === 'LIVE_WEATHER_UNAVAILABLE'
      && 'error' in body && typeof body.error === 'string') return { kind: 'fallback' };
    throw new WeatherRequestError('Données météo momentanément indisponibles.', response.status);
  });
  if (result.kind === 'snapshot') return result.snapshot;
  return weatherDeadline(parent, WEATHER_DIRECT_TIMEOUT_MS, direct);
}
