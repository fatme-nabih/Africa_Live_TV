ALTER TABLE "naboopay_transactions" ADD COLUMN "checkout_attempt_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "naboopay_transactions" ADD COLUMN "currency" text DEFAULT 'XOF' NOT NULL;--> statement-breakpoint
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_amount_check" CHECK ("naboopay_transactions"."amount" > 0);