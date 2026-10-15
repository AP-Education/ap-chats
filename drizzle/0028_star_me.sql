CREATE TABLE "star_me_question_messages" (
	"workspace_id" uuid NOT NULL,
	"channel_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	CONSTRAINT "star_me_question_messages_question_id_message_id_pk" PRIMARY KEY("question_id","message_id")
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN "is_bot" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "star_me_question_messages" ADD CONSTRAINT "star_me_question_messages_question_fk" FOREIGN KEY ("workspace_id","channel_id","question_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_me_question_messages" ADD CONSTRAINT "star_me_question_messages_message_fk" FOREIGN KEY ("workspace_id","channel_id","message_id") REFERENCES "public"."chat_messages"("workspace_id","channel_id","id") ON DELETE cascade ON UPDATE no action;