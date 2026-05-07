CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."approval_flow_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."approval_flow_type" AS ENUM('purchase', 'sales', 'reimbursement', 'leave');--> statement-breakpoint
CREATE TYPE "public"."approval_record_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."balance_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unverified', 'verified', 'entered', 'void');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('special', 'normal', 'electronic');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('draft', 'pending', 'approved', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "customer_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) DEFAULT 'custom' NOT NULL,
	"description" text,
	"color" varchar(20) DEFAULT '#1890ff',
	"sort_order" integer DEFAULT 0,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_category_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'potential' NOT NULL,
	"estimated_amount" numeric(12, 2),
	"actual_amount" numeric(12, 2),
	"expected_close_at" timestamp,
	"actual_close_at" timestamp,
	"assigned_to" integer,
	"probability" integer DEFAULT 0,
	"remark" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer DEFAULT 1,
	"quantity" numeric(12, 2) NOT NULL,
	"batch_no" varchar(50),
	"expiry_date" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"before_qty" numeric(12, 2) NOT NULL,
	"after_qty" numeric(12, 2) NOT NULL,
	"source_type" varchar(20),
	"source_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"parent_id" integer,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"category_id" integer,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"spec" varchar(100),
	"unit" varchar(20) DEFAULT '件',
	"unit_price" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"min_stock" numeric(12, 2) DEFAULT '0',
	"max_stock" numeric(12, 2),
	"status" varchar(20) DEFAULT 'active',
	"retail_ext" jsonb,
	"auto_parts_ext" jsonb,
	"food_ext" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"received_qty" numeric(12, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"remark" text,
	"created_by" integer NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "sales_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"delivered_qty" numeric(12, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"payable_amount" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'draft' NOT NULL,
	"delivery_type" varchar(20) DEFAULT 'self',
	"remark" text,
	"created_by" integer NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sales_orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "stock_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"current_stock" numeric(12, 2) NOT NULL,
	"threshold" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocktaking_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"book_qty" numeric(12, 2) NOT NULL,
	"actual_qty" numeric(12, 2),
	"diff_qty" numeric(12, 2),
	"remark" text
);
--> statement-breakpoint
CREATE TABLE "stocktaking_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"warehouse_id" integer DEFAULT 1,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"remark" text,
	"created_by" integer NOT NULL,
	"confirmed_by" integer,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"contact_name" varchar(50),
	"phone" varchar(20),
	"address" text,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(50) NOT NULL,
	"category" varchar(20) NOT NULL,
	"parent_id" integer,
	"balance_direction" "balance_direction" DEFAULT 'debit' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"invoice_no" varchar(50) NOT NULL,
	"invoice_code" varchar(20),
	"type" "invoice_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"buyer_name" varchar(100),
	"buyer_tax_no" varchar(30),
	"seller_name" varchar(100),
	"seller_tax_no" varchar(30),
	"issue_date" timestamp,
	"status" "invoice_status" DEFAULT 'unverified' NOT NULL,
	"ocr_data" jsonb,
	"source_type" varchar(20),
	"source_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"voucher_no" varchar(50) NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_id" integer,
	"entry_date" timestamp DEFAULT now() NOT NULL,
	"debit_account" varchar(50) NOT NULL,
	"credit_account" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"summary" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" "approval_flow_type" NOT NULL,
	"steps" jsonb NOT NULL,
	"status" "approval_flow_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"business_type" varchar(50) NOT NULL,
	"business_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"remark" text,
	"status" "approval_record_status" DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"submitted_by" integer NOT NULL,
	"approved_by" integer,
	"comment" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"department" varchar(50),
	"position" varchar(50),
	"employee_no" varchar(20),
	"phone" varchar(20),
	"email" varchar(100),
	"join_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "employee_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "expense_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"attachments" jsonb,
	"ocr_data" jsonb,
	"status" "approval_record_status" DEFAULT 'pending' NOT NULL,
	"approval_record_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"days" numeric(4, 1) NOT NULL,
	"reason" text,
	"status" "approval_record_status" DEFAULT 'pending' NOT NULL,
	"approval_record_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_category_relations" ADD CONSTRAINT "customer_category_relations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_category_relations" ADD CONSTRAINT "customer_category_relations_category_id_customer_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."customer_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_up_records" ADD CONSTRAINT "follow_up_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_product_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_items" ADD CONSTRAINT "stocktaking_items_order_id_stocktaking_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."stocktaking_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_items" ADD CONSTRAINT "stocktaking_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stocktaking_orders" ADD CONSTRAINT "stocktaking_orders_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subjects" ADD CONSTRAINT "account_subjects_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subjects" ADD CONSTRAINT "account_subjects_parent_id_account_subjects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."account_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_flows" ADD CONSTRAINT "approval_flows_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_flow_id_approval_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."approval_flows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_requests" ADD CONSTRAINT "expense_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customer_categories_enterprise_id_idx" ON "customer_categories" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "customer_categories_type_idx" ON "customer_categories" USING btree ("type");--> statement-breakpoint
CREATE INDEX "customer_cat_rel_customer_id_idx" ON "customer_category_relations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_cat_rel_category_id_idx" ON "customer_category_relations" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "follow_up_customer_id_idx" ON "follow_up_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "follow_up_enterprise_id_idx" ON "follow_up_records" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "follow_up_created_at_idx" ON "follow_up_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "opportunities_enterprise_id_idx" ON "opportunities" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "opportunities_customer_id_idx" ON "opportunities" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunities_assigned_to_idx" ON "opportunities" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "opportunities_created_at_idx" ON "opportunities" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_product_enterprise_uk" ON "inventory" USING btree ("enterprise_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_product_idx" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_enterprise_idx" ON "inventory" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "inventory_logs_product_idx" ON "inventory_logs" USING btree ("enterprise_id","product_id");--> statement-breakpoint
CREATE INDEX "inventory_logs_created_idx" ON "inventory_logs" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_logs_source_idx" ON "inventory_logs" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "product_categories_enterprise_idx" ON "product_categories" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "products_enterprise_idx" ON "products" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "products_code_idx" ON "products" USING btree ("enterprise_id","code");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_order_idx" ON "purchase_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_product_idx" ON "purchase_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_enterprise_idx" ON "purchase_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "sales_order_items_order_idx" ON "sales_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sales_order_items_product_idx" ON "sales_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "sales_orders_enterprise_idx" ON "sales_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "sales_orders_customer_idx" ON "sales_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_orders_status_idx" ON "sales_orders" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "sales_orders_created_idx" ON "sales_orders" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_alerts_enterprise_idx" ON "stock_alerts" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "stock_alerts_product_idx" ON "stock_alerts" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_alerts_type_idx" ON "stock_alerts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stock_alerts_status_idx" ON "stock_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "stock_alerts_created_idx" ON "stock_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stocktaking_items_order_idx" ON "stocktaking_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stocktaking_items_product_idx" ON "stocktaking_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_enterprise_idx" ON "stocktaking_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "stocktaking_orders_status_idx" ON "stocktaking_orders" USING btree ("enterprise_id","status");--> statement-breakpoint
CREATE INDEX "suppliers_enterprise_idx" ON "suppliers" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "ai_tasks_enterprise_idx" ON "ai_tasks" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "ai_tasks_status_idx" ON "ai_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_tasks_type_idx" ON "ai_tasks" USING btree ("task_type");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "customers_name_phone_idx" ON "customers" USING btree ("name","phone");--> statement-breakpoint
CREATE INDEX "customers_assigned_to_idx" ON "customers" USING btree ("assigned_to");