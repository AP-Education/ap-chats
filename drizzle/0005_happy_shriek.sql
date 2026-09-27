CREATE TABLE "channel_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"seq" bigint NOT NULL,
	"message_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_entries_channel_seq_key" UNIQUE("channel_id","seq"),
	CONSTRAINT "channel_entries_message_key" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_member_id" uuid NOT NULL,
	"content_markdown" text NOT NULL,
	"content_version" integer DEFAULT 1 NOT NULL,
	"reply_to_message_id" uuid,
	"quote_text" text,
	"forwarded_from_message_id" uuid,
	"client_nonce" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chat_messages_workspace_channel_id_key" UNIQUE("workspace_id","channel_id","id"),
	CONSTRAINT "chat_messages_channel_author_nonce_key" UNIQUE("channel_id","author_member_id","client_nonce"),
	CONSTRAINT "chat_messages_content_version_check" CHECK ("chat_messages"."content_version" = 1)
);
--> statement-breakpoint
CREATE TABLE "message_mentions" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	CONSTRAINT "message_mentions_message_id_member_id_pk" PRIMARY KEY("message_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "message_pins" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"pinned_by_member_id" uuid NOT NULL,
	"pinned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_pins_channel_id_message_id_pk" PRIMARY KEY("channel_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "channel_memberships" ADD COLUMN "last_read_entry_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" ADD COLUMN "last_entry_seq" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_entries" ADD CONSTRAINT "channel_entries_channel_workspace_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_entries" ADD CONSTRAINT "channel_entries_message_channel_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_workspace_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_workspace_fk" FOREIGN KEY ("workspace_id","author_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_channel_fk" FOREIGN KEY ("workspace_id","channel_id","reply_to_message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_forward_source_fk" FOREIGN KEY ("forwarded_from_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_message_channel_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_message_channel_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_actor_workspace_fk" FOREIGN KEY ("workspace_id","pinned_by_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_entries_channel_seq_desc_idx" ON "channel_entries" USING btree ("channel_id","seq" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chat_messages_reply_idx" ON "chat_messages" USING btree ("reply_to_message_id");