import { NextResponse } from 'next/server';
import { isLocalDevMode, isLocalDevRequest } from './local-dev';

import { getCurrentAccessDecision } from '@/lib/access-control';
import { canBrowseCatalog } from '@/lib/access-policy';
import {
  getActiveAbuseSuspension,
  recordRateLimitAlert,
} from '@/lib/abuse-alerts';
import { getAbuseRequestContext } from '@/lib/abuse-request-context';
import { quotaTierForAccess, requestQuotaPolicies } from '@/lib/quota-policy';
import { consumeRateLimits } from '@/lib/rate-limit';
import { structuredLog } from '@/lib/structured-log';

type AuthorizationOptions = {
  bucket: string;
  limit: number;
  windowSeconds?: number;
};

async function authorizeRequest(
  options: AuthorizationOptions,
  request?: Request,
  requireSubscription = true,
) {
  if (isLocalDevMode() && request && !isLocalDevRequest(request)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Accès local uniquement.' }, { status: 403 }) };
  }
  const access = await getCurrentAccessDecision();

  if (!access.user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Authentification requise.',
          code: 'AUTHENTICATION_REQUIRED',
          accessStatus: access.decision.status,
        },
        { status: 401 },
      ),
    };
  }

  if (access.decision.status === 'blocked' || (!requireSubscription && !canBrowseCatalog(access.decision))) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Ce compte ne peut pas accéder à l’application.', code: 'ACCOUNT_BLOCKED' },
        { status: 403 },
      ),
    };
  }

  if (requireSubscription && !access.decision.hasAccess) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Un abonnement actif est requis.',
          code: 'SUBSCRIPTION_REQUIRED',
          accessStatus: access.decision.status,
          reason: access.decision.reason,
        },
        { status: 403 },
      ),
    };
  }

  const activeSuspension = await getActiveAbuseSuspension(access.user.id);
  if (activeSuspension) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          error: 'Ce compte nécessite une revue avant de pouvoir continuer.',
          code: 'ABUSE_REVIEW_REQUIRED',
        },
        { status: 403 },
      ),
    };
  }

  const abuseContext = request
    ? getAbuseRequestContext(request)
    : { networkFingerprint: null, trustedProxyHeader: null };
  const rateLimit = await consumeRateLimits(requestQuotaPolicies({
    bucket: options.bucket,
    userLimit: options.limit,
    windowSeconds: options.windowSeconds,
    userId: access.user.id,
    clerkSessionId: access.clerkSessionId,
    networkFingerprint: abuseContext.networkFingerprint,
  }));
  if (!rateLimit.allowed) {
    if (rateLimit.denied) {
      try {
        await recordRateLimitAlert({
          userId: access.user.id,
          result: rateLimit.denied,
        });
      } catch (error) {
        structuredLog('error', 'abuse.rate_limit_alert_failed', {
          userId: access.user.id,
          bucket: rateLimit.denied.bucket,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      }
    }
    const denied = rateLimit.denied;
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.', code: 'RATE_LIMITED' },
        {
          status: 429,
          headers: {
            'Retry-After': String(denied?.retryAfterSeconds ?? 60),
            'X-RateLimit-Limit': String(denied?.limit ?? options.limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      ),
    };
  }

  return {
    ok: true as const,
    ...access,
    abuseContext,
    quotaTier: access.decision.hasAccess ? quotaTierForAccess(access.decision) : null,
    rateLimit,
  };
}

type AuthorizedAppRequest = Exclude<Awaited<ReturnType<typeof authorizeRequest>>, { ok: false }> & {
  quotaTier: NonNullable<Exclude<Awaited<ReturnType<typeof authorizeRequest>>, { ok: false }>['quotaTier']>;
};

export async function authorizeAppRequest(
  options: AuthorizationOptions,
  request?: Request,
) {
  const result = await authorizeRequest(options, request, true);
  if (!result.ok) return result;
  if (!result.quotaTier) throw new Error('An active application entitlement must have a quota tier.');
  return { ...result, quotaTier: result.quotaTier } satisfies AuthorizedAppRequest;
}

export function authorizeCatalogRequest(
  options: AuthorizationOptions,
  request?: Request,
) {
  return authorizeRequest(options, request, false);
}
