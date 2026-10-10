CREATE TABLE "clerk_identity_deletions" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"provider_deleted_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_profile_updated_at" timestamp with time zone;