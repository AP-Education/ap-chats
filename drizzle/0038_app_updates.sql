CREATE TABLE "app_runtimes" (
	"platform" text NOT NULL,
	"runtime_version" text NOT NULL,
	"build_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_runtimes_pkey" PRIMARY KEY("platform","runtime_version"),
	CONSTRAINT "app_runtimes_build_number_check" CHECK ("app_runtimes"."build_number" >= 1)
);
--> statement-breakpoint
CREATE TABLE "app_update_launch_stats" (
	"platform" text NOT NULL,
	"runtime_version" text NOT NULL,
	"update_id" uuid,
	"day" date NOT NULL,
	"launches" integer DEFAULT 0 NOT NULL,
	"successes" integer DEFAULT 0 NOT NULL,
	"emergency_launches" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "app_update_launch_stats_key" UNIQUE NULLS NOT DISTINCT("platform","runtime_version","update_id","day")
);
--> statement-breakpoint
CREATE TABLE "app_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'update' NOT NULL,
	"platform" text NOT NULL,
	"channel" text NOT NULL,
	"runtime_version" text NOT NULL,
	"manifest" jsonb,
	"rollout_percent" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mandatory" boolean DEFAULT false NOT NULL,
	"source_update_id" uuid,
	"git_commit" text,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_updates_rollout_percent_check" CHECK ("app_updates"."rollout_percent" BETWEEN 0 AND 100),
	CONSTRAINT "app_updates_manifest_check" CHECK (("app_updates"."kind" = 'update') = ("app_updates"."manifest" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "app_updates" ADD CONSTRAINT "app_updates_runtime_fk" FOREIGN KEY ("platform","runtime_version") REFERENCES "public"."app_runtimes"("platform","runtime_version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_updates" ADD CONSTRAINT "app_updates_source_fk" FOREIGN KEY ("source_update_id") REFERENCES "public"."app_updates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_update_launch_stats_update_idx" ON "app_update_launch_stats" USING btree ("update_id");--> statement-breakpoint
CREATE INDEX "app_updates_offered_idx" ON "app_updates" USING btree ("platform","channel","runtime_version","created_at") WHERE "app_updates"."status" = 'active';