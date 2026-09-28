CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oidc_user_id" text NOT NULL,
	"display_name" text,
	"avatar_path" text,
	"synced_at" timestamp with time zone,
	CONSTRAINT "user_profiles_oidc_user_id_key" UNIQUE("oidc_user_id")
);
--> statement-breakpoint
INSERT INTO "user_profiles" ("oidc_user_id")
SELECT DISTINCT "user_id" FROM "workspace_members";--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "user_profile_id" uuid;--> statement-breakpoint
UPDATE "workspace_members" AS member
SET "user_profile_id" = profile."id"
FROM "user_profiles" AS profile
WHERE profile."oidc_user_id" = member."user_id";--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "user_profile_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspace_user_key";--> statement-breakpoint
ALTER TABLE "workspace_members" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_profile_key" UNIQUE("workspace_id","user_profile_id");
