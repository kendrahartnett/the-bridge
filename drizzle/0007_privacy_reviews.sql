ALTER TABLE "food_requests" ADD COLUMN "privacy_flagged" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "food_requests" ADD COLUMN "privacy_categories" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
CREATE TABLE "privacy_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "submitted_by" uuid NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'pending_review' NOT NULL,
  "risk_level" text DEFAULT 'medium' NOT NULL,
  "categories" text[] DEFAULT '{}'::text[] NOT NULL,
  "people_count" integer NOT NULL,
  "category" "request_category" NOT NULL,
  "safe_items" text NOT NULL,
  "safe_notes" text,
  "neighborhood" text NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "window_end" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "decision_reason" text,
  "published_request_id" uuid REFERENCES "food_requests"("id"),
  CONSTRAINT "privacy_review_status_valid" CHECK ("status" IN ('pending_review', 'changes_requested', 'approved', 'rejected')),
  CONSTRAINT "privacy_review_risk_valid" CHECK ("risk_level" = 'medium'),
  CONSTRAINT "privacy_review_people_count" CHECK ("people_count" BETWEEN 1 AND 500),
  CONSTRAINT "privacy_review_safe_items_length" CHECK (char_length("safe_items") BETWEEN 1 AND 200),
  CONSTRAINT "privacy_review_safe_notes_length" CHECK ("safe_notes" IS NULL OR char_length("safe_notes") <= 300),
  CONSTRAINT "privacy_review_window_order" CHECK ("window_end" > "window_start"),
  CONSTRAINT "privacy_review_decision_reason" CHECK ("decision_reason" IS NULL OR "decision_reason" IN ('privacy_detail', 'insufficient_detail', 'outside_scope'))
);
--> statement-breakpoint
CREATE INDEX "privacy_reviews_status_created_idx" ON "privacy_reviews" ("status", "created_at");
--> statement-breakpoint
CREATE INDEX "privacy_reviews_submitter_created_idx" ON "privacy_reviews" ("submitted_by", "created_at");
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'privacy_pending';
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'privacy_approved';
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'privacy_changes';
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'privacy_rejected';
--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE 'privacy_new_review';
