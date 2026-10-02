ALTER TABLE "chat_uploads" ADD COLUMN "processing_token" uuid;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD COLUMN "processing_until" timestamp with time zone;