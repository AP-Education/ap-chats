CREATE TABLE "event_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 10 NOT NULL,
	"payload" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"leased_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"active_until" timestamp with time zone,
	CONSTRAINT "web_push_endpoint_key" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "devices" DROP CONSTRAINT "devices_user_installation_key";--> statement-breakpoint
ALTER TABLE "devices" ALTER COLUMN "push_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "apns_environment" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_id_devices_id_fk" FOREIGN KEY ("id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_outbox_pending_idx" ON "event_outbox" USING btree ("priority","created_at");--> statement-breakpoint
CREATE INDEX "event_outbox_expiry_idx" ON "event_outbox" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "devices_user_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
-- One installation has one owner: keep its newest registration before enforcing that.
DELETE FROM "devices" WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "installation_id" ORDER BY "updated_at" DESC, "id" DESC) AS position
    FROM "devices"
  ) AS ranked WHERE position > 1
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_installation_key" UNIQUE("installation_id");