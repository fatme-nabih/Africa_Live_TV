ALTER TABLE "playback_events" DROP CONSTRAINT "playback_events_player_engine_check";--> statement-breakpoint
ALTER TABLE "playback_sessions" DROP CONSTRAINT "playback_sessions_device_id_fkey";
--> statement-breakpoint
ALTER TABLE "playback_sessions" ALTER COLUMN "device_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "playback_events" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "playback_events" ADD COLUMN "playback_session_id" text;--> statement-breakpoint
ALTER TABLE "playback_events" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "playback_events" ADD COLUMN "request_id" text;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD COLUMN "schema_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD COLUMN "player_engine" text;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD COLUMN "started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
UPDATE "playback_events"
SET "schema_version" = 0,
    "player_engine" = CASE
      WHEN "player_engine" IN ('hls.js', 'native-hls', 'media_kit', 'flutter', 'vlc') THEN "player_engine"
      ELSE NULL
    END;--> statement-breakpoint
UPDATE "playback_sessions"
SET "schema_version" = 0,
    "started_at" = "created_at",
    "ended_at" = CASE WHEN "status" IN ('stopped', 'expired') THEN COALESCE("last_heartbeat_at", "created_at") ELSE NULL END;--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_playback_session_id_fkey" FOREIGN KEY ("playback_session_id") REFERENCES "public"."playback_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_stream_id_fkey" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "playback_events_session_event_idx" ON "playback_events" USING btree ("playback_session_id","event");--> statement-breakpoint
CREATE INDEX "playback_events_user_received_idx" ON "playback_events" USING btree ("user_id","received_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "playback_events_stream_session_idx" ON "playback_events" USING btree ("stream_id","playback_session_id");--> statement-breakpoint
CREATE INDEX "playback_sessions_stream_started_idx" ON "playback_sessions" USING btree ("stream_id","started_at" DESC NULLS FIRST);--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_schema_version_check" CHECK ("playback_events"."schema_version" in (0, 1));--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_error_code_length_check" CHECK ("playback_events"."error_code" is null or char_length("playback_events"."error_code") <= 100);--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_error_message_length_check" CHECK ("playback_events"."error_message" is null or char_length("playback_events"."error_message") <= 1000);--> statement-breakpoint
ALTER TABLE "playback_events" ADD CONSTRAINT "playback_events_player_engine_check" CHECK ("playback_events"."player_engine" is null or "playback_events"."player_engine" in ('hls.js', 'native-hls', 'media_kit', 'flutter', 'vlc'));--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_schema_version_check" CHECK ("playback_sessions"."schema_version" in (0, 1));--> statement-breakpoint
ALTER TABLE "playback_sessions" ADD CONSTRAINT "playback_sessions_player_engine_check" CHECK ("playback_sessions"."player_engine" is null or "playback_sessions"."player_engine" in ('hls.js', 'native-hls', 'media_kit', 'flutter', 'vlc'));
