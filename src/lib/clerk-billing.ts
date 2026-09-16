import type {
  BillingPaymentAttemptWebhookEvent,
  BillingSubscriptionItemWebhookEvent,
  BillingSubscriptionWebhookEvent,
} from '@clerk/nextjs/webhooks';

const MAX_ID_LENGTH = 256;
const MAX_TEXT_LENGTH = 512;
const MAX_CURRENCY_LENGTH = 16;
const MAX_SUBSCRIPTION_ITEMS = 50;
const MAX_UNIX_MILLISECONDS = 253_402_300_799_999;

const SUBSCRIPTION_EVENT_TYPES = [
  'subscription.created',
  'subscription.updated',
  'subscription.active',
  'subscription.pastDue',
] as const satisfies readonly BillingSubscriptionWebhookEvent['type'][];

const SUBSCRIPTION_ITEM_EVENT_TYPES = [
  'subscriptionItem.created',
  'subscriptionItem.updated',
  'subscriptionItem.active',
  'subscriptionItem.canceled',
  'subscriptionItem.upcoming',
  'subscriptionItem.ended',
  'subscriptionItem.abandoned',
  'subscriptionItem.incomplete',
  'subscriptionItem.pastDue',
  'subscriptionItem.freeTrialEnding',
] as const satisfies readonly BillingSubscriptionItemWebhookEvent['type'][];

const PAYMENT_ATTEMPT_EVENT_TYPES = [
  'paymentAttempt.created',
  'paymentAttempt.updated',
] as const satisfies readonly BillingPaymentAttemptWebhookEvent['type'][];

export const CLERK_BILLING_EVENT_TYPES = [
  ...SUBSCRIPTION_EVENT_TYPES,
  ...SUBSCRIPTION_ITEM_EVENT_TYPES,
  ...PAYMENT_ATTEMPT_EVENT_TYPES,
] as const;

export type ClerkBillingEventType = (typeof CLERK_BILLING_EVENT_TYPES)[number];

export type ClerkBillingSubscriptionStatus =
  | 'abandoned'
  | 'active'
  | 'canceled'
  | 'ended'
  | 'expired'
  | 'incomplete'
  | 'past_due'
  | 'upcoming';

export type ClerkBillingPaymentStatus = 'pending' | 'paid' | 'failed';

export type NormalizedClerkSubscriptionItem = {
  id: string;
  status: ClerkBillingSubscriptionStatus;
  planId: string | null;
  planSlug: string | null;
  planPeriod: 'month' | 'annual';
  periodStart: Date;
  periodEnd: Date | null;
  canceledAt: Date | null;
  pastDueAt: Date | null;
};

export type NormalizedClerkSubscriptionEvent = {
  kind: 'subscription';
  type: BillingSubscriptionWebhookEvent['type'];
  resourceId: string;
  userId: string;
  status: ClerkBillingSubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  activeAt: Date | null;
  canceledAt: Date | null;
  endedAt: Date | null;
  pastDueAt: Date | null;
  items: NormalizedClerkSubscriptionItem[];
};

export type NormalizedClerkSubscriptionItemEvent = {
  kind: 'subscription_item';
  type: BillingSubscriptionItemWebhookEvent['type'];
  resourceId: string;
  userId: string;
  item: NormalizedClerkSubscriptionItem;
};

export type NormalizedClerkPaymentAttemptEvent = {
  kind: 'payment_attempt';
  type: BillingPaymentAttemptWebhookEvent['type'];
  resourceId: string;
  userId: string;
  paymentId: string;
  statementId: string;
  status: ClerkBillingPaymentStatus;
  chargeType: 'checkout' | 'recurring';
  createdAt: Date;
  updatedAt: Date;
  billingDate: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  declineCode: string | null;
  totalAmount: number;
  currency: string;
  subscriptionItemIds: string[];
};

export type NormalizedClerkBillingEvent =
  | NormalizedClerkSubscriptionEvent
  | NormalizedClerkSubscriptionItemEvent
  | NormalizedClerkPaymentAttemptEvent;

export type ClerkBillingRejectionReason =
  | 'unsupported_event'
  | 'invalid_envelope'
  | 'invalid_payload'
  | 'unsupported_payer'
  | 'payload_too_large'
  | 'event_status_mismatch';

export type ClerkBillingNormalizationResult =
  | { ok: true; event: NormalizedClerkBillingEvent }
  | { ok: false; reason: ClerkBillingRejectionReason };

type JsonRecord = Record<string, unknown>;

