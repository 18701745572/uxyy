CREATE TYPE "public"."voucher_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'posted', 'void');--> statement-breakpoint
CREATE TABLE "sales_outbound_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"product_code" varchar(50) NOT NULL,
	"unit" varchar(20) DEFAULT '件',
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"batch_no" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "sales_outbound_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"customer_id" integer NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"warehouse_id" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"remark" text,
	"created_by" integer NOT NULL,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_outbound_orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "account_mapping_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"business_type" varchar(50) NOT NULL,
	"sub_type" varchar(50),
	"debit_account_id" integer,
	"credit_account_id" integer,
	"description" text,
	"priority" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20) NOT NULL,
	"comment" text,
	"performed_by" integer NOT NULL,
	"performed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_item_auxiliaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_item_id" integer NOT NULL,
	"auxiliary_type" varchar(20) NOT NULL,
	"auxiliary_id" integer NOT NULL,
	"auxiliary_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"auto_backup" boolean DEFAULT true,
	"backup_frequency" varchar(20) DEFAULT 'daily',
	"backup_time" varchar(10) DEFAULT '02:00',
	"retention_days" integer DEFAULT 30,
	"include_files" boolean DEFAULT false,
	"encryption_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"backup_type" varchar(20) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"file_size" integer NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"checksum" varchar(64),
	"metadata" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."voucher_status";--> statement-breakpoint
ALTER TABLE "vouchers" ALTER COLUMN "status" SET DATA TYPE "public"."voucher_status" USING "status"::"public"."voucher_status";--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "source_type" varchar(50);--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "source_id" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "submitted_by" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "reject_reason" text;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "posted_by" integer;--> statement-breakpoint
ALTER TABLE "vouchers" ADD COLUMN "posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "sales_outbound_items" ADD CONSTRAINT "sales_outbound_items_order_id_sales_outbound_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_outbound_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_items" ADD CONSTRAINT "sales_outbound_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_orders" ADD CONSTRAINT "sales_outbound_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_orders" ADD CONSTRAINT "sales_outbound_orders_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_orders" ADD CONSTRAINT "sales_outbound_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_orders" ADD CONSTRAINT "sales_outbound_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_outbound_orders" ADD CONSTRAINT "sales_outbound_orders_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_mapping_rules" ADD CONSTRAINT "account_mapping_rules_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_mapping_rules" ADD CONSTRAINT "account_mapping_rules_debit_account_id_accounts_id_fk" FOREIGN KEY ("debit_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_mapping_rules" ADD CONSTRAINT "account_mapping_rules_credit_account_id_accounts_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_mapping_rules" ADD CONSTRAINT "account_mapping_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_audits" ADD CONSTRAINT "voucher_audits_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_audits" ADD CONSTRAINT "voucher_audits_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_item_auxiliaries" ADD CONSTRAINT "voucher_item_auxiliaries_voucher_item_id_voucher_items_id_fk" FOREIGN KEY ("voucher_item_id") REFERENCES "public"."voucher_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_configs" ADD CONSTRAINT "backup_configs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_records" ADD CONSTRAINT "backup_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_outbound_items_order_idx" ON "sales_outbound_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sales_outbound_items_product_idx" ON "sales_outbound_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_outbound_orders_enterprise_idx" ON "sales_outbound_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "sales_outbound_orders_order_idx" ON "sales_outbound_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sales_outbound_orders_status_idx" ON "sales_outbound_orders" USING btree ("enterprise_id","status");--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;