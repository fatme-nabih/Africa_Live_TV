import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const timestampWithTimezone = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'string' });

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email'),
    status: text('status').notNull().default('active'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
    lastSeenAt: timestampWithTimezone('last_seen_at'),
    trialStartedAt: timestampWithTimezone('trial_started_at').notNull().defaultNow(),
    trialEndsAt: timestampWithTimezone('trial_ends_at')
      .notNull()
      .default(sql`(now() + '14 days'::interval)`),
    clerkSyncedAt: timestampWithTimezone('clerk_synced_at'),
  },
  (table) => [
    unique('users_clerk_user_id_key').on(table.clerkUserId),
    check('users_status_check', sql`${table.status} in ('active', 'blocked', 'deleted')`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    provider: text('provider').notNull().default('clerk'),
    status: text('status').notNull().default('active'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    lastSeenAt: timestampWithTimezone('last_seen_at').notNull(),
    expiresAt: timestampWithTimezone('expires_at'),
    endedAt: timestampWithTimezone('ended_at'),
  },
  (table) => [
    foreignKey({
      name: 'sessions_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    index('sessions_user_status_idx').on(table.userId, table.status),
    check('sessions_provider_check', sql`${table.provider} in ('clerk')`),
    check(
      'sessions_status_check',
      sql`${table.status} in ('active', 'ended', 'revoked', 'removed')`,
    ),
  ],
);

export const devices = pgTable(
  'devices',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    deviceName: text('device_name'),
    platform: text('platform'),
    appVersion: text('app_version'),
    status: text('status').notNull().default('active'),
    activatedAt: timestampWithTimezone('activated_at').notNull().defaultNow(),
    lastSeenAt: timestampWithTimezone('last_seen_at').notNull().defaultNow(),
    revokedAt: timestampWithTimezone('revoked_at'),
  },
  (table) => [
    foreignKey({
      name: 'devices_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    index('devices_user_status_idx').on(table.userId, table.status),
    check('devices_status_check', sql`${table.status} in ('active', 'revoked')`),
  ],
);

export const userAccess = pgTable(
  'user_access',
  {
    clerkUserId: text('clerk_user_id').primaryKey(),
    email: text('email'),
    status: text('status').notNull().default('trial'),
    plan: text('plan').notNull().default('all_access'),
    paymentProvider: text('payment_provider'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    accessGrantedAt: timestampWithTimezone('access_granted_at'),
    accessExpiresAt: timestampWithTimezone('access_expires_at'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_access_email_idx').on(table.email),
    index('user_access_status_idx').on(table.status),
    check(
      'user_access_status_check',
      sql`${table.status} in ('active', 'trial', 'pending', 'past_due', 'blocked')`,
    ),
    check('user_access_plan_check', sql`${table.plan} in ('all_access')`),
    check(
      'user_access_payment_provider_check',
      sql`${table.paymentProvider} is null or ${table.paymentProvider} in ('paddle', 'stripe', 'clerk_billing', 'dev')`,
    ),
  ],
);

export const catalogImports = pgTable(
  'catalog_imports',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    contentSha256: text('content_sha256').notNull(),
    status: text('status').notNull().default('STAGING'),
    startedAt: timestampWithTimezone('started_at').notNull().defaultNow(),
    completedAt: timestampWithTimezone('completed_at'),
    channelCount: integer('channel_count').notNull().default(0),
    streamCount: integer('stream_count').notNull().default(0),
    addedChannels: integer('added_channels').notNull().default(0),
    updatedChannels: integer('updated_channels').notNull().default(0),
    disappearedChannels: integer('disappeared_channels').notNull().default(0),
    addedStreams: integer('added_streams').notNull().default(0),
    updatedStreams: integer('updated_streams').notNull().default(0),
    disappearedStreams: integer('disappeared_streams').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    errorMessage: text('error_message'),
    report: jsonb('report').$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    index('catalog_imports_source_started_idx').on(
      table.source,
      table.startedAt.desc().nullsFirst(),
    ),
    index('catalog_imports_status_started_idx').on(table.status, table.startedAt),
    check(
      'catalog_imports_status_check',
      sql`${table.status} in ('STAGING', 'PUBLISHED', 'FAILED')`,
    ),
    check(
      'catalog_imports_counts_check',
      sql`${table.channelCount} >= 0 and ${table.streamCount} >= 0 and ${table.errorCount} >= 0`,
    ),
  ],
);

export const apiRateLimits = pgTable(
  'api_rate_limits',
  {
    key: text('key').primaryKey(),
    windowStartedAt: timestampWithTimezone('window_started_at').notNull(),
    requestCount: integer('request_count').notNull().default(0),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('api_rate_limits_expires_at_idx').on(table.expiresAt),
    check('api_rate_limits_request_count_check', sql`${table.requestCount} >= 0`),
  ],
);

export const apiAbuseCases = pgTable(
  'api_abuse_cases',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    state: text('state').notNull().default('WATCH'),
    primarySignal: text('primary_signal').notNull(),
    score: integer('score').notNull().default(0),
    firstSignalAt: timestampWithTimezone('first_signal_at').notNull().defaultNow(),
    lastSignalAt: timestampWithTimezone('last_signal_at').notNull().defaultNow(),
    warnedAt: timestampWithTimezone('warned_at'),
    suspendedAt: timestampWithTimezone('suspended_at'),
    unlockAfter: timestampWithTimezone('unlock_after'),
    reviewedAt: timestampWithTimezone('reviewed_at'),
    reviewedBy: text('reviewed_by'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'api_abuse_cases_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    index('api_abuse_cases_user_state_idx').on(table.userId, table.state),
    uniqueIndex('api_abuse_cases_open_signal_uidx')
      .on(table.userId, table.primarySignal)
      .where(sql`${table.state} in ('WATCH', 'WARNED', 'SUSPENDED')`),
    index('api_abuse_cases_state_last_signal_idx').on(
      table.state,
      table.lastSignalAt.desc().nullsFirst(),
    ),
    check(
      'api_abuse_cases_state_check',
      sql`${table.state} in ('WATCH', 'WARNED', 'SUSPENDED', 'CLEARED')`,
    ),
    check('api_abuse_cases_score_check', sql`${table.score} >= 0`),
    check(
      'api_abuse_cases_primary_signal_length_check',
      sql`char_length(${table.primarySignal}) between 1 and 100`,
    ),
  ],
);

export const apiAbuseEvents = pgTable(
  'api_abuse_events',
  {
    id: text('id').primaryKey(),
    caseId: text('case_id').notNull(),
    userId: text('user_id').notNull(),
    code: text('code').notNull(),
    severity: text('severity').notNull().default('warning'),
    bucket: text('bucket').notNull(),
    aggregates: jsonb('aggregates')
      .$type<Record<string, number | string | boolean | null>>()
      .notNull()
      .default({}),
    occurredAt: timestampWithTimezone('occurred_at').notNull().defaultNow(),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
    acknowledgedAt: timestampWithTimezone('acknowledged_at'),
  },
  (table) => [
    foreignKey({
      name: 'api_abuse_events_case_id_fkey',
      columns: [table.caseId],
      foreignColumns: [apiAbuseCases.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'api_abuse_events_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    index('api_abuse_events_case_occurred_idx').on(
      table.caseId,
      table.occurredAt.desc().nullsFirst(),
    ),
    index('api_abuse_events_user_occurred_idx').on(
      table.userId,
      table.occurredAt.desc().nullsFirst(),
    ),
    index('api_abuse_events_expires_idx').on(table.expiresAt),
    check(
      'api_abuse_events_severity_check',
      sql`${table.severity} in ('info', 'warning', 'critical')`,
    ),
    check(
      'api_abuse_events_code_length_check',
      sql`char_length(${table.code}) between 1 and 100`,
    ),
    check(
      'api_abuse_events_bucket_length_check',
      sql`char_length(${table.bucket}) between 1 and 100`,
    ),
  ],
);

export const catalogImportChannels = pgTable(
  'catalog_import_channels',
  {
    importId: text('import_id').notNull(),
    channelId: text('channel_id').notNull(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    tvgId: text('tvg_id'),
    logoUrl: text('logo_url'),
    groupTitle: text('group_title'),
    countryCode: text('country_code'),
    language: text('language'),
  },
  (table) => [
    primaryKey({
      name: 'catalog_import_channels_pkey',
      columns: [table.importId, table.channelId],
    }),
    foreignKey({
      name: 'catalog_import_channels_import_id_fkey',
      columns: [table.importId],
      foreignColumns: [catalogImports.id],
    }).onDelete('cascade'),
  ],
);

export const catalogImportStreams = pgTable(
  'catalog_import_streams',
  {
    importId: text('import_id').notNull(),
    streamId: text('stream_id').notNull(),
    channelId: text('channel_id').notNull(),
    url: text('url').notNull(),
    mixedContent: boolean('mixed_content').notNull().default(false),
  },
  (table) => [
    primaryKey({
      name: 'catalog_import_streams_pkey',
      columns: [table.importId, table.streamId],
    }),
    foreignKey({
      name: 'catalog_import_streams_import_id_fkey',
      columns: [table.importId],
      foreignColumns: [catalogImports.id],
    }).onDelete('cascade'),
    unique('catalog_import_streams_import_url_key').on(table.importId, table.url),
  ],
);

export const channels = pgTable(
  'channels',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    tvgId: text('tvg_id'),
    logoUrl: text('logo_url'),
    groupTitle: text('group_title'),
    countryCode: text('country_code'),
    language: text('language'),
    active: boolean('active').notNull().default(true),
    firstSeenImportId: text('first_seen_import_id'),
    lastSeenImportId: text('last_seen_import_id'),
    inactiveAt: timestampWithTimezone('inactive_at'),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'channels_first_seen_import_id_fkey',
      columns: [table.firstSeenImportId],
      foreignColumns: [catalogImports.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'channels_last_seen_import_id_fkey',
      columns: [table.lastSeenImportId],
      foreignColumns: [catalogImports.id],
    }).onDelete('set null'),
    index('channels_active_name_idx').on(table.active, table.name),
    index('channels_country_code_idx').on(table.countryCode),
    index('channels_group_title_idx').on(table.groupTitle),
    index('channels_name_idx').on(table.name),
    index('channels_normalized_name_trgm_idx').using(
      'gin',
      table.normalizedName.asc().nullsLast().op('gin_trgm_ops'),
    ),
  ],
);

export const streams = pgTable(
  'streams',
  {
    id: text('id').primaryKey(),
    channelId: text('channel_id').notNull(),
    url: text('url').notNull(),
    status: text('status').notNull().default('UNTESTED'),
    corsAllowed: boolean('cors_allowed').notNull().default(false),
    mixedContent: boolean('mixed_content').notNull().default(false),
    httpStatus: integer('http_status'),
    lastCheckedAt: timestampWithTimezone('last_checked_at'),
    failureReason: text('failure_reason'),
    active: boolean('active').notNull().default(true),
    firstSeenImportId: text('first_seen_import_id'),
    lastSeenImportId: text('last_seen_import_id'),
    inactiveAt: timestampWithTimezone('inactive_at'),
    verificationState: text('verification_state').notNull().default('NEVER_CHECKED'),
    directEligibility: text('direct_eligibility').notNull().default('REVIEW_REQUIRED'),
    eligibilityReason: text('eligibility_reason').notNull().default('NOT_REVALIDATED'),
    eligibilityCheckedAt: timestampWithTimezone('eligibility_checked_at'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    lastSuccessAt: timestampWithTimezone('last_success_at'),
    nextCheckAt: timestampWithTimezone('next_check_at'),
    finalUrl: text('final_url'),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'streams_channel_id_channels_id_fk',
      columns: [table.channelId],
      foreignColumns: [channels.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'streams_first_seen_import_id_fkey',
      columns: [table.firstSeenImportId],
      foreignColumns: [catalogImports.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'streams_last_seen_import_id_fkey',
      columns: [table.lastSeenImportId],
      foreignColumns: [catalogImports.id],
    }).onDelete('set null'),
    index('streams_active_next_check_idx').on(table.active, table.nextCheckAt),
    index('streams_channel_id_idx').on(table.channelId),
    index('streams_status_idx').on(table.status),
    index('streams_status_channel_id_idx').on(table.status, table.channelId),
    index('streams_channel_id_status_idx').on(table.channelId, table.status),
    index('streams_last_checked_at_idx').on(table.lastCheckedAt),
    index('streams_direct_eligibility_idx').on(table.directEligibility),
    index('streams_active_direct_eligibility_idx').on(
      table.active,
      table.directEligibility,
    ),
    check(
      'streams_status_check',
      sql`${table.status} in ('BROWSER_OK', 'VLC_ONLY', 'OFFLINE', 'UNTESTED')`,
    ),
    check(
      'streams_verification_state_check',
      sql`${table.verificationState} in ('NEVER_CHECKED', 'HEALTHY', 'STALE', 'TEMPORARY_FAILURE', 'CONFIRMED_FAILURE')`,
    ),
    check(
      'streams_direct_eligibility_check',
      sql`${table.directEligibility} in ('PUBLIC_DIRECT_WEB', 'PUBLIC_DIRECT_VLC', 'REVIEW_REQUIRED', 'OFFLINE')`,
    ),
    check(
      'streams_consecutive_failures_check',
      sql`${table.consecutiveFailures} >= 0`,
    ),
  ],
);

export const userFavorites = pgTable(
  'user_favorites',
  {
    userId: text('user_id').notNull(),
    channelId: text('channel_id').notNull(),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'user_favorites_pkey',
      columns: [table.userId, table.channelId],
    }),
    foreignKey({
      name: 'user_favorites_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'user_favorites_channel_id_fkey',
      columns: [table.channelId],
      foreignColumns: [channels.id],
    }).onDelete('cascade'),
    index('user_favorites_user_created_idx').on(
      table.userId,
      table.createdAt.desc().nullsFirst(),
    ),
  ],
);

export const playbackSessions = pgTable(
  'playback_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    deviceId: text('device_id'),
    channelId: text('channel_id').notNull(),
    streamId: text('stream_id').notNull(),
    status: text('status').notNull().default('active'),
    schemaVersion: integer('schema_version').notNull().default(1),
    playerEngine: text('player_engine'),
    startedAt: timestampWithTimezone('started_at').notNull().defaultNow(),
    endedAt: timestampWithTimezone('ended_at'),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    lastHeartbeatAt: timestampWithTimezone('last_heartbeat_at'),
  },
  (table) => [
    foreignKey({
      name: 'playback_sessions_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'playback_sessions_device_id_fkey',
      columns: [table.deviceId],
      foreignColumns: [devices.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'playback_sessions_channel_id_fkey',
      columns: [table.channelId],
      foreignColumns: [channels.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'playback_sessions_stream_id_fkey',
      columns: [table.streamId],
      foreignColumns: [streams.id],
    }).onDelete('cascade'),
    index('playback_sessions_user_created_idx').on(
      table.userId,
      table.createdAt.desc().nullsFirst(),
    ),
    index('playback_sessions_stream_started_idx').on(
      table.streamId,
      table.startedAt.desc().nullsFirst(),
    ),
    check(
      'playback_sessions_status_check',
      sql`${table.status} in ('active', 'stopped', 'expired')`,
    ),
    check(
      'playback_sessions_schema_version_check',
      sql`${table.schemaVersion} in (0, 1)`,
    ),
    check(
      'playback_sessions_player_engine_check',
      sql`${table.playerEngine} is null or ${table.playerEngine} in ('hls.js', 'native-hls', 'media_kit', 'flutter', 'vlc')`,
    ),
  ],
);

export const playbackAttempts = pgTable(
  'playback_attempts',
  {
    id: text('id').primaryKey(),
    playbackSessionId: text('playback_session_id').notNull(),
    streamId: text('stream_id').notNull(),
    previousAttemptId: text('previous_attempt_id'),
    destination: text('destination').notNull(),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    expiresAt: timestampWithTimezone('expires_at').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'playback_attempts_session_id_fkey',
      columns: [table.playbackSessionId],
      foreignColumns: [playbackSessions.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'playback_attempts_stream_id_fkey',
      columns: [table.streamId],
      foreignColumns: [streams.id],
    }),
    foreignKey({
      name: 'playback_attempts_previous_attempt_id_fkey',
      columns: [table.previousAttemptId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
    index('playback_attempts_session_created_idx').on(
      table.playbackSessionId,
      table.createdAt.desc().nullsFirst(),
    ),
    index('playback_attempts_stream_created_idx').on(
      table.streamId,
      table.createdAt.desc().nullsFirst(),
    ),
    uniqueIndex('playback_attempts_previous_attempt_uidx')
      .on(table.previousAttemptId)
      .where(sql`${table.previousAttemptId} is not null`),
    check(
      'playback_attempts_destination_check',
      sql`${table.destination} in ('web', 'vlc-mobile', 'vlc-local')`,
    ),
  ],
);

export const playbackEvents = pgTable(
  'playback_events',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    playbackSessionId: text('playback_session_id'),
    attemptId: text('attempt_id'),
    schemaVersion: integer('schema_version').notNull().default(1),
    requestId: text('request_id'),
    channelId: text('channel_id').notNull(),
    streamId: text('stream_id'),
    event: text('event').notNull(),
    devicePlatform: text('device_platform').notNull(),
    eventTimestamp: timestampWithTimezone('event_timestamp').notNull(),
    startupTimeMs: integer('startup_time_ms'),
    appVersion: text('app_version'),
    playerEngine: text('player_engine'),
    deviceModel: text('device_model'),
    osVersion: text('os_version'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    receivedAt: timestampWithTimezone('received_at').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'playback_events_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'playback_events_playback_session_id_fkey',
      columns: [table.playbackSessionId],
      foreignColumns: [playbackSessions.id],
    }).onDelete('set null'),
    foreignKey({
      name: 'playback_events_channel_id_channels_id_fk',
      columns: [table.channelId],
      foreignColumns: [channels.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'playback_events_stream_id_streams_id_fk',
      columns: [table.streamId],
      foreignColumns: [streams.id],
    }).onDelete('set null'),
    index('playback_events_channel_id_idx').on(table.channelId),
    index('playback_events_stream_id_idx').on(table.streamId),
    index('playback_events_received_at_idx').on(table.receivedAt),
    index('playback_events_event_timestamp_idx').on(table.eventTimestamp),
    index('playback_events_session_event_idx').on(table.playbackSessionId, table.event),
    index('playback_events_user_received_idx').on(
      table.userId,
      table.receivedAt.desc().nullsFirst(),
    ),
    index('playback_events_stream_session_idx').on(table.streamId, table.playbackSessionId),
    uniqueIndex('playback_events_attempt_lifecycle_unique_idx')
      .on(table.attemptId, table.event)
      .where(
        sql`${table.attemptId} is not null and ${table.event} in ('opened', 'started', 'stopped')`,
      ),
    check(
      'playback_events_event_check',
      sql`${table.event} in ('opened', 'started', 'paused', 'stopped', 'failed', 'buffering_started', 'buffering_ended')`,
    ),
    check(
      'playback_events_player_engine_check',
      sql`${table.playerEngine} is null or ${table.playerEngine} in ('hls.js', 'native-hls', 'media_kit', 'flutter', 'vlc')`,
    ),
    check(
      'playback_events_startup_time_check',
      sql`${table.startupTimeMs} is null or ${table.startupTimeMs} >= 0`,
    ),
    check(
      'playback_events_schema_version_check',
      sql`${table.schemaVersion} in (0, 1)`,
    ),
    check(
      'playback_events_error_code_length_check',
      sql`${table.errorCode} is null or char_length(${table.errorCode}) <= 100`,
    ),
    check(
      'playback_events_error_message_length_check',
      sql`${table.errorMessage} is null or char_length(${table.errorMessage}) <= 1000`,
    ),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    provider: text('provider').notNull().default('paddle'),
    providerCustomerId: text('provider_customer_id'),
    providerSubscriptionId: text('provider_subscription_id'),
    providerPriceId: text('provider_price_id'),
    planCode: text('plan_code').notNull().default('lumina_all_access_monthly'),
    status: text('status').notNull(),
    currentPeriodStart: timestampWithTimezone('current_period_start'),
    currentPeriodEnd: timestampWithTimezone('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    trialEndsAt: timestampWithTimezone('trial_ends_at'),
    graceEndsAt: timestampWithTimezone('grace_ends_at'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
    providerUpdatedAt: timestampWithTimezone('provider_updated_at'),
    priceId: text('price_id'),
  },
  (table) => [
    foreignKey({
      name: 'subscriptions_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    unique('subscriptions_provider_subscription_id_key').on(
      table.providerSubscriptionId,
    ),
    uniqueIndex('subscriptions_provider_subscription_uidx')
      .on(table.provider, table.providerSubscriptionId)
      .where(sql`${table.providerSubscriptionId} is not null`),
    index('subscriptions_user_plan_updated_idx').on(
      table.userId,
      table.planCode,
      table.updatedAt.desc().nullsFirst(),
    ),
    index('subscriptions_user_status_idx').on(table.userId, table.status),
    check(
      'subscriptions_provider_check',
      sql`${table.provider} in ('paddle', 'clerk_billing')`,
    ),
    check(
      'subscriptions_plan_code_check',
      sql`${table.planCode} in ('lumina_all_access_monthly')`,
    ),
    check(
      'subscriptions_status_check',
      sql`${table.status} in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')`,
    ),
  ],
);

export const clerkBillingEvents = pgTable(
  'clerk_billing_events',
  {
    messageId: text('message_id').primaryKey(),
    eventType: text('event_type').notNull(),
    resourceId: text('resource_id'),
    payloadDigest: text('payload_digest').notNull(),
    status: text('status').notNull(),
    reason: text('reason'),
    receivedAt: timestampWithTimezone('received_at').notNull().defaultNow(),
    processedAt: timestampWithTimezone('processed_at').notNull().defaultNow(),
  },
  (table) => [
    index('clerk_billing_events_type_processed_idx').on(
      table.eventType,
      table.processedAt.desc().nullsFirst(),
    ),
    check(
      'clerk_billing_events_status_check',
      sql`${table.status} in ('processed', 'ignored', 'failed')`,
    ),
    check(
      'clerk_billing_events_message_id_length_check',
      sql`char_length(${table.messageId}) between 1 and 256`,
    ),
    check(
      'clerk_billing_events_digest_length_check',
      sql`char_length(${table.payloadDigest}) = 64`,
    ),
  ],
);

export const paddleCustomers = pgTable(
  'paddle_customers',
  {
    userId: text('user_id').primaryKey(),
    paddleCustomerId: text('paddle_customer_id').notNull(),
    email: text('email'),
    createdAt: timestampWithTimezone('created_at').notNull().defaultNow(),
    updatedAt: timestampWithTimezone('updated_at').notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'paddle_customers_user_id_fkey',
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete('cascade'),
    unique('paddle_customers_paddle_customer_id_key').on(table.paddleCustomerId),
  ],
);

export const paddleEvents = pgTable(
  'paddle_events',
  {
    eventId: text('event_id').primaryKey(),
    eventType: text('event_type').notNull(),
    occurredAt: timestampWithTimezone('occurred_at'),
    processedAt: timestampWithTimezone('processed_at').notNull().defaultNow(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    index('paddle_events_type_processed_idx').on(
      table.eventType,
      table.processedAt.desc().nullsFirst(),
    ),
  ],
);

export const schemaMigrations = pgTable('schema_migrations', {
  id: text('id').primaryKey(),
  appliedAt: timestampWithTimezone('applied_at').notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  devices: many(devices),
  favorites: many(userFavorites),
  playbackSessions: many(playbackSessions),
  playbackEvents: many(playbackEvents),
  subscriptions: many(subscriptions),
  abuseCases: many(apiAbuseCases),
  abuseEvents: many(apiAbuseEvents),
  paddleCustomer: one(paddleCustomers),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, {
    fields: [devices.userId],
    references: [users.id],
  }),
  playbackSessions: many(playbackSessions),
}));

export const channelsRelations = relations(channels, ({ many }) => ({
  streams: many(streams),
  favorites: many(userFavorites),
  playbackEvents: many(playbackEvents),
  playbackSessions: many(playbackSessions),
}));

export const streamsRelations = relations(streams, ({ one, many }) => ({
  channel: one(channels, {
    fields: [streams.channelId],
    references: [channels.id],
  }),
  playbackEvents: many(playbackEvents),
  playbackSessions: many(playbackSessions),
  playbackAttempts: many(playbackAttempts),
}));

export const userFavoritesRelations = relations(userFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userFavorites.userId],
    references: [users.id],
  }),
  channel: one(channels, {
    fields: [userFavorites.channelId],
    references: [channels.id],
  }),
}));

export const playbackEventsRelations = relations(playbackEvents, ({ one }) => ({
  user: one(users, {
    fields: [playbackEvents.userId],
    references: [users.id],
  }),
  playbackSession: one(playbackSessions, {
    fields: [playbackEvents.playbackSessionId],
    references: [playbackSessions.id],
  }),
  channel: one(channels, {
    fields: [playbackEvents.channelId],
    references: [channels.id],
  }),
  stream: one(streams, {
    fields: [playbackEvents.streamId],
    references: [streams.id],
  }),
}));

export const playbackSessionsRelations = relations(playbackSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [playbackSessions.userId],
    references: [users.id],
  }),
  device: one(devices, {
    fields: [playbackSessions.deviceId],
    references: [devices.id],
  }),
  channel: one(channels, {
    fields: [playbackSessions.channelId],
    references: [channels.id],
  }),
  stream: one(streams, {
    fields: [playbackSessions.streamId],
    references: [streams.id],
  }),
  events: many(playbackEvents),
  attempts: many(playbackAttempts),
}));

export const playbackAttemptsRelations = relations(playbackAttempts, ({ one }) => ({
  playbackSession: one(playbackSessions, {
    fields: [playbackAttempts.playbackSessionId],
    references: [playbackSessions.id],
  }),
  stream: one(streams, {
    fields: [playbackAttempts.streamId],
    references: [streams.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const apiAbuseCasesRelations = relations(apiAbuseCases, ({ one, many }) => ({
  user: one(users, {
    fields: [apiAbuseCases.userId],
    references: [users.id],
  }),
  events: many(apiAbuseEvents),
}));

export const apiAbuseEventsRelations = relations(apiAbuseEvents, ({ one }) => ({
  case: one(apiAbuseCases, {
    fields: [apiAbuseEvents.caseId],
    references: [apiAbuseCases.id],
  }),
  user: one(users, {
    fields: [apiAbuseEvents.userId],
    references: [users.id],
  }),
}));

export const paddleCustomersRelations = relations(paddleCustomers, ({ one }) => ({
  user: one(users, {
    fields: [paddleCustomers.userId],
    references: [users.id],
  }),
}));
