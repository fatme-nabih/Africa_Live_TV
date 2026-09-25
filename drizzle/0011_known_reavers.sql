DROP INDEX "channels_active_name_idx";--> statement-breakpoint
CREATE INDEX "channels_active_name_id_idx" ON "channels" USING btree ("active","name","id");--> statement-breakpoint
CREATE INDEX "streams_availability_idx" ON "streams" USING btree ("active","verification_state","last_success_at");