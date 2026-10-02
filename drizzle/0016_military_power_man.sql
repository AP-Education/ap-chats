CREATE TABLE "chat_uploads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid,
	"owner_member_id" uuid,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"object_key" text NOT NULL,
	"multipart_id" text NOT NULL,
	"state" text DEFAULT 'uploading' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "chat_uploads_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "chat_uploads_size_check" CHECK ("chat_uploads"."size" > 0 AND "chat_uploads"."size" <= 1000000000),
	CONSTRAINT "chat_uploads_state_check" CHECK ("chat_uploads"."state" IN ('uploading', 'ready', 'attached', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_uploads" ADD CONSTRAINT "chat_uploads_owner_member_id_workspace_members_id_fk" FOREIGN KEY ("owner_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_uploads_owner_state_idx" ON "chat_uploads" USING btree ("owner_member_id","state");--> statement-breakpoint
CREATE INDEX "chat_uploads_cleanup_idx" ON "chat_uploads" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "chat_messages_attachments_idx" ON "chat_messages" USING gin ("attachments");--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_attachments_check" CHECK (jsonb_typeof("chat_messages"."attachments") = 'array' AND jsonb_array_length("chat_messages"."attachments") <= 10);