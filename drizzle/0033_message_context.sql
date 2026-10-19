CREATE TABLE "message_context" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"context_message_id" uuid NOT NULL,
	CONSTRAINT "message_context_message_id_context_message_id_pk" PRIMARY KEY("message_id","context_message_id")
);
--> statement-breakpoint
ALTER TABLE "message_context" ADD CONSTRAINT "message_context_message_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_context" ADD CONSTRAINT "message_context_context_fk" FOREIGN KEY ("workspace_id","channel_id","context_message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- The messages a StarMe question was asked about become that question's context.
INSERT INTO "message_context" ("workspace_id", "channel_id", "message_id", "context_message_id")
SELECT "workspace_id", "channel_id", "question_id", "message_id" FROM "star_me_question_messages";
