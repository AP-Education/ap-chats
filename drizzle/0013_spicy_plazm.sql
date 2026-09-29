ALTER TABLE "channel_entries" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_entries" ADD COLUMN "call_id" uuid;--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_workspace_channel_id_key" UNIQUE("workspace_id","channel_id","id");--> statement-breakpoint
ALTER TABLE "channel_entries" ADD CONSTRAINT "channel_entries_call_channel_fk" FOREIGN KEY ("workspace_id","channel_id","call_id") REFERENCES "public"."calls"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_entries" ADD CONSTRAINT "channel_entries_call_key" UNIQUE("call_id");--> statement-breakpoint
ALTER TABLE "channel_entries" ADD CONSTRAINT "channel_entries_exactly_one_subject" CHECK (num_nonnulls("channel_entries"."message_id", "channel_entries"."call_id") = 1);