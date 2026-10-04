CREATE TABLE "user_followed_countries" (
	"user_id" text NOT NULL,
	"country_code" text NOT NULL,
	"position" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_followed_countries_pkey" PRIMARY KEY("user_id","country_code"),
	CONSTRAINT "user_followed_countries_user_position_key" UNIQUE("user_id","position"),
	CONSTRAINT "user_followed_countries_code_check" CHECK ("user_followed_countries"."country_code" ~ '^[A-Z]{2}$'),
	CONSTRAINT "user_followed_countries_position_check" CHECK ("user_followed_countries"."position" between 0 and 4)
);
--> statement-breakpoint
ALTER TABLE "user_followed_countries" ADD CONSTRAINT "user_followed_countries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;