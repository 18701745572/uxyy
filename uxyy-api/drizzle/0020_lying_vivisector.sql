CREATE TABLE "ai_learning_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"record_type" varchar(30) NOT NULL,
	"category" varchar(50) NOT NULL,
	"key" varchar(200) NOT NULL,
	"value" jsonb NOT NULL,
	"confidence" numeric(3, 2),
	"occurrence_count" integer DEFAULT 1,
	"last_occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"recommendation_type" varchar(30) NOT NULL,
	"context" jsonb NOT NULL,
	"recommendation" jsonb NOT NULL,
	"confidence" numeric(3, 2),
	"is_accepted" boolean,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_alert_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"threshold_value" numeric(12, 2),
	"notify_channels" jsonb DEFAULT '[]',
	"notify_targets" jsonb DEFAULT '[]',
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"alert_type" varchar(50) NOT NULL,
	"severity" varchar(10) NOT NULL,
	"source_type" varchar(30),
	"source_id" integer,
	"title" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"suggestion" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"resolution_note" text,
	"notified_at" timestamp,
	"notification_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_learning_records" ADD CONSTRAINT "ai_learning_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_recommendations" ADD CONSTRAINT "ai_recommendations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alert_configs" ADD CONSTRAINT "finance_alert_configs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alert_configs" ADD CONSTRAINT "finance_alert_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alerts" ADD CONSTRAINT "finance_alerts_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_alerts" ADD CONSTRAINT "finance_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;