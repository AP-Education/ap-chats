ALTER TABLE "workspace_members" ADD COLUMN "notifications_muted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "muted_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "notification_level" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_notification_level_check" CHECK ("workspace_members"."notification_level" in ('default', 'all', 'mentions', 'none'));