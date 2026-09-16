import 'server-only';

import { recordRateLimitAlert } from './abuse-alerts';
import {
  resolutionQuotaPolicies,
  type AccessQuotaTier,
  type ResolutionQuotaDestination,
} from './quota-policy';
import { consumeRateLimits } from './rate-limit';
import { structuredLog } from './structured-log';

export async function consumePlaybackResolutionQuota({
  userId,
  clerkSessionId,
  networkFingerprint,
  channelId,
  destination,
  tier,
}: {
  userId: string;
  clerkSessionId: string | null;
  networkFingerprint: string | null;
  channelId: string;
  destination: ResolutionQuotaDestination;
  tier: AccessQuotaTier;
}) {
  const result = await consumeRateLimits(
    resolutionQuotaPolicies({
      userId,
      clerkSessionId,
      networkFingerprint,
      channelId,
      destination,
      tier,
    }),
  );
  if (!result.allowed && result.denied) {
    try {
      await recordRateLimitAlert({ userId, result: result.denied });
    } catch (error) {
      structuredLog('error', 'abuse.playback_alert_failed', {
        userId,
        bucket: result.denied.bucket,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
  return result;
}