class NormalizationError extends Error {
  constructor(readonly reason: Exclude<ClerkBillingRejectionReason, 'unsupported_event'>) {
    super(reason);
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredRecord(value: unknown): JsonRecord {
  if (!isRecord(value)) throw new NormalizationError('invalid_payload');
  return value;
}

function requiredString(value: unknown, maxLength = MAX_TEXT_LENGTH): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    throw new NormalizationError('invalid_payload');
  }
  return value;
}

function optionalString(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  if (value === undefined || value === null) return null;
  return requiredString(value, maxLength);
}

function requiredEnum<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== 'string' || !values.includes(value as T[number])) {
    throw new NormalizationError('invalid_payload');
  }
  return value as T[number];
}

function requiredTimestamp(value: unknown): Date {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_UNIX_MILLISECONDS
  ) {
    throw new NormalizationError('invalid_payload');
  }
  return new Date(value);
}

function optionalTimestamp(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  return requiredTimestamp(value);
}

function requiredFiniteNumber(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > Number.MAX_SAFE_INTEGER
  ) {
    throw new NormalizationError('invalid_payload');
  }
  return value;
}

function payerUserId(value: unknown): string {
  try {
    const payer = requiredRecord(value);
    if (payer.organization_id !== undefined && payer.organization_id !== null) {
      throw new NormalizationError('unsupported_payer');
    }
    return requiredString(payer.user_id, MAX_ID_LENGTH);
  } catch (error) {
    if (error instanceof NormalizationError) {
      throw new NormalizationError('unsupported_payer');
    }
    throw error;
  }
}

function normalizeItem(value: unknown): NormalizedClerkSubscriptionItem {
  const item = requiredRecord(value);
  if (item.object !== 'commerce_subscription_item') {
    throw new NormalizationError('invalid_payload');
  }

  const plan = item.plan === undefined || item.plan === null ? null : requiredRecord(item.plan);
  const declaredPlanId = optionalString(item.plan_id, MAX_ID_LENGTH);
  const embeddedPlanId = plan ? requiredString(plan.id, MAX_ID_LENGTH) : null;
  if (declaredPlanId && embeddedPlanId && declaredPlanId !== embeddedPlanId) {
    throw new NormalizationError('invalid_payload');
  }

  return {
    id: requiredString(item.id, MAX_ID_LENGTH),
    status: requiredEnum(item.status, [
      'abandoned',
      'active',
      'canceled',
      'ended',
      'expired',
      'incomplete',
      'past_due',
      'upcoming',
    ] as const),
    planId: declaredPlanId ?? embeddedPlanId,
    planSlug: plan ? requiredString(plan.slug, MAX_TEXT_LENGTH) : null,
    planPeriod: requiredEnum(item.plan_period, ['month', 'annual'] as const),
    periodStart: requiredTimestamp(item.period_start),
    periodEnd: optionalTimestamp(item.period_end),
    canceledAt: optionalTimestamp(item.canceled_at),
    pastDueAt: optionalTimestamp(item.past_due_at),
  };
}

function normalizeItems(value: unknown): NormalizedClerkSubscriptionItem[] {
  if (!Array.isArray(value)) throw new NormalizationError('invalid_payload');
  if (value.length > MAX_SUBSCRIPTION_ITEMS) {
    throw new NormalizationError('payload_too_large');
  }
  return value.map(normalizeItem);
}

function assertSubscriptionStatusMatchesEvent(
  type: BillingSubscriptionWebhookEvent['type'],
  status: ClerkBillingSubscriptionStatus,
) {
  const expected =
    type === 'subscription.active'
      ? 'active'
      : type === 'subscription.pastDue'
        ? 'past_due'
        : null;
  if (expected && status !== expected) {
    throw new NormalizationError('event_status_mismatch');
  }
}

function assertItemStatusMatchesEvent(
  type: BillingSubscriptionItemWebhookEvent['type'],
  status: ClerkBillingSubscriptionStatus,
) {
  const suffix = type.slice('subscriptionItem.'.length);
  const expected =
    suffix === 'pastDue'
      ? 'past_due'
      : suffix === 'created' || suffix === 'updated' || suffix === 'freeTrialEnding'
        ? null
        : suffix;
  if (expected && status !== expected) {
    throw new NormalizationError('event_status_mismatch');
  }
}

function normalizeSubscription(
  type: BillingSubscriptionWebhookEvent['type'],
  value: unknown,
): NormalizedClerkSubscriptionEvent {
  const data = requiredRecord(value);
  if (data.object !== 'commerce_subscription') {
    throw new NormalizationError('invalid_payload');
  }

  const status = requiredEnum(data.status, [
    'abandoned',
    'active',
    'canceled',
    'ended',
    'expired',
    'incomplete',
    'past_due',
    'upcoming',
  ] as const);
  assertSubscriptionStatusMatchesEvent(type, status);

  return {
    kind: 'subscription',
    type,
    resourceId: requiredString(data.id, MAX_ID_LENGTH),
    userId: payerUserId(data.payer),
    status,
    createdAt: requiredTimestamp(data.created_at),
    updatedAt: requiredTimestamp(data.updated_at),
    activeAt: optionalTimestamp(data.active_at),
    canceledAt: optionalTimestamp(data.canceled_at),
    endedAt: optionalTimestamp(data.ended_at),
    pastDueAt: optionalTimestamp(data.past_due_at),
    items: normalizeItems(data.items),
  };
}

