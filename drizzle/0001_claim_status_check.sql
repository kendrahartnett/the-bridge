ALTER TABLE "food_requests" ADD CONSTRAINT "claim_status_consistency" CHECK (("food_requests"."status" = 'open' AND "food_requests"."claimed_by" IS NULL)
        OR ("food_requests"."status" IN ('claimed', 'delivered') AND "food_requests"."claimed_by" IS NOT NULL)
        OR ("food_requests"."status" = 'cancelled' AND "food_requests"."claimed_by" IS NULL));