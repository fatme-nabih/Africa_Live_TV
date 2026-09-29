CREATE TABLE "support_request_events" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_clerk_user_id" text,
	"note" text,
	"affected_stream_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_request_events_type_check" CHECK ("support_request_events"."event_type" in ('submitted', 'in_review', 'sources_disabled', 'closed_no_action')),
	CONSTRAINT "support_request_events_note_length_check" CHECK ("support_request_events"."note" is null or char_length("support_request_events"."note") <= 1000)
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"channel_name" text,
	"source_url" text,
	"status" text DEFAULT 'new' NOT NULL,
	"resolution_note" text,
	"handled_by_clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_subject_check" CHECK ("support_requests"."subject" in ('playback', 'billing', 'channel', 'removal', 'partnership', 'other')),
	CONSTRAINT "support_requests_status_check" CHECK ("support_requests"."status" in ('new', 'in_review', 'sources_disabled', 'closed_no_action')),
	CONSTRAINT "support_requests_name_length_check" CHECK (char_length("support_requests"."name") between 1 and 120),
	CONSTRAINT "support_requests_email_length_check" CHECK (char_length("support_requests"."email") between 3 and 320),
	CONSTRAINT "support_requests_message_length_check" CHECK (char_length("support_requests"."message") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "support_request_events" ADD CONSTRAINT "support_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_request_events_request_created_idx" ON "support_request_events" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "support_requests_status_created_idx" ON "support_requests" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_requests_email_created_idx" ON "support_requests" USING btree ("email","created_at" DESC NULLS LAST);