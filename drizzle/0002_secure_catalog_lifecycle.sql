CREATE TABLE "catalog_import_channels" (
	"import_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"tvg_id" text,
	"logo_url" text,
	"group_title" text,
	"country_code" text,
	"language" text,
	CONSTRAINT "catalog_import_channels_pkey" PRIMARY KEY("import_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_import_streams" (
	"import_id" text NOT NULL,
	"stream_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"url" text NOT NULL,
	"mixed_content" boolean DEFAULT false NOT NULL,
	CONSTRAINT "catalog_import_streams_pkey" PRIMARY KEY("import_id","stream_id"),
	CONSTRAINT "catalog_import_streams_import_url_key" UNIQUE("import_id","url")
);
--> statement-breakpoint
CREATE TABLE "catalog_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"content_sha256" text NOT NULL,
	"status" text DEFAULT 'STAGING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"channel_count" integer DEFAULT 0 NOT NULL,
	"stream_count" integer DEFAULT 0 NOT NULL,
	"added_channels" integer DEFAULT 0 NOT NULL,
	"updated_channels" integer DEFAULT 0 NOT NULL,
	"disappeared_channels" integer DEFAULT 0 NOT NULL,
	"added_streams" integer DEFAULT 0 NOT NULL,
	"updated_streams" integer DEFAULT 0 NOT NULL,
	"disappeared_streams" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"report" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "catalog_imports_status_check" CHECK ("catalog_imports"."status" in ('STAGING', 'PUBLISHED', 'FAILED')),
	CONSTRAINT "catalog_imports_counts_check" CHECK ("catalog_imports"."channel_count" >= 0 and "catalog_imports"."stream_count" >= 0 and "catalog_imports"."error_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "first_seen_import_id" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "last_seen_import_id" text;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "inactive_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "first_seen_import_id" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "last_seen_import_id" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "inactive_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "verification_state" text DEFAULT 'NEVER_CHECKED' NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "consecutive_failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "last_success_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "next_check_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "final_url" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "streams"
SET
	"verification_state" = CASE
		WHEN "status" IN ('BROWSER_OK', 'VLC_ONLY') THEN 'HEALTHY'
		WHEN "status" = 'OFFLINE' THEN 'CONFIRMED_FAILURE'
		ELSE 'NEVER_CHECKED'
	END,
	"consecutive_failures" = CASE WHEN "status" = 'OFFLINE' THEN 3 ELSE 0 END,
	"last_success_at" = CASE
		WHEN "status" IN ('BROWSER_OK', 'VLC_ONLY') THEN "last_checked_at"
		ELSE NULL
	END,
	"next_check_at" = now(),
	"final_url" = "url";
--> statement-breakpoint
ALTER TABLE "catalog_import_channels" ADD CONSTRAINT "catalog_import_channels_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_import_streams" ADD CONSTRAINT "catalog_import_streams_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_imports_source_started_idx" ON "catalog_imports" USING btree ("source","started_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "catalog_imports_status_started_idx" ON "catalog_imports" USING btree ("status","started_at");--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_first_seen_import_id_fkey" FOREIGN KEY ("first_seen_import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_last_seen_import_id_fkey" FOREIGN KEY ("last_seen_import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_first_seen_import_id_fkey" FOREIGN KEY ("first_seen_import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_last_seen_import_id_fkey" FOREIGN KEY ("last_seen_import_id") REFERENCES "public"."catalog_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_active_name_idx" ON "channels" USING btree ("active","name");--> statement-breakpoint
CREATE INDEX "streams_active_next_check_idx" ON "streams" USING btree ("active","next_check_at");--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_verification_state_check" CHECK ("streams"."verification_state" in ('NEVER_CHECKED', 'HEALTHY', 'TEMPORARY_FAILURE', 'CONFIRMED_FAILURE'));--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_consecutive_failures_check" CHECK ("streams"."consecutive_failures" >= 0);
