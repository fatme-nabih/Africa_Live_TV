ALTER TABLE "naboopay_transactions" DROP CONSTRAINT "naboopay_transactions_status_check";--> statement-breakpoint
ALTER TABLE "naboopay_transactions" ADD COLUMN "provider_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "naboopay_webhook_events" ADD COLUMN "provider_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_status_check" CHECK ("naboopay_transactions"."status" in ('creating', 'pending', 'completed', 'failed', 'canceled', 'refunded', 'reconciliation_required'));--> statement-breakpoint
UPDATE "users" SET "trial_ends_at" = "trial_started_at" + interval '5 days';
