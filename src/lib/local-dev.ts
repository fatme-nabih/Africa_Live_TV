import { isLoopbackAddress } from './local-request';

export const LOCAL_USER_ID = 'africa-live-local-user';

export function isLocalDevMode() {
  return process.env.LOCAL_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
}

export function isLocalDevRequest(request: Request) {
  try {
    const url = new URL(request.url);
    if (!isLoopbackAddress(url.hostname)) return false;
    const host = request.headers.get('host');
    if (!host || new URL(`http://${host}`).host !== url.host) return false;
    for (const name of ['x-forwarded-host', 'x-forwarded-for', 'x-real-ip', 'cf-connecting-ip']) {
      const value = request.headers.get(name);
      if (value && value.split(',').some(part => !isLoopbackAddress(name === 'x-forwarded-host' ? new URL(`http://${part.trim()}`).hostname : part.trim()))) return false;
    }
    if (request.headers.has('forwarded')) return false;
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') return false;
    const origin = request.headers.get('origin');
    if (origin && origin !== url.origin) return false;
    if (!['GET', 'HEAD'].includes(request.method) && origin !== url.origin) return false;
    return true;
  } catch {
    return false;
  }
}
