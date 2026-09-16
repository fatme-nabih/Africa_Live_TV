function stripAddressDecoration(value: string) {
  const normalized = value.trim().replace(/^for=/i, '').replace(/^"|"$/g, '');
  if (normalized.startsWith('[')) return normalized.slice(1, normalized.indexOf(']'));
  const withoutMappedPrefix = normalized.replace(/^::ffff:/i, '');
  return withoutMappedPrefix.includes(':') && !withoutMappedPrefix.includes('.')
    ? withoutMappedPrefix
    : withoutMappedPrefix.replace(/:\d+$/, '');
}

export function isLoopbackAddress(value: string) {
  const address = stripAddressDecoration(value).toLowerCase();
  if (address === '::1' || address === 'localhost') return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(address);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) && octets[0] === 127;
}

function forwardedAddresses(headers: Headers) {
  const addresses = [
    ...(headers.get('x-forwarded-for')?.split(',') ?? []),
    ...(headers.get('x-real-ip')?.split(',') ?? []),
    ...(headers.get('cf-connecting-ip')?.split(',') ?? []),
    ...(headers.get('forwarded')?.split(';').filter((part) => /^\s*for=/i.test(part)) ?? []),
  ].map((value) => value.trim()).filter(Boolean);
  return addresses;
}

export function isTrustedLocalRequest(request: Request) {
  const requestUrl = new URL(request.url);
  if (!isLoopbackAddress(requestUrl.hostname)) return false;

  const forwardedHosts = request.headers.get('x-forwarded-host')?.split(',') ?? [];
  if (
    forwardedHosts.some((host) => {
      try {
        return !isLoopbackAddress(new URL(`http://${host.trim()}`).hostname);
      } catch {
        return true;
      }
    })
  ) {
    return false;
  }

  const originValue = request.headers.get('origin');
  if (!originValue) return false;
  let origin: URL;
  try {
    origin = new URL(originValue);
  } catch {
    return false;
  }
  if (!isLoopbackAddress(origin.hostname) || origin.origin !== requestUrl.origin) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') return false;

  const forwarded = forwardedAddresses(request.headers);
  return forwarded.every(isLoopbackAddress);
}
