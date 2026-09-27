DROP INDEX "message_mentions_inbox_idx";--> statement-breakpoint
CREATE INDEX "direct_messages_first_member_idx" ON "direct_messages" USING btree ("workspace_id","first_member_id");--> statement-breakpoint
CREATE INDEX "direct_messages_second_member_idx" ON "direct_messages" USING btree ("workspace_id","second_member_id");--> statement-breakpoint
ALTER TABLE "message_mentions" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "message_mentions" DROP COLUMN "read_at";