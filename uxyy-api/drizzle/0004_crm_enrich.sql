CREATE TABLE "follow_up_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'text',
	"attachment_urls" text[],
	"next_follow_up_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "contact_person" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "type" varchar(20) DEFAULT 'enterprise';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "level" varchar(20) DEFAULT 'regular';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "industry" varchar(50);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "source" varchar(20) DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "assigned_to" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "credit_limit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "follow_up_customer_id_idx" ON "follow_up_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "follow_up_enterprise_id_idx" ON "follow_up_records" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "follow_up_created_at_idx" ON "follow_up_records" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_phone_idx" ON "customers" USING btree ("name","phone");--> statement-breakpoint
CREATE INDEX "customers_assigned_to_idx" ON "customers" USING btree ("assigned_to");