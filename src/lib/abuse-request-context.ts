import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

const TRUSTED_PROXY_HEADERS = [
  'cf-connecting-ip',
  'x-real-ip',
  'x-forwarded-for',
] as const;

type TrustedProxyHeader = (typeof TRUSTED_PROXY_HEADERS)[number];

function abuseHashSecret() {
  const configured = process.env.ABUSE_HASH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ABUSE_HASH_SECRET must contain at least 32 characters in production.');
  }
  return 'lumina-development-abuse-context-secret';
}

function configuredProxyHeader(): TrustedProxyHeader | null {
  const configured = process.env.ABUSE_TRUSTED_PROXY_HEADER?.trim().toLowerCase();
  if (!configured || configured === 'disabled') return null;
  if (
    TRUSTED_PROXY_HEADERS.includes(
      configured as TrustedProxyHeader,
    )
  ) {
    return configured as TrustedProxyHeader;
  }
  throw new Error('ABUSE_TRUSTED_PROXY_HEADER contains an unsupported value.');
}

function stripAddressDecorations(value: string) {
  const firstHop = value.split(',')[0]?.trim() ?? '';
  if (firstHop.startsWith('[')) {
    const closing = firstHop.indexOf(']');
    return closing > 0 ? firstHop.slice(1, closing) : firstHop;
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/u.test(firstHop)) {
    return firstHop.slice(0, firstHop.lastIndexOf(':'));
  }
  return firstHop.split('%')[0] ?? firstHop;
}

function ipv4Prefix(address: string) {
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return null;
  }
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}

function ipv6Hextets(address: string) {
  const [left = '', right = '', ...extra] = address.toLowerCase().split('::');
  if (extra.length > 0) return null;

  const parseSide = (side: string) =>
    side ? side.split(':').map((part) => Number.parseInt(part, 16)) : [];
  const leftParts = parseSide(left);
  const rightParts = parseSide(right);
  if (
    [...leftParts, ...rightParts].some(
      (part) => !Number.isInteger(part) || part < 0 || part > 0xffff,
    )
  ) {
    return null;
  }

  if (!address.includes('::') && leftParts.length !== 8) return null;
  const missing = 8 - leftParts.length - rightParts.length;
  if (missing < 0) return null;
  return [...leftParts, ...Array.from({ length: missing }, () => 0), ...rightParts];
}

function ipv6Prefix(address: string) {
  const hextets = ipv6Hextets(address);
  if (!hextets || hextets.length !== 8) return null;
  return `${hextets
    .slice(0, 4)
    .map((part) => part.toString(16).padStart(4, '0'))
    .join(':')}::/64`;
}

export function networkPrefixFromAddress(value: string) {
  const address = stripAddressDecorations(value);
  const version = isIP(address);
  if (version === 4) return ipv4Prefix(address);
  if (version === 6) return ipv6Prefix(address);
  return null;
}

export function getAbuseRequestContext(request: Request) {
  const header = configuredProxyHeader();
  if (!header) {
    return {
      networkFingerprint: null,
      trustedProxyHeader: null,
    };
  }

  const prefix = networkPrefixFromAddress(request.headers.get(header) ?? '');
  if (!prefix) {
    return {
      networkFingerprint: null,
      trustedProxyHeader: header,
    };
  }

  return {
    networkFingerprint: createHmac('sha256', abuseHashSecret())
      .update(`network:v1:${prefix}`)
      .digest('hex'),
    trustedProxyHeader: header,
  };
}
