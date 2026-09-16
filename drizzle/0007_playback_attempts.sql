CREATE TABLE "playback_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"playback_session_id" text NOT NULL,
	"stream_id" text NOT NULL,
	"previous_attempt_id" text,
	"destination" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "playback_attempts_destination_check" CHECK ("playback_attempts"."destination" in ('web', 'vlc-mobile', 'vlc-local'))
);
--> statement-breakpoint
ALTER TABLE "playback_attempts" ADD CONSTRAINT "playback_attempts_session_id_fkey" FOREIGN KEY ("playback_session_id") REFERENCES "public"."playback_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_attempts" ADD CONSTRAINT "playback_attempts_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_attempts" ADD CONSTRAINT "playback_attempts_previous_attempt_id_fkey" FOREIGN KEY ("previous_attempt_id") REFERENCES "public"."playback_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playback_attempts_session_created_idx" ON "playback_attempts" USING btree ("playback_session_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "playback_attempts_stream_created_idx" ON "playback_attempts" USING btree ("stream_id","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE UNIQUE INDEX "playback_attempts_previous_attempt_uidx" ON "playback_attempts" USING btree ("previous_attempt_id") WHERE "playback_attempts"."previous_attempt_id" is not null;