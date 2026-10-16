CREATE TABLE "scheduled_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_member_id" uuid NOT NULL,
	"content_markdown" text NOT NULL,
	"reply_to_message_id" uuid,
	"quote_text" text,
	"send_at" timestamp with time zone NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"request_digest" text NOT NULL,
	"client_nonce" uuid NOT NULL,
	"failure" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_messages_channel_author_nonce_key" UNIQUE("channel_id","author_member_id","client_nonce"),
	CONSTRAINT "scheduled_messages_revision_check" CHECK ("scheduled_messages"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_channel_workspace_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_author_workspace_fk" FOREIGN KEY ("workspace_id","author_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_reply_channel_fk" FOREIGN KEY ("workspace_id","channel_id","reply_to_message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_messages_author_idx" ON "scheduled_messages" USING btree ("channel_id","author_member_id","send_at");--> statement-breakpoint
CREATE INDEX "scheduled_messages_due_idx" ON "scheduled_messages" USING btree ("send_at") WHERE "scheduled_messages"."failure" IS NULL;