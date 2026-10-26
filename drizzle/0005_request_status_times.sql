ALTER TABLE "food_requests" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "food_requests" ADD COLUMN "fulfilled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "food_requests" ADD COLUMN "cancelled_at" timestamp with time zone;