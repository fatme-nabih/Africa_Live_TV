import 'server-only';

import { recordRateLimitAlert } from './abuse-alerts';
import { requestQuotaPolicies } from './quota-policy';
import { consumeRateLimits } from './rate-limit';
import { structuredLog } from './structured-log';

export async function consumeAdditionalRequestQuota({
  userId,
  clerkSessionId,
  networkFingerprint,
  bucket,
  userLimit,
  windowSeconds = 60,
}: {
  userId: string;
  clerkSessionId: string | null;
  networkFingerprint: string | null;
  bucket: string;
  userLimit: number;
  windowSeconds?: number;
}) {
  const result = await consumeRateLimits(
    requestQuotaPolicies({
      userId,
      clerkSessionId,
      networkFingerprint,
      bucket,
      userLimit,
      windowSeconds,
    }),
  );
  if (!result.allowed && result.denied) {
    try {
      await recordRateLimitAlert({ userId, result: result.denied });
    } catch (error) {
      structuredLog('error', 'abuse.request_alert_failed', {
        userId,
        bucket: result.denied.bucket,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }
  return result;
}
