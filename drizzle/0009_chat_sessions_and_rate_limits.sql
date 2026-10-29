CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_hash" text NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"transcript_hmac" text NOT NULL,
	"reservation_id" uuid,
	"reservation_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chat_sessions_cookie_hash_unique" UNIQUE("cookie_hash"),
	CONSTRAINT "chat_sessions_turn_count" CHECK ("chat_sessions"."turn_count" between 0 and 10),
	CONSTRAINT "chat_sessions_reservation_pair" CHECK (("chat_sessions"."reservation_id" is null) = ("chat_sessions"."reservation_expires_at" is null))
);
--> statement-breakpoint
CREATE INDEX "chat_sessions_expires_at_idx" ON "chat_sessions" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "chat_rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"hits" timestamp with time zone[] DEFAULT '{}'::timestamptz[] NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_rate_limits_expires_at_idx" ON "chat_rate_limits" USING btree ("expires_at");
