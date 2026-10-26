CREATE TYPE "public"."notification_type" AS ENUM('need_claimed', 'need_fulfilled', 'org_approved', 'org_rejected');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid,
	"type" "notification_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notification_request_matches_type" CHECK (("notifications"."type" IN ('need_claimed', 'need_fulfilled')) = ("notifications"."request_id" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_food_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."food_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");