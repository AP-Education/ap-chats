ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_attachments_check";--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "scheduled_messages_attachments_idx" ON "scheduled_messages" USING gin ("attachments");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_attachments_check" CHECK (jsonb_typeof("chat_messages"."attachments") = 'array' AND jsonb_array_length("chat_messages"."attachments") <= 25);--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_attachments_check" CHECK (jsonb_typeof("scheduled_messages"."attachments") = 'array' AND jsonb_array_length("scheduled_messages"."attachments") <= 25);