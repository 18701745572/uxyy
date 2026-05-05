CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'dead');--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"client_key" varchar(255),
	"status" "ai_task_status" DEFAULT 'pending' NOT NULL,
	"input_payload" jsonb,
	"output_payload" jsonb,
	"error_message" text,
	"attempts" integer DEFAULT 0,
	"max_attempts" integer DEFAULT 3,
	"job_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_tasks_idempotent_key" UNIQUE("enterprise_id","task_type","client_key")
);
--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_tasks_enterprise_idx" ON "ai_tasks" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "ai_tasks_status_idx" ON "ai_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_tasks_type_idx" ON "ai_tasks" USING btree ("task_type");