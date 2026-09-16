ALTER TABLE "streams" DROP CONSTRAINT "streams_verification_state_check";--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "direct_eligibility" text DEFAULT 'REVIEW_REQUIRED' NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "eligibility_reason" text DEFAULT 'NOT_REVALIDATED' NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "eligibility_checked_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "streams_direct_eligibility_idx" ON "streams" USING btree ("direct_eligibility");--> statement-breakpoint
CREATE INDEX "streams_active_direct_eligibility_idx" ON "streams" USING btree ("active","direct_eligibility");--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_direct_eligibility_check" CHECK ("streams"."direct_eligibility" in ('PUBLIC_DIRECT_WEB', 'PUBLIC_DIRECT_VLC', 'REVIEW_REQUIRED', 'OFFLINE'));--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_verification_state_check" CHECK ("streams"."verification_state" in ('NEVER_CHECKED', 'HEALTHY', 'STALE', 'TEMPORARY_FAILURE', 'CONFIRMED_FAILURE'));