DELETE FROM "channels" WHERE "archived_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "channels" DROP COLUMN "archived_at";
