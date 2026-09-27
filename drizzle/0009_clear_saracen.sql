ALTER TABLE "message_mentions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "message_mentions_inbox_idx" ON "message_mentions" USING btree ("member_id","read_at","created_at","message_id");