function normalizeSubscriptionItem(
  type: BillingSubscriptionItemWebhookEvent['type'],
  value: unknown,
): NormalizedClerkSubscriptionItemEvent {
  const data = requiredRecord(value);
  const item = normalizeItem(data);
  assertItemStatusMatchesEvent(type, item.status);
  return {
    kind: 'subscription_item',
    type,
    resourceId: item.id,
    userId: payerUserId(data.payer),
    item,
  };
}

function normalizePaymentAttempt(
  type: BillingPaymentAttemptWebhookEvent['type'],
  value: unknown,
): NormalizedClerkPaymentAttemptEvent {
  const data = requiredRecord(value);
  if (data.object !== 'commerce_payment_attempt') {
    throw new NormalizationError('invalid_payload');
  }

  const status = requiredEnum(data.status, ['pending', 'paid', 'failed'] as const);
  if (
    (type === 'paymentAttempt.created' && status !== 'pending') ||
    (type === 'paymentAttempt.updated' && status === 'pending')
  ) {
    throw new NormalizationError('event_status_mismatch');
  }

  const totals = requiredRecord(data.totals);
  const grandTotal = requiredRecord(totals.grand_total);
  const failure =
    data.failed_reason === undefined || data.failed_reason === null
      ? null
      : requiredRecord(data.failed_reason);
  const items = normalizeItems(data.subscription_items);

  return {
    kind: 'payment_attempt',
    type,
    resourceId: requiredString(data.id, MAX_ID_LENGTH),
    userId: payerUserId(data.payer),
    paymentId: requiredString(data.payment_id, MAX_ID_LENGTH),
    statementId: requiredString(data.statement_id, MAX_ID_LENGTH),
    status,
    chargeType: requiredEnum(data.charge_type, ['checkout', 'recurring'] as const),
    createdAt: requiredTimestamp(data.created_at),
    updatedAt: requiredTimestamp(data.updated_at),
    billingDate: requiredTimestamp(data.billing_date),
    paidAt: optionalTimestamp(data.paid_at),
    failedAt: optionalTimestamp(data.failed_at),
    failureCode: failure ? optionalString(failure.code) : null,
    declineCode: failure ? optionalString(failure.decline_code) : null,
    totalAmount: requiredFiniteNumber(grandTotal.amount),
    currency: requiredString(grandTotal.currency, MAX_CURRENCY_LENGTH),
    subscriptionItemIds: items.map((item) => item.id),
  };
}

function isBillingEventType(value: unknown): value is ClerkBillingEventType {
  return (
    typeof value === 'string' &&
    CLERK_BILLING_EVENT_TYPES.includes(value as ClerkBillingEventType)
  );
}

export function normalizeClerkBillingEvent(input: unknown): ClerkBillingNormalizationResult {
  if (!isRecord(input) || input.object !== 'event' || typeof input.type !== 'string') {
    return { ok: false, reason: 'invalid_envelope' };
  }
  if (!isBillingEventType(input.type)) {
    return { ok: false, reason: 'unsupported_event' };
  }

  try {
    if (
      SUBSCRIPTION_EVENT_TYPES.includes(
        input.type as (typeof SUBSCRIPTION_EVENT_TYPES)[number],
      )
    ) {
      return {
        ok: true,
        event: normalizeSubscription(
          input.type as BillingSubscriptionWebhookEvent['type'],
          input.data,
        ),
      };
    }
    if (
      SUBSCRIPTION_ITEM_EVENT_TYPES.includes(
        input.type as (typeof SUBSCRIPTION_ITEM_EVENT_TYPES)[number],
      )
    ) {
      return {
        ok: true,
        event: normalizeSubscriptionItem(
          input.type as BillingSubscriptionItemWebhookEvent['type'],
          input.data,
        ),
      };
    }
    return {
      ok: true,
      event: normalizePaymentAttempt(
        input.type as BillingPaymentAttemptWebhookEvent['type'],
        input.data,
      ),
    };
  } catch (error) {
    if (error instanceof NormalizationError) {
      return { ok: false, reason: error.reason };
    }
    return { ok: false, reason: 'invalid_payload' };
  }
}
