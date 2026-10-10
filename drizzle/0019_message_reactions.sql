CREATE TABLE "message_reactions" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_reactions_message_id_emoji_member_id_pk" PRIMARY KEY("message_id","emoji","member_id")
);
--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_channel_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."message_reaction_summaries" AS (select "message_id", "emoji", count(*)::int as "count", (array_agg("member_id" order by "created_at" desc))[1:3] as "recent_member_ids", min("created_at") as "first_reacted_at" from "message_reactions" group by "message_reactions"."message_id", "message_reactions"."emoji");