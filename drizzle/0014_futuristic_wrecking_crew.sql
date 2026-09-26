CREATE TABLE "naboopay_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_order_id" text NOT NULL,
	"payload_digest" text NOT NULL,
	"provider_status" text NOT NULL,
	"provider_created_at" timestamp with time zone,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"state" text DEFAULT 'received' NOT NULL,
	"error_code" text,
	"sanitized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "naboopay_webhook_events_digest_uidx" UNIQUE("payload_digest"),
	CONSTRAINT "naboopay_webhook_events_state_check" CHECK ("naboopay_webhook_events"."state" in ('received', 'processed', 'rejected', 'failed'))
);
--> statement-breakpoint
CREATE INDEX "naboopay_webhook_events_provider_order_idx" ON "naboopay_webhook_events" USING btree ("provider_order_id");--> statement-breakpoint
CREATE INDEX "naboopay_webhook_events_state_received_idx" ON "naboopay_webhook_events" USING btree ("state","received_at");