import { createHmac } from 'node:crypto';

import { sql } from 'drizzle-orm';

import { db } from '@/db';

export type RateLimitDimension = 'user' | 'session' | 'network' | 'channel';

export type RateLimitPolicy = {
  bucket: string;
  dimension: RateLimitDimension;
  subject: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitOptions = {
  userId: string;
  bucket: string;
  limit: number;
  windowSeconds?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  bucket: string;
  dimension: RateLimitDimension;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitSetResult = {
  allowed: boolean;
  results: RateLimitResult[];
  denied: RateLimitResult | null;
};

type RateLimitRow = {
  requestCount: number;
  retryAfterSeconds: number;
};

function hashSecret() {
  const configured = process.env.ABUSE_HASH_SECRET;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ABUSE_HASH_SECRET must contain at least 32 characters in production.');
  }
  return 'lumina-development-rate-limit-secret';
}

function validatePolicy(policy: RateLimitPolicy) {
  if (!policy.bucket || policy.bucket.length > 100) {
    throw new TypeError('Rate limit bucket must contain between 1 and 100 characters.');
  }
  if (!policy.subject || policy.subject.length > 512) {
    throw new TypeError('Rate limit subject must contain between 1 and 512 characters.');
  }
  if (!Number.isSafeInteger(policy.limit) || policy.limit < 1) {
    throw new TypeError('Rate limit must be a positive safe integer.');
  }
  if (!Number.isSafeInteger(policy.windowSeconds) || policy.windowSeconds < 1) {
    throw new TypeError('Rate limit window must be a positive safe integer.');
  }
}

export function rateLimitPolicyKey(policy: RateLimitPolicy) {
  validatePolicy(policy);
  return createHmac('sha256', hashSecret())
    .update(
      JSON.stringify([
        'v2',
        policy.bucket,
        policy.dimension,
        policy.subject,
        policy.limit,
        policy.windowSeconds,
      ]),
    )
    .digest('hex');
}

export async function consumeRateLimits(
  policies: readonly RateLimitPolicy[],
): Promise<RateLimitSetResult> {
  if (policies.length === 0) {
    return { allowed: true, results: [], denied: null };
  }
  if (policies.length > 16) {
    throw new TypeError('A request cannot consume more than 16 rate limit policies.');
  }

  const uniquePolicies = new Map<
    string,
    { key: string; policy: RateLimitPolicy }
  >();
  for (const policy of policies) {
    const key = rateLimitPolicyKey(policy);
    uniquePolicies.set(key, { key, policy });
  }
  const ordered = [...uniquePolicies.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );

  const results = await db.transaction(async (tx) => {
    const consumed: RateLimitResult[] = [];
    for (const { key, policy } of ordered) {
      const result = await tx.execute<RateLimitRow>(sql`
        insert into api_rate_limits (
          key,
          window_started_at,
          request_count,
          expires_at,
          updated_at
        ) values (
          ${key},
          now(),
          1,
          now() + (${policy.windowSeconds} * interval '1 second'),
          now()
        )
        on conflict (key) do update set
          window_started_at = case
            when api_rate_limits.expires_at <= now() then now()
            else api_rate_limits.window_started_at
          end,
          request_count = case
            when api_rate_limits.expires_at <= now() then 1
            else least(api_rate_limits.request_count + 1, ${policy.limit + 1})
          end,
          expires_at = case
            when api_rate_limits.expires_at <= now()
              then now() + (${policy.windowSeconds} * interval '1 second')
            else api_rate_limits.expires_at
          end,
          updated_at = now()
        returning
          request_count as "requestCount",
          greatest(
            1,
            ceil(extract(epoch from (expires_at - now())))
          )::int as "retryAfterSeconds"
      `);
      const row = result.rows[0];
      if (!row) throw new Error('Rate limit counter could not be updated.');
      const requestCount = Number(row.requestCount);
      consumed.push({
        allowed: requestCount <= policy.limit,
        bucket: policy.bucket,
        dimension: policy.dimension,
        limit: policy.limit,
        remaining: Math.max(0, policy.limit - requestCount),
        retryAfterSeconds: Number(row.retryAfterSeconds),
      });
    }
    return consumed;
  });

  const denied =
    results
      .filter((result) => !result.allowed)
      .sort(
        (left, right) =>
          right.retryAfterSeconds - left.retryAfterSeconds ||
          left.remaining - right.remaining,
      )[0] ?? null;
  return { allowed: denied === null, results, denied };
}

export async function consumeRateLimit({
  userId,
  bucket,
  limit,
  windowSeconds = 60,
}: RateLimitOptions): Promise<RateLimitResult> {
  const result = await consumeRateLimits([
    {
      bucket,
      dimension: 'user',
      subject: userId,
      limit,
      windowSeconds,
    },
  ]);
  const consumed = result.results[0];
  if (!consumed) throw new Error('Rate limit counter could not be updated.');
  return consumed;
}

export async function cleanupExpiredRateLimits(batchSize = 5_000) {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 50_000) {
    throw new TypeError('Cleanup batch size must be between 1 and 50000.');
  }
  const result = await db.execute<{ deleted: number }>(sql`
    with expired as (
      select ctid
      from api_rate_limits
      where expires_at < now() - interval '1 hour'
      order by expires_at
      limit ${batchSize}
    ),
    deleted as (
      delete from api_rate_limits
      where ctid in (select ctid from expired)
      returning 1
    )
    select count(*)::int as deleted from deleted
  `);
  return Number(result.rows[0]?.deleted ?? 0);
}
