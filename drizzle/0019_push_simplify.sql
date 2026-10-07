-- Published rows were kept only for history; without published_at they would be relayed again.
DELETE FROM "event_outbox" WHERE "published_at" IS NOT NULL;--> statement-breakpoint
DROP INDEX "event_outbox_pending_idx";--> statement-breakpoint
CREATE INDEX "event_outbox_pending_idx" ON "event_outbox" USING btree ("priority","created_at");--> statement-breakpoint
ALTER TABLE "event_outbox" DROP COLUMN "published_at";--> statement-breakpoint
ALTER TABLE "web_push_subscriptions" DROP COLUMN "active_workspace_id";--> statement-breakpoint
ALTER TABLE "web_push_subscriptions" DROP COLUMN "active_channel_id";