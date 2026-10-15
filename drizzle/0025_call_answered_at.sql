ALTER TABLE "calls" ADD COLUMN "answered_at" timestamp with time zone;--> statement-breakpoint
-- Calls answered before this column existed were timed from their start; they keep that length.
UPDATE "calls" SET "answered_at" = "started_at" WHERE "status" IN ('active', 'ended');
