ALTER TABLE "channels" ADD COLUMN "last_public_entry_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "channels" SET "last_public_entry_seq" = "last_entry_seq";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "assistant_owner_member_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "assistant_question_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "assistant_original_seq" bigint;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_assistant_owner_workspace_fk" FOREIGN KEY ("workspace_id","assistant_owner_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_assistant_question_channel_fk" FOREIGN KEY ("workspace_id","channel_id","assistant_question_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_assistant_owner_idx" ON "chat_messages" USING btree ("channel_id","assistant_owner_member_id");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_assistant_question_key" UNIQUE("assistant_question_id");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_assistant_publication_check" CHECK ("chat_messages"."published_at" IS NULL OR ("chat_messages"."assistant_owner_member_id" IS NOT NULL AND "chat_messages"."assistant_question_id" IS NOT NULL AND "chat_messages"."assistant_original_seq" IS NOT NULL AND "chat_messages"."author_member_id" = "chat_messages"."assistant_owner_member_id"));--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_assistant_answer_check" CHECK ("chat_messages"."assistant_question_id" IS NULL OR "chat_messages"."assistant_owner_member_id" IS NOT NULL);