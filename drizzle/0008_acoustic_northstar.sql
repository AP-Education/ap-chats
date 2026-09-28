CREATE TABLE "direct_messages" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"first_member_id" uuid NOT NULL,
	"second_member_id" uuid NOT NULL,
	CONSTRAINT "direct_messages_channel_id_pk" PRIMARY KEY("channel_id"),
	CONSTRAINT "direct_messages_pair_key" UNIQUE("workspace_id","first_member_id","second_member_id"),
	CONSTRAINT "direct_messages_pair_order_check" CHECK ("direct_messages"."first_member_id" < "direct_messages"."second_member_id")
);
--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_kind_check";--> statement-breakpoint
DROP INDEX IF EXISTS "channels_workspace_name_key";--> statement-breakpoint
ALTER TABLE "channels" ALTER COLUMN "name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_channel_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_first_member_fk" FOREIGN KEY ("workspace_id","first_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_second_member_fk" FOREIGN KEY ("workspace_id","second_member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channels_dm_activity_idx" ON "channels" USING btree ("workspace_id","kind","updated_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_name_key" ON "channels" USING btree ("workspace_id",lower("name")) WHERE "channels"."kind" in ('public', 'private');--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_name_kind_check" CHECK (("channels"."kind" = 'dm' and "channels"."name" is null and "channels"."category_id" is null) or ("channels"."kind" in ('public', 'private') and "channels"."name" is not null));--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_kind_check" CHECK ("channels"."kind" in ('public', 'private', 'dm'));
