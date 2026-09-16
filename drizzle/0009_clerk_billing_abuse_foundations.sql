CREATE TABLE "api_abuse_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"state" text DEFAULT 'WATCH' NOT NULL,
	"primary_signal" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"first_signal_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signal_at" timestamp with time zone DEFAULT now() NOT NULL,
	"warned_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"unlock_after" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_abuse_cases_state_check" CHECK ("api_abuse_cases"."state" in ('WATCH', 'WARNED', 'SUSPENDED', 'CLEARED')),
	CONSTRAINT "api_abuse_cases_score_check" CHECK ("api_abuse_cases"."score" >= 0),
	CONSTRAINT "api_abuse_cases_primary_signal_length_check" CHECK (char_length("api_abuse_cases"."primary_signal") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "api_abuse_events" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"bucket" text NOT NULL,
	"aggregates" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	CONSTRAINT "api_abuse_events_severity_check" CHECK ("api_abuse_events"."severity" in ('info', 'warning', 'critical')),
	CONSTRAINT "api_abuse_events_code_length_check" CHECK (char_length("api_abuse_events"."code") between 1 and 100),
	CONSTRAINT "api_abuse_events_bucket_length_check" CHECK (char_length("api_abuse_events"."bucket") between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "clerk_billing_events" (
	"message_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"resource_id" text,
	"payload_digest" text NOT NULL,
	"status" text NOT NULL,
	"reason" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clerk_billing_events_status_check" CHECK ("clerk_billing_events"."status" in ('processed', 'ignored', 'failed')),
	CONSTRAINT "clerk_billing_events_message_id_length_check" CHECK (char_length("clerk_billing_events"."message_id") between 1 and 256),
	CONSTRAINT "clerk_billing_events_digest_length_check" CHECK (char_length("clerk_billing_events"."payload_digest") = 64)
);
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_provider_check";--> statement-breakpoint
ALTER TABLE "api_abuse_cases" ADD CONSTRAINT "api_abuse_cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_abuse_events" ADD CONSTRAINT "api_abuse_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."api_abuse_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_abuse_events" ADD CONSTRAINT "api_abuse_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_abuse_cases_user_state_idx" ON "api_abuse_cases" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "api_abuse_cases_open_signal_uidx" ON "api_abuse_cases" USING btree ("user_id","primary_signal") WHERE "api_abuse_cases"."state" in ('WATCH', 'WARNED', 'SUSPENDED');--> statement-breakpoint
CREATE INDEX "api_abuse_cases_state_last_signal_idx" ON "api_abuse_cases" USING btree ("state","last_signal_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "api_abuse_events_case_occurred_idx" ON "api_abuse_events" USING btree ("case_id","occurred_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "api_abuse_events_user_occurred_idx" ON "api_abuse_events" USING btree ("user_id","occurred_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "api_abuse_events_expires_idx" ON "api_abuse_events" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "clerk_billing_events_type_processed_idx" ON "clerk_billing_events" USING btree ("event_type","processed_at" DESC NULLS FIRST);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_check" CHECK ("subscriptions"."provider" in ('paddle', 'clerk_billing'));