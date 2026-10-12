CREATE TABLE "channel_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"capability" text NOT NULL,
	"principal" text NOT NULL,
	"role_id" uuid,
	"member_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "channel_grants_principal_key" UNIQUE NULLS NOT DISTINCT("channel_id","capability","role_id","member_id"),
	CONSTRAINT "channel_grants_principal_check" CHECK (("channel_grants"."principal" = 'everyone' and "channel_grants"."role_id" is null and "channel_grants"."member_id" is null) or ("channel_grants"."principal" = 'role' and "channel_grants"."role_id" is not null and "channel_grants"."member_id" is null) or ("channel_grants"."principal" = 'member' and "channel_grants"."member_id" is not null and "channel_grants"."role_id" is null))
);--> statement-breakpoint
CREATE TABLE "role_members" (
	"workspace_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_members_role_id_member_id_pk" PRIMARY KEY("role_id","member_id")
);--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_hoisted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_workspace_id_key" UNIQUE("workspace_id","id")
);--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_kind_check";--> statement-breakpoint
ALTER TABLE "channels" DROP CONSTRAINT "channels_name_kind_check";--> statement-breakpoint
DROP INDEX "channels_workspace_name_key";--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "access_level" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_grants" ADD CONSTRAINT "channel_grants_channel_workspace_fk" FOREIGN KEY ("workspace_id","channel_id") REFERENCES "public"."channels"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_grants" ADD CONSTRAINT "channel_grants_role_workspace_fk" FOREIGN KEY ("workspace_id","role_id") REFERENCES "public"."roles"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_grants" ADD CONSTRAINT "channel_grants_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_members" ADD CONSTRAINT "role_members_role_workspace_fk" FOREIGN KEY ("workspace_id","role_id") REFERENCES "public"."roles"("workspace_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_members" ADD CONSTRAINT "role_members_member_workspace_fk" FOREIGN KEY ("workspace_id","member_id") REFERENCES "public"."workspace_members"("workspace_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_grants_role_idx" ON "channel_grants" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "channel_grants_member_idx" ON "channel_grants" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "channel_grants_everyone_idx" ON "channel_grants" USING btree ("workspace_id") WHERE "channel_grants"."principal" = 'everyone';--> statement-breakpoint
CREATE INDEX "role_members_member_idx" ON "role_members" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_workspace_name_key" ON "roles" USING btree ("workspace_id",lower("name"));--> statement-breakpoint
CREATE VIEW "public"."channel_access_sources" AS (
  select g.workspace_id, g.channel_id, m.id as member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.workspace_id = g.workspace_id and m.status = 'active'
  where g.principal = 'everyone'
  union all
  select g.workspace_id, g.channel_id, rm.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join role_members rm on rm.role_id = g.role_id
  join workspace_members m on m.id = rm.member_id and m.status = 'active'
  where g.principal = 'role'
  union all
  select g.workspace_id, g.channel_id, g.member_id, g.capability, g.principal, g.role_id
  from channel_grants g
  join workspace_members m on m.id = g.member_id and m.status = 'active'
  where g.principal = 'member'
);--> statement-breakpoint
CREATE VIEW "public"."channel_member_access" AS (
  select workspace_id, channel_id, member_id,
    bool_or(capability <> 'view') as can_post,
    bool_or(capability = 'manage') as can_manage
  from channel_access_sources
  group by workspace_id, channel_id, member_id
);--> statement-breakpoint
UPDATE "workspace_members" SET "access_level" = "role";--> statement-breakpoint
INSERT INTO "channel_grants" ("workspace_id", "channel_id", "capability", "principal")
SELECT c."workspace_id", c."id", capability, 'everyone'
FROM "channels" c CROSS JOIN unnest(ARRAY['view', 'post']) AS capability
WHERE c."kind" = 'public';--> statement-breakpoint
INSERT INTO "channel_grants" ("workspace_id", "channel_id", "capability", "principal", "member_id")
SELECT cm."workspace_id", cm."channel_id", 'post', 'member', cm."member_id"
FROM "channel_memberships" cm
JOIN "channels" c ON c."id" = cm."channel_id" AND c."kind" = 'private'
JOIN "workspace_members" m ON m."id" = cm."member_id" AND m."status" = 'active';--> statement-breakpoint
INSERT INTO "channel_grants" ("workspace_id", "channel_id", "capability", "principal", "member_id")
SELECT c."workspace_id", c."id", 'manage', 'member', c."created_by_member_id"
FROM "channels" c
JOIN "workspace_members" m ON m."id" = c."created_by_member_id" AND m."status" = 'active'
WHERE c."kind" IN ('public', 'private');--> statement-breakpoint
UPDATE "channels" SET "kind" = 'channel' WHERE "kind" IN ('public', 'private');--> statement-breakpoint
INSERT INTO "channel_memberships" ("workspace_id", "channel_id", "member_id", "last_read_entry_seq")
SELECT DISTINCT s."workspace_id", s."channel_id", s."member_id", c."last_entry_seq"
FROM "channel_access_sources" s
JOIN "channels" c ON c."id" = s."channel_id"
ON CONFLICT ("channel_id", "member_id") DO NOTHING;--> statement-breakpoint
DELETE FROM "channel_memberships" cm
USING "channels" c
WHERE c."id" = cm."channel_id" AND c."kind" = 'channel'
AND NOT EXISTS (
  SELECT 1 FROM "channel_access_sources" s
  WHERE s."channel_id" = cm."channel_id" AND s."member_id" = cm."member_id"
);--> statement-breakpoint
CREATE UNIQUE INDEX "channels_workspace_name_key" ON "channels" USING btree ("workspace_id",lower("name")) WHERE "channels"."kind" = 'channel';--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_kind_check" CHECK ("channels"."kind" in ('channel', 'dm'));--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_name_kind_check" CHECK (("channels"."kind" = 'dm' and "channels"."name" is null and "channels"."category_id" is null) or ("channels"."kind" = 'channel' and "channels"."name" is not null));
