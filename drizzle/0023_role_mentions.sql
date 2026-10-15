CREATE TABLE "message_role_mentions" (
	"message_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	CONSTRAINT "message_role_mentions_message_id_member_id_role_id_pk" PRIMARY KEY("message_id","member_id","role_id")
);
--> statement-breakpoint
ALTER TABLE "message_mentions" DROP CONSTRAINT "message_mentions_via_check";--> statement-breakpoint
ALTER TABLE "message_role_mentions" ADD CONSTRAINT "message_role_mentions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_role_mentions" ADD CONSTRAINT "message_role_mentions_mention_fk" FOREIGN KEY ("message_id","member_id") REFERENCES "public"."message_mentions"("message_id","member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_role_mentions_role_idx" ON "message_role_mentions" USING btree ("role_id");--> statement-breakpoint
ALTER TABLE "message_mentions" ADD CONSTRAINT "message_mentions_via_check" CHECK ("message_mentions"."via" in ('direct', 'role', 'everyone'));--> statement-breakpoint
CREATE VIEW "public"."active_role_members" AS (
  select rm.workspace_id, rm.role_id, rm.member_id, r.name, r.color, r.position, r.is_hoisted
  from role_members rm
  join roles r on r.id = rm.role_id
  join workspace_members m on m.id = rm.member_id and m.status = 'active'
);--> statement-breakpoint
-- Replaced in place: channel_member_access is built on it.
CREATE OR REPLACE VIEW "public"."channel_access_sources" AS (
  select g.workspace_id, g.channel_id, m.id as member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.workspace_id = g.workspace_id and m.status = 'active'
  where g.principal = 'everyone'
  union all
  select g.workspace_id, g.channel_id, rm.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join active_role_members rm on rm.role_id = g.role_id
  where g.principal = 'role'
  union all
  select g.workspace_id, g.channel_id, g.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.id = g.member_id and m.status = 'active'
  where g.principal = 'member'
);