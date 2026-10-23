CREATE TYPE "public"."request_status" AS ENUM('open', 'claimed', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('outreach', 'donor');--> statement-breakpoint
CREATE TABLE "food_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"people_count" integer NOT NULL,
	"food_type" text NOT NULL,
	"dietary_notes" text,
	"neighborhood" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"status" "request_status" DEFAULT 'open' NOT NULL,
	"claimed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "people_count_range" CHECK ("food_requests"."people_count" BETWEEN 1 AND 500),
	CONSTRAINT "dietary_notes_length" CHECK ("food_requests"."dietary_notes" IS NULL OR char_length("food_requests"."dietary_notes") <= 300),
	CONSTRAINT "neighborhood_community_area" CHECK ("food_requests"."neighborhood" IN ('Albany Park', 'Archer Heights', 'Armour Square', 'Ashburn', 'Auburn Gresham', 'Austin', 'Avalon Park', 'Avondale', 'Belmont Cragin', 'Beverly', 'Bridgeport', 'Brighton Park', 'Burnside', 'Calumet Heights', 'Chatham', 'Chicago Lawn', 'Clearing', 'Douglas', 'Dunning', 'East Garfield Park', 'East Side', 'Edgewater', 'Edison Park', 'Englewood', 'Forest Glen', 'Fuller Park', 'Gage Park', 'Garfield Ridge', 'Grand Boulevard', 'Greater Grand Crossing', 'Hegewisch', 'Hermosa', 'Humboldt Park', 'Hyde Park', 'Irving Park', 'Jefferson Park', 'Kenwood', 'Lake View', 'Lincoln Park', 'Lincoln Square', 'Logan Square', 'Loop', 'Lower West Side', 'McKinley Park', 'Montclare', 'Morgan Park', 'Mount Greenwood', 'Near North Side', 'Near South Side', 'Near West Side', 'New City', 'North Center', 'North Lawndale', 'North Park', 'Norwood Park', 'O''Hare', 'Oakland', 'Portage Park', 'Pullman', 'Riverdale', 'Rogers Park', 'Roseland', 'South Chicago', 'South Deering', 'South Lawndale', 'South Shore', 'Uptown', 'Washington Heights', 'Washington Park', 'West Elsdon', 'West Englewood', 'West Garfield Park', 'West Lawn', 'West Pullman', 'West Ridge', 'West Town', 'Woodlawn')),
	CONSTRAINT "window_order" CHECK ("food_requests"."window_end" > "food_requests"."window_start")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "user_role",
	"organization_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "food_requests" ADD CONSTRAINT "food_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_requests" ADD CONSTRAINT "food_requests_claimed_by_users_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_requests_created_by_idx" ON "food_requests" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "food_requests_status_idx" ON "food_requests" USING btree ("status");