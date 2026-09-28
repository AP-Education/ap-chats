ALTER TABLE "chat_messages" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "forwarded_from_member_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "request_digest" text;--> statement-breakpoint
UPDATE "chat_messages" AS forwarded
SET "forwarded_from_member_id" = source."author_member_id"
FROM "chat_messages" AS source
WHERE forwarded."forwarded_from_message_id" = source."id";--> statement-breakpoint
UPDATE "chat_messages"
SET "request_digest" = md5("id"::text)
WHERE "request_digest" IS NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "request_digest" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_forward_author_workspace_fk" FOREIGN KEY ("workspace_id","forwarded_from_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_revision_check" CHECK ("chat_messages"."revision" >= 1);
