CREATE EXTENSION IF NOT EXISTS "pg_trgm";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"tvg_id" text,
	"logo_url" text,
	"group_title" text,
	"country_code" text,
	"language" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_name" text,
	"platform" text,
	"app_version" text,
	"status" text DEFAULT 'active' NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "devices_status_check" CHECK ("devices"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paddle_customers" (
	"user_id" text PRIMARY KEY NOT NULL,
	"paddle_customer_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "paddle_customers_paddle_customer_id_key" UNIQUE("paddle_customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paddle_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playback_events" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"stream_id" text,
	"event" text NOT NULL,
	"device_platform" text NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"startup_time_ms" integer,
	"app_version" text,
	"player_engine" text,
	"device_model" text,
	"os_version" text,
	"error_code" text,
	"error_message" text,
	"received_at" timestamp with time zone NOT NULL,
	CONSTRAINT "playback_events_event_check" CHECK ("playback_events"."event" in ('opened', 'started', 'paused', 'stopped', 'failed', 'buffering_started', 'buffering_ended')),
	CONSTRAINT "playback_events_player_engine_check" CHECK ("playback_events"."player_engine" is null or "playback_events"."player_engine" in ('hls.js', 'native-hls', 'vlc', 'm3u-download', 'browser', 'media_kit', 'flutter')),
	CONSTRAINT "playback_events_startup_time_check" CHECK ("playback_events"."startup_time_ms" is null or "playback_events"."startup_time_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "playback_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"stream_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	CONSTRAINT "playback_sessions_status_check" CHECK ("playback_sessions"."status" in ('active', 'stopped', 'expired'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schema_migrations" (
	"id" text PRIMARY KEY NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'clerk' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	CONSTRAINT "sessions_provider_check" CHECK ("sessions"."provider" in ('clerk'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "streams" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'UNTESTED' NOT NULL,
	"cors_allowed" boolean DEFAULT false NOT NULL,
	"mixed_content" boolean DEFAULT false NOT NULL,
	"http_status" integer,
	"last_checked_at" timestamp with time zone,
	"failure_reason" text,
	CONSTRAINT "streams_status_check" CHECK ("streams"."status" in ('BROWSER_OK', 'VLC_ONLY', 'OFFLINE', 'UNTESTED'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'paddle' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"provider_price_id" text,
	"plan_code" text DEFAULT 'lumina_all_access_monthly' NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"trial_ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_updated_at" timestamp with time zone,
	"price_id" text,
	CONSTRAINT "subscriptions_provider_subscription_id_key" UNIQUE("provider_subscription_id"),
	CONSTRAINT "subscriptions_provider_check" CHECK ("subscriptions"."provider" in ('paddle')),
	CONSTRAINT "subscriptions_plan_code_check" CHECK ("subscriptions"."plan_code" in ('lumina_all_access_monthly')),
	CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_access" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"status" text DEFAULT 'trial' NOT NULL,
	"plan" text DEFAULT 'all_access' NOT NULL,
	"payment_provider" text,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"access_granted_at" timestamp with time zone,
	"access_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_access_status_check" CHECK ("user_access"."status" in ('active', 'trial', 'pending', 'past_due', 'blocked')),
	CONSTRAINT "user_access_plan_check" CHECK ("user_access"."plan" in ('all_access')),
	CONSTRAINT "user_access_payment_provider_check" CHECK ("user_access"."payment_provider" is null or "user_access"."payment_provider" in ('paddle', 'stripe', 'clerk_billing', 'dev'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_favorites" (
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorites_pkey" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_key" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'blocked'))
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "paddle_customers" ADD CONSTRAINT "paddle_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "streams" ADD CONSTRAINT "streams_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_country_code_idx" ON "channels" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_group_title_idx" ON "channels" USING btree ("group_title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_name_idx" ON "channels" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "channels_normalized_name_trgm_idx" ON "channels" USING gin ("normalized_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "devices_user_status_idx" ON "devices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "paddle_events_type_processed_idx" ON "paddle_events" USING btree ("event_type","processed_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playback_events_channel_id_idx" ON "playback_events" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playback_events_stream_id_idx" ON "playback_events" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playback_events_received_at_idx" ON "playback_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playback_events_event_timestamp_idx" ON "playback_events" USING btree ("event_timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "playback_sessions_user_created_idx" ON "playback_sessions" USING btree ("user_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "streams_channel_id_idx" ON "streams" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "streams_status_idx" ON "streams" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "streams_status_channel_id_idx" ON "streams" USING btree ("status","channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "streams_channel_id_status_idx" ON "streams" USING btree ("channel_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "streams_last_checked_at_idx" ON "streams" USING btree ("last_checked_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_subscription_uidx" ON "subscriptions" USING btree ("provider","provider_subscription_id") WHERE "subscriptions"."provider_subscription_id" is not null;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_plan_updated_idx" ON "subscriptions" USING btree ("user_id","plan_code","updated_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_access_email_idx" ON "user_access" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_access_status_idx" ON "user_access" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_favorites_user_created_idx" ON "user_favorites" USING btree ("user_id","created_at" DESC NULLS FIRST);
--> statement-breakpoint
INSERT INTO "schema_migrations" ("id")
VALUES
	('202606270001_identity'),
	('202606270002_devices'),
	('202606270003_catalog_schema'),
	('202606270003_playback_sessions'),
	('202606270004_user_favorites'),
	('202606270005_subscriptions'),
	('202606270006_paddle_tables')
ON CONFLICT ("id") DO NOTHING;
