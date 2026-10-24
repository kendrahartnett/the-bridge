-- Expand requests from food only to essential resources.
-- Hand-written (custom) because drizzle-kit can only ask "rename or drop+create?" in an
-- interactive terminal. RENAME keeps every existing description; drop+create would lose them.
CREATE TYPE "public"."request_category" AS ENUM('food', 'clothing', 'hygiene', 'other');--> statement-breakpoint
-- NOT NULL with a default: every existing row is filled with 'food' as the column is added.
ALTER TABLE "food_requests" ADD COLUMN "category" "request_category" DEFAULT 'food' NOT NULL;--> statement-breakpoint
ALTER TABLE "food_requests" RENAME COLUMN "food_type" TO "items";--> statement-breakpoint
ALTER TABLE "food_requests" ADD CONSTRAINT "items_length" CHECK (char_length("food_requests"."items") <= 200);
