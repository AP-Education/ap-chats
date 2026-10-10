CREATE TABLE "message_reactions" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_emoji_member_id_pk" PRIMARY KEY("message_id","emoji","member_id"),
	CONSTRAINT "message_reactions_emoji_check" CHECK (char_length("message_reactions"."emoji") BETWEEN 1 AND 32)
);
--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_channel_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;