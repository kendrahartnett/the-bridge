CREATE TYPE "public"."verification_status" AS ENUM('not_required', 'pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_status" "verification_status" DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_ein" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill before the role check: existing organizations were trusted before review existed.
UPDATE "users" SET "verification_status" = 'approved' WHERE "role" = 'donor';--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "verification_matches_role" CHECK (("users"."role" = 'outreach' AND "users"."verification_status" = 'not_required')
        OR ("users"."role" = 'donor' AND "users"."verification_status" IN ('pending', 'approved', 'rejected')));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "organization_ein_format" CHECK ("users"."organization_ein" IS NULL OR "users"."organization_ein" ~ '^[0-9]{2}-[0-9]{7}$');--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "review_note_length" CHECK ("users"."review_note" IS NULL OR char_length("users"."review_note") <= 300);