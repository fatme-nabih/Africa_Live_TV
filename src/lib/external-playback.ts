export type MobilePlatform = 'android' | 'ios' | null;

export function detectMobilePlatform(userAgent: string, maxTouchPoints = 0): MobilePlatform {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('android')) return 'android';
  if (/iphone|ipad|ipod/.test(normalized) || (normalized.includes('macintosh') && maxTouchPoints > 1)) return 'ios';
  return null;
}

export function buildMobileVlcUrl(
  streamUrl: string,
  platform: Exclude<MobilePlatform, null>,
) {
  const parsed = new URL(streamUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Unsupported mobile stream protocol.');
  }
  if (platform === 'ios') {
    return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
  }

  const scheme = parsed.protocol.slice(0, -1);
  const fragment = parsed.hash ? `%23${encodeURIComponent(parsed.hash.slice(1))}` : '';
  const target = `${parsed.host}${parsed.pathname}${parsed.search}${fragment}`;
  return `intent://${target}#Intent;scheme=${scheme};package=org.videolan.vlc;type=video/*;end`;
}
