CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
DROP INDEX IF EXISTS "channels_normalized_name_trgm_idx";
--> statement-breakpoint
CREATE INDEX "channels_normalized_name_trgm_idx" ON "channels" USING gin ("normalized_name" gin_trgm_ops);
--> statement-breakpoint
ALTER TABLE "subscriptions"
	ADD COLUMN IF NOT EXISTS "provider_customer_id" text,
	ADD COLUMN IF NOT EXISTS "provider_subscription_id" text,
	ADD COLUMN IF NOT EXISTS "provider_price_id" text,
	ADD COLUMN IF NOT EXISTS "price_id" text,
	ADD COLUMN IF NOT EXISTS "current_period_start" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "current_period_end" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean NOT NULL DEFAULT false,
	ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "provider_updated_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone NOT NULL DEFAULT now();
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "user_access"
		WHERE ("access_granted_at" IS NOT NULL AND NOT pg_input_is_valid("access_granted_at"::text, 'timestamptz'))
		   OR ("access_expires_at" IS NOT NULL AND NOT pg_input_is_valid("access_expires_at"::text, 'timestamptz'))
		   OR NOT pg_input_is_valid("created_at"::text, 'timestamptz')
		   OR NOT pg_input_is_valid("updated_at"::text, 'timestamptz')
	) THEN
		RAISE EXCEPTION 'user_access contains timestamps that cannot be converted to timestamptz';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "information_schema"."columns"
		WHERE "table_schema" = 'public'
		  AND "table_name" = 'user_access'
		  AND "data_type" = 'text'
		  AND "column_name" IN (
			'access_granted_at',
			'access_expires_at',
			'created_at',
			'updated_at'
		  )
	) THEN
		ALTER TABLE "user_access"
			ALTER COLUMN "created_at" DROP DEFAULT,
			ALTER COLUMN "updated_at" DROP DEFAULT;

		ALTER TABLE "user_access"
			ALTER COLUMN "access_granted_at" TYPE timestamp with time zone
				USING "access_granted_at"::timestamptz,
			ALTER COLUMN "access_expires_at" TYPE timestamp with time zone
				USING "access_expires_at"::timestamptz,
			ALTER COLUMN "created_at" TYPE timestamp with time zone
				USING "created_at"::timestamptz,
			ALTER COLUMN "updated_at" TYPE timestamp with time zone
				USING "updated_at"::timestamptz;

		ALTER TABLE "user_access"
			ALTER COLUMN "created_at" SET DEFAULT now(),
			ALTER COLUMN "updated_at" SET DEFAULT now();
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "streams"
		WHERE "last_checked_at" IS NOT NULL
		  AND NOT pg_input_is_valid("last_checked_at"::text, 'timestamptz')
	) THEN
		RAISE EXCEPTION 'streams.last_checked_at contains values that cannot be converted to timestamptz';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "information_schema"."columns"
		WHERE "table_schema" = 'public'
		  AND "table_name" = 'streams'
		  AND "column_name" = 'last_checked_at'
		  AND "data_type" = 'text'
	) THEN
		ALTER TABLE "streams"
			ALTER COLUMN "last_checked_at" TYPE timestamp with time zone
				USING "last_checked_at"::timestamptz;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "playback_events"
		WHERE NOT pg_input_is_valid("event_timestamp"::text, 'timestamptz')
		   OR NOT pg_input_is_valid("received_at"::text, 'timestamptz')
	) THEN
		RAISE EXCEPTION 'playback_events contains timestamps that cannot be converted to timestamptz';
	END IF;

	IF EXISTS (
		SELECT 1
		FROM "information_schema"."columns"
		WHERE "table_schema" = 'public'
		  AND "table_name" = 'playback_events'
		  AND "data_type" = 'text'
		  AND "column_name" IN ('event_timestamp', 'received_at')
	) THEN
		ALTER TABLE "playback_events"
			ALTER COLUMN "event_timestamp" TYPE timestamp with time zone
				USING "event_timestamp"::timestamptz,
			ALTER COLUMN "received_at" TYPE timestamp with time zone
				USING "received_at"::timestamptz;
	END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "users" WHERE "status" NOT IN ('active', 'blocked')) THEN
		RAISE EXCEPTION 'users contains an unsupported status';
	END IF;
	IF EXISTS (SELECT 1 FROM "sessions" WHERE "provider" NOT IN ('clerk')) THEN
		RAISE EXCEPTION 'sessions contains an unsupported provider';
	END IF;
	IF EXISTS (SELECT 1 FROM "devices" WHERE "status" NOT IN ('active', 'revoked')) THEN
		RAISE EXCEPTION 'devices contains an unsupported status';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "user_access"
		WHERE "status" NOT IN ('active', 'trial', 'pending', 'past_due', 'blocked')
	) THEN
		RAISE EXCEPTION 'user_access contains an unsupported status';
	END IF;
	IF EXISTS (SELECT 1 FROM "user_access" WHERE "plan" NOT IN ('all_access')) THEN
		RAISE EXCEPTION 'user_access contains an unsupported plan';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "user_access"
		WHERE "payment_provider" IS NOT NULL
		  AND "payment_provider" NOT IN ('paddle', 'stripe', 'clerk_billing', 'dev')
	) THEN
		RAISE EXCEPTION 'user_access contains an unsupported payment provider';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "streams"
		WHERE "status" NOT IN ('BROWSER_OK', 'VLC_ONLY', 'OFFLINE', 'UNTESTED')
	) THEN
		RAISE EXCEPTION 'streams contains an unsupported status';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "playback_events"
		WHERE "event" NOT IN (
			'opened',
			'started',
			'paused',
			'stopped',
			'failed',
			'buffering_started',
			'buffering_ended'
		)
	) THEN
		RAISE EXCEPTION 'playback_events contains an unsupported event';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "playback_events"
		WHERE "player_engine" IS NOT NULL
		  AND "player_engine" NOT IN (
			'hls.js',
			'native-hls',
			'vlc',
			'm3u-download',
			'browser',
			'media_kit',
			'flutter'
		)
	) THEN
		RAISE EXCEPTION 'playback_events contains an unsupported player engine';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "playback_events"
		WHERE "startup_time_ms" IS NOT NULL AND "startup_time_ms" < 0
	) THEN
		RAISE EXCEPTION 'playback_events contains a negative startup time';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "playback_sessions"
		WHERE "status" NOT IN ('active', 'stopped', 'expired')
	) THEN
		RAISE EXCEPTION 'playback_sessions contains an unsupported status';
	END IF;
	IF EXISTS (SELECT 1 FROM "subscriptions" WHERE "provider" NOT IN ('paddle')) THEN
		RAISE EXCEPTION 'subscriptions contains an unsupported provider';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "subscriptions"
		WHERE "plan_code" NOT IN ('lumina_all_access_monthly')
	) THEN
		RAISE EXCEPTION 'subscriptions contains an unsupported plan';
	END IF;
	IF EXISTS (
		SELECT 1 FROM "subscriptions"
		WHERE "status" NOT IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')
	) THEN
		RAISE EXCEPTION 'subscriptions contains an unsupported status';
	END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION pg_temp.add_lumina_check(
	target_table regclass,
	constraint_name text,
	expression text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conrelid = target_table
		  AND conname = constraint_name
	) THEN
		EXECUTE format(
			'ALTER TABLE %s ADD CONSTRAINT %I CHECK (%s) NOT VALID',
			target_table,
			constraint_name,
			expression
		);
	END IF;
