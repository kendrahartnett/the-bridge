ALTER TABLE "privacy_reviews" DROP CONSTRAINT "privacy_review_status_valid";--> statement-breakpoint
ALTER TABLE "privacy_reviews" ADD COLUMN "supersedes_review_id" uuid;--> statement-breakpoint
ALTER TABLE "privacy_reviews" ADD CONSTRAINT "privacy_reviews_supersedes_review_id_privacy_reviews_id_fk" FOREIGN KEY ("supersedes_review_id") REFERENCES "public"."privacy_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "privacy_reviews_supersedes_review_idx" ON "privacy_reviews" USING btree ("supersedes_review_id");--> statement-breakpoint
ALTER TABLE "privacy_reviews" ADD CONSTRAINT "privacy_review_status_valid" CHECK ("privacy_reviews"."status" in ('pending_review', 'changes_requested', 'approved', 'rejected', 'superseded'));
