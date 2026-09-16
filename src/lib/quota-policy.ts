import type { AccessDecision } from './access-policy';
import type { RateLimitPolicy } from './rate-limit';

export type AccessQuotaTier = 'subscriber' | 'trial' | 'grace';
export type ResolutionQuotaDestination = 'web' | 'vlc-mobile' | 'vlc-local';

type QuotaSubjects = {
  userId: string;
  clerkSessionId: string | null;
  networkFingerprint: string | null;
};

type ResolutionQuotaInput = QuotaSubjects & {
  destination: ResolutionQuotaDestination;
  tier: AccessQuotaTier;
  channelId: string;
};

const RESOLUTION_LIMITS = {
  subscriber: {
    web: { minute: 30, hour: 180, session: 20, network: 90, channel: 8 },
    'vlc-mobile': { minute: 20, hour: 100, session: 12, network: 60, channel: 6 },
    'vlc-local': { minute: 12, hour: 60, session: 8, network: 36, channel: 4 },
  },
  trial: {
    web: { minute: 10, hour: 40, session: 8, network: 30, channel: 4 },
    'vlc-mobile': { minute: 6, hour: 24, session: 5, network: 18, channel: 3 },
    'vlc-local': { minute: 4, hour: 16, session: 3, network: 12, channel: 2 },
  },
  grace: {
    web: { minute: 10, hour: 40, session: 8, network: 30, channel: 4 },
    'vlc-mobile': { minute: 6, hour: 24, session: 5, network: 18, channel: 3 },
    'vlc-local': { minute: 4, hour: 16, session: 3, network: 12, channel: 2 },
  },
} as const satisfies Record<
  AccessQuotaTier,
  Record<
    ResolutionQuotaDestination,
    { minute: number; hour: number; session: number; network: number; channel: number }
  >
>;

export function quotaTierForAccess(decision: AccessDecision): AccessQuotaTier {
  if (!decision.hasAccess) {
    throw new TypeError('A quota tier cannot be assigned without application access.');
  }
  if (decision.status === 'trial') return 'trial';
  if (decision.status === 'grace') return 'grace';
  return 'subscriber';
}

export function requestQuotaPolicies({
  bucket,
  userLimit,
  windowSeconds = 60,
  userId,
  clerkSessionId,
  networkFingerprint,
}: QuotaSubjects & {
  bucket: string;
  userLimit: number;
  windowSeconds?: number;
}): RateLimitPolicy[] {
  const policies: RateLimitPolicy[] = [
    {
      bucket,
      dimension: 'user',
      subject: userId,
      limit: userLimit,
      windowSeconds,
    },
  ];
  if (clerkSessionId) {
    policies.push({
      bucket,
      dimension: 'session',
      subject: clerkSessionId,
      limit: Math.max(1, Math.ceil(userLimit * 0.8)),
      windowSeconds,
    });
  }
  if (networkFingerprint) {
    policies.push({
      bucket,
      dimension: 'network',
      subject: networkFingerprint,
      limit: userLimit * 3,
      windowSeconds,
    });
  }
  return policies;
}

export function resolutionQuotaPolicies({
  destination,
  tier,
  channelId,
  userId,
  clerkSessionId,
  networkFingerprint,
}: ResolutionQuotaInput): RateLimitPolicy[] {
  const limits = RESOLUTION_LIMITS[tier][destination];
  const bucket = `playback.resolve.${destination}.${tier}`;
  const policies: RateLimitPolicy[] = [
    {
      bucket,
      dimension: 'user',
      subject: userId,
      limit: limits.minute,
      windowSeconds: 60,
    },
    {
      bucket,
      dimension: 'user',
      subject: userId,
      limit: limits.hour,
      windowSeconds: 60 * 60,
    },
    {
      bucket,
      dimension: 'channel',
      subject: `${userId}:${channelId}`,
      limit: limits.channel,
      windowSeconds: 10 * 60,
    },
  ];
  if (clerkSessionId) {
    policies.push({
      bucket,
      dimension: 'session',
      subject: clerkSessionId,
      limit: limits.session,
      windowSeconds: 60,
    });
  }
  if (networkFingerprint) {
    policies.push({
      bucket,
      dimension: 'network',
      subject: networkFingerprint,
      limit: limits.network,
      windowSeconds: 60,
    });
  }
  return policies;
}
