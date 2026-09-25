export const TRIAL_DURATION_DAYS = 5;
export const PAYMENT_GRACE_DAYS = 3;

export type AccessStatus =
  | 'anonymous'
  | 'trial'
  | 'active'
  | 'grace'
  | 'expired'
  | 'past_due'
  | 'blocked';

export type AccessUser = {
  status: string;
  trialEndsAt: string;
};

export type AccessSubscription = {
  status: string;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
};

export type AccessDecision = {
  status: AccessStatus;
  hasAccess: boolean;
  expiresAt: string | null;
  reason: string;
};

function asTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
function addDays(value: string | null, days: number) {
  const time = asTime(value);
  return time == null ? null : time + days * 24 * 60 * 60 * 1000;
}

function iso(value: number | null) {
  return value == null ? null : new Date(value).toISOString();
}

export function evaluateAccess(
  user: AccessUser | null,
  subscriptions: AccessSubscription[],
  now = new Date(),
): AccessDecision {
  if (!user) {
    return {
      status: 'anonymous',
      hasAccess: false,
      expiresAt: null,
      reason: 'authentication_required',
    };
  }

  if (user.status === 'blocked' || user.status === 'deleted') {
    return {
      status: 'blocked',
      hasAccess: false,
      expiresAt: null,
      reason: user.status === 'deleted' ? 'identity_deleted' : 'identity_blocked',
    };
  }

  const nowTime = now.getTime();
  let pastDueSeen = false;
  let latestGraceEnd: number | null = null;

  for (const subscription of subscriptions) {
    const periodEnd = asTime(subscription.currentPeriodEnd);
    const providerTrialEnd = asTime(subscription.trialEndsAt);
    const effectiveEnd = subscription.status === 'trialing' ? providerTrialEnd ?? periodEnd : periodEnd;

    if (
      ['active', 'trialing', 'canceled'].includes(subscription.status) &&
      (effectiveEnd == null || effectiveEnd > nowTime)
    ) {
      return {
        status: 'active',
        hasAccess: true,
        expiresAt: iso(effectiveEnd),
        reason:
          subscription.status === 'canceled'
            ? 'subscription_paid_until_period_end'
            : 'subscription_active',
      };
    }

    if (subscription.status === 'past_due') pastDueSeen = true;
    if (subscription.status === 'active' || subscription.status === 'past_due') {
      const graceEnd =
        asTime(subscription.graceEndsAt) ?? addDays(subscription.currentPeriodEnd, PAYMENT_GRACE_DAYS);
      if (graceEnd != null && graceEnd > nowTime) {
        latestGraceEnd = Math.max(latestGraceEnd ?? 0, graceEnd);
      }
    }
  }

  if (latestGraceEnd != null) {
    return {
      status: 'grace',
      hasAccess: true,
      expiresAt: iso(latestGraceEnd),
      reason: 'payment_grace_period',
    };
  }

  if (pastDueSeen) {
    return {
      status: 'past_due',
      hasAccess: false,
      expiresAt: null,
      reason: 'payment_overdue',
    };
  }

  if (subscriptions.length > 0) {
    return {
      status: 'expired',
      hasAccess: false,
      expiresAt: null,
      reason: 'subscription_expired',
    };
  }

  const trialEnd = asTime(user.trialEndsAt);
  if (trialEnd != null && trialEnd > nowTime) {
    return {
      status: 'trial',
      hasAccess: true,
      expiresAt: iso(trialEnd),
      reason: 'trial_active',
    };
  }

  return {
    status: 'expired',
    hasAccess: false,
    expiresAt: iso(trialEnd),
    reason: 'trial_expired',
  };
}
