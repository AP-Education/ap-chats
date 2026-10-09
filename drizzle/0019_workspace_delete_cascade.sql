ALTER TABLE "calls" DROP CONSTRAINT "calls_started_by_workspace_fk";
--> statement-breakpoint
ALTER TABLE "channel_memberships" DROP CONSTRAINT "channel_memberships_member_workspace_fk";
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_creator_workspace_fk";
--> statement-breakpoint
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_author_workspace_fk";
--> statement-breakpoint
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_forward_author_workspace_fk";
--> statement-breakpoint
ALTER TABLE "direct_messages" DROP CONSTRAINT "direct_messages_first_member_fk";
--> statement-breakpoint
ALTER TABLE "direct_messages" DROP CONSTRAINT "direct_messages_second_member_fk";
--> statement-breakpoint
ALTER TABLE "message_mentions" DROP CONSTRAINT "message_mentions_member_workspace_fk";
--> statement-breakpoint
ALTER TABLE "message_pins" DROP CONSTRAINT "message_pins_actor_workspace_fk";
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_started_by_workspace_fk" FOREIGN KEY ("workspace_id","started_by_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_memberships" ADD CONSTRAINT "channel_memberships_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_creator_workspace_fk" FOREIGN KEY ("workspace_id","created_by_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_author_workspace_fk" FOREIGN KEY ("workspace_id","author_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_forward_author_workspace_fk" FOREIGN KEY ("workspace_id","forwarded_from_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_first_member_fk" FOREIGN KEY ("workspace_id","first_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_second_member_fk" FOREIGN KEY ("workspace_id","second_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_pins" ADD CONSTRAINT "message_pins_actor_workspace_fk" FOREIGN KEY ("workspace_id","pinned_by_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE cascade ON UPDATE no action;