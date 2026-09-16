ALTER TABLE "sessions" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "sessions_user_status_idx" ON "sessions" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_status_check" CHECK ("sessions"."status" in ('active', 'ended', 'revoked', 'removed'));