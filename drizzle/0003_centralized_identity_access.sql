CREATE TABLE "api_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_rate_limits_request_count_check" CHECK ("api_rate_limits"."request_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_status_check";--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "grace_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp with time zone DEFAULT now() + interval '14 days' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_synced_at" timestamp with time zone;--> statement-breakpoint
UPDATE "users"
SET
	"trial_started_at" = "created_at",
	"trial_ends_at" = "created_at" + interval '14 days';
--> statement-breakpoint
UPDATE "users" AS u
SET
	"email" = COALESCE(u."email", ua."email"),
	"status" = CASE WHEN ua."status" = 'blocked' THEN 'blocked' ELSE u."status" END,
	"trial_started_at" = COALESCE(ua."access_granted_at", ua."created_at", u."created_at"),
	"trial_ends_at" = CASE
		WHEN ua."access_expires_at" IS NOT NULL THEN ua."access_expires_at"
		WHEN ua."status" = 'trial' THEN now() + interval '14 days'
		ELSE u."trial_ends_at"
	END
FROM "user_access" AS ua
WHERE ua."clerk_user_id" = u."clerk_user_id";
--> statement-breakpoint
UPDATE "subscriptions"
SET "grace_ends_at" = "current_period_end" + interval '3 days'
WHERE "current_period_end" IS NOT NULL
	AND "grace_ends_at" IS NULL;
--> statement-breakpoint
CREATE INDEX "api_rate_limits_expires_at_idx" ON "api_rate_limits" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'blocked', 'deleted'));
