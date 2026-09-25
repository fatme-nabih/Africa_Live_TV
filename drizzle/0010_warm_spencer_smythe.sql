CREATE TABLE "naboopay_transactions" (
	"order_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plan_code" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_provider_check";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_plan_code_check";--> statement-breakpoint
ALTER TABLE "naboopay_transactions" ADD CONSTRAINT "naboopay_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_provider_check" CHECK ("subscriptions"."provider" in ('paddle', 'clerk_billing', 'naboopay'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_code_check" CHECK ("subscriptions"."plan_code" in ('lumina_all_access_monthly', 'lumina_all_access_annual'));