END;
$$;
--> statement-breakpoint
SELECT pg_temp.add_lumina_check('users', 'users_status_check', $$status in ('active', 'blocked')$$);
SELECT pg_temp.add_lumina_check('sessions', 'sessions_provider_check', $$provider in ('clerk')$$);
SELECT pg_temp.add_lumina_check('devices', 'devices_status_check', $$status in ('active', 'revoked')$$);
SELECT pg_temp.add_lumina_check('user_access', 'user_access_status_check', $$status in ('active', 'trial', 'pending', 'past_due', 'blocked')$$);
SELECT pg_temp.add_lumina_check('user_access', 'user_access_plan_check', $$plan in ('all_access')$$);
SELECT pg_temp.add_lumina_check('user_access', 'user_access_payment_provider_check', $$payment_provider is null or payment_provider in ('paddle', 'stripe', 'clerk_billing', 'dev')$$);
SELECT pg_temp.add_lumina_check('streams', 'streams_status_check', $$status in ('BROWSER_OK', 'VLC_ONLY', 'OFFLINE', 'UNTESTED')$$);
SELECT pg_temp.add_lumina_check('playback_events', 'playback_events_event_check', $$event in ('opened', 'started', 'paused', 'stopped', 'failed', 'buffering_started', 'buffering_ended')$$);
SELECT pg_temp.add_lumina_check('playback_events', 'playback_events_player_engine_check', $$player_engine is null or player_engine in ('hls.js', 'native-hls', 'vlc', 'm3u-download', 'browser', 'media_kit', 'flutter')$$);
SELECT pg_temp.add_lumina_check('playback_events', 'playback_events_startup_time_check', $$startup_time_ms is null or startup_time_ms >= 0$$);
SELECT pg_temp.add_lumina_check('playback_sessions', 'playback_sessions_status_check', $$status in ('active', 'stopped', 'expired')$$);
SELECT pg_temp.add_lumina_check('subscriptions', 'subscriptions_provider_check', $$provider in ('paddle')$$);
SELECT pg_temp.add_lumina_check('subscriptions', 'subscriptions_plan_code_check', $$plan_code in ('lumina_all_access_monthly')$$);
SELECT pg_temp.add_lumina_check('subscriptions', 'subscriptions_status_check', $$status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')$$);
--> statement-breakpoint
ALTER TABLE "users" VALIDATE CONSTRAINT "users_status_check";
ALTER TABLE "sessions" VALIDATE CONSTRAINT "sessions_provider_check";
ALTER TABLE "devices" VALIDATE CONSTRAINT "devices_status_check";
ALTER TABLE "user_access" VALIDATE CONSTRAINT "user_access_status_check";
ALTER TABLE "user_access" VALIDATE CONSTRAINT "user_access_plan_check";
ALTER TABLE "user_access" VALIDATE CONSTRAINT "user_access_payment_provider_check";
ALTER TABLE "streams" VALIDATE CONSTRAINT "streams_status_check";
ALTER TABLE "playback_events" VALIDATE CONSTRAINT "playback_events_event_check";
ALTER TABLE "playback_events" VALIDATE CONSTRAINT "playback_events_player_engine_check";
ALTER TABLE "playback_events" VALIDATE CONSTRAINT "playback_events_startup_time_check";
ALTER TABLE "playback_sessions" VALIDATE CONSTRAINT "playback_sessions_status_check";
ALTER TABLE "subscriptions" VALIDATE CONSTRAINT "subscriptions_provider_check";
ALTER TABLE "subscriptions" VALIDATE CONSTRAINT "subscriptions_plan_code_check";
ALTER TABLE "subscriptions" VALIDATE CONSTRAINT "subscriptions_status_check";
