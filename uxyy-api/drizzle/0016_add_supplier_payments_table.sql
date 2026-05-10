CREATE TABLE "enterprise_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"invitee_phone" varchar(20) NOT NULL,
	"preset_role" varchar(20) NOT NULL,
	"inviter_user_id" integer NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enterprise_invitations_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "operation_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer,
	"user_id" integer,
	"method" varchar(10) NOT NULL,
	"path" varchar(500) NOT NULL,
	"ip" varchar(45),
	"user_agent" text,
	"request_body" text,
	"status_code" integer,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"member_no" varchar(50),
	"level_id" integer,
	"total_points" integer DEFAULT 0 NOT NULL,
	"available_points" integer DEFAULT 0 NOT NULL,
	"used_points" integer DEFAULT 0 NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_consumption" numeric(12, 2) DEFAULT '0' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"join_date" timestamp DEFAULT now() NOT NULL,
	"expire_date" timestamp,
	"last_consumption_at" timestamp,
	"remark" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_members_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
CREATE TABLE "member_levels" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"code" varchar(20) NOT NULL,
	"min_points" integer DEFAULT 0 NOT NULL,
	"max_points" integer,
	"discount_rate" numeric(5, 2) DEFAULT '100',
	"description" text,
	"benefits" text[],
	"color" varchar(20) DEFAULT '#1890ff',
	"sort_order" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"points" integer NOT NULL,
	"before_points" integer NOT NULL,
	"after_points" integer NOT NULL,
	"source_type" varchar(50),
	"source_id" integer,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"product_id" integer,
	"product_name" varchar(200) NOT NULL,
	"specification" varchar(200),
	"quantity" numeric(12, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"discount_rate" numeric(5, 2) DEFAULT '100',
	"amount" numeric(12, 2) NOT NULL,
	"remark" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"opportunity_id" integer,
	"quotation_no" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0',
	"tax_rate" numeric(5, 2) DEFAULT '0',
	"tax_amount" numeric(12, 2) DEFAULT '0',
	"payable_amount" numeric(12, 2) NOT NULL,
	"valid_until" timestamp,
	"remark" text,
	"pdf_url" text,
	"created_by" integer,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"batch_id" integer NOT NULL,
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
CREATE TABLE "payment_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"order_id" integer,
	"order_no" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"reference_no" varchar(50),
	"remark" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"batch_no" varchar(50) NOT NULL,
	"production_date" timestamp,
	"expiry_date" timestamp,
	"quantity" numeric(12, 2) NOT NULL,
	"initial_quantity" numeric(12, 2) NOT NULL,
	"cost_price" numeric(12, 2),
	"supplier_id" integer,
	"warehouse_id" integer DEFAULT 1,
	"source_type" varchar(20),
	"source_id" integer,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"remark" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_member_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"level_id" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"discount_rate" numeric(5, 2) DEFAULT '100',
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"order_id" integer,
	"order_no" varchar(50),
	"amount" numeric(12, 2) NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_date" timestamp DEFAULT now() NOT NULL,
	"reference_no" varchar(50),
	"remark" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(50),
	"address" text,
	"manager_id" integer,
	"phone" varchar(20),
	"is_default" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'active',
	"remark" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(50) NOT NULL,
	"category" varchar(20) NOT NULL,
	"parent_id" integer,
	"balance_direction" varchar(10) DEFAULT 'debit',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit_amount" numeric(12, 2) DEFAULT '0',
	"credit_amount" numeric(12, 2) DEFAULT '0',
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"voucher_no" varchar(50) NOT NULL,
	"voucher_date" timestamp DEFAULT now() NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"summary" text,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_make_up_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"type" varchar(10) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approver_id" integer,
	"approved_at" timestamp,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"enterprise_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"status" varchar(20) DEFAULT 'normal' NOT NULL,
	"work_hours" numeric(4, 1) DEFAULT '0',
	"late_minutes" integer DEFAULT 0,
	"early_minutes" integer DEFAULT 0,
	"location" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"source_type" varchar(50),
	"source_id" integer,
	"action_url" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enterprise_invitations" ADD CONSTRAINT "enterprise_invitations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_invitations" ADD CONSTRAINT "enterprise_invitations_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enterprise_invitations" ADD CONSTRAINT "enterprise_invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_audit_logs" ADD CONSTRAINT "operation_audit_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_audit_logs" ADD CONSTRAINT "operation_audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_members" ADD CONSTRAINT "customer_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_members" ADD CONSTRAINT "customer_members_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_members" ADD CONSTRAINT "customer_members_level_id_member_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."member_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_levels" ADD CONSTRAINT "member_levels_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_records" ADD CONSTRAINT "points_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_records" ADD CONSTRAINT "points_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_records" ADD CONSTRAINT "points_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_logs" ADD CONSTRAINT "batch_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_logs" ADD CONSTRAINT "batch_logs_batch_id_product_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_logs" ADD CONSTRAINT "batch_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_logs" ADD CONSTRAINT "batch_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_sales_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."sales_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_member_prices" ADD CONSTRAINT "product_member_prices_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_member_prices" ADD CONSTRAINT "product_member_prices_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_member_prices" ADD CONSTRAINT "product_member_prices_level_id_member_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."member_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_items" ADD CONSTRAINT "voucher_items_voucher_id_vouchers_id_fk" FOREIGN KEY ("voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_items" ADD CONSTRAINT "voucher_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_make_up_requests" ADD CONSTRAINT "attendance_make_up_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_make_up_requests" ADD CONSTRAINT "attendance_make_up_requests_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_make_up_requests" ADD CONSTRAINT "attendance_make_up_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "op_audit_enterprise_created_idx" ON "operation_audit_logs" USING btree ("enterprise_id","created_at");--> statement-breakpoint
CREATE INDEX "op_audit_user_created_idx" ON "operation_audit_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "customer_members_customer_id_idx" ON "customer_members" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_members_enterprise_id_idx" ON "customer_members" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "customer_members_member_no_idx" ON "customer_members" USING btree ("member_no");--> statement-breakpoint
CREATE INDEX "customer_members_level_id_idx" ON "customer_members" USING btree ("level_id");--> statement-breakpoint
CREATE INDEX "member_levels_enterprise_id_idx" ON "member_levels" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "member_levels_code_idx" ON "member_levels" USING btree ("enterprise_id","code");--> statement-breakpoint
CREATE INDEX "points_records_customer_id_idx" ON "points_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "points_records_enterprise_id_idx" ON "points_records" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "points_records_type_idx" ON "points_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "points_records_created_at_idx" ON "points_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_items_product_id_idx" ON "quotation_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "quotations_enterprise_id_idx" ON "quotations" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "quotations_customer_id_idx" ON "quotations" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "quotations_opportunity_id_idx" ON "quotations" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "quotations_status_idx" ON "quotations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotations_quotation_no_idx" ON "quotations" USING btree ("quotation_no");--> statement-breakpoint
CREATE INDEX "batch_logs_batch_idx" ON "batch_logs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "batch_logs_product_idx" ON "batch_logs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "batch_logs_created_idx" ON "batch_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_records_enterprise_idx" ON "payment_records" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "payment_records_customer_idx" ON "payment_records" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "payment_records_order_idx" ON "payment_records" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payment_records_date_idx" ON "payment_records" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "product_batches_enterprise_idx" ON "product_batches" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "product_batches_product_idx" ON "product_batches" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_batches_batch_no_idx" ON "product_batches" USING btree ("batch_no");--> statement-breakpoint
CREATE INDEX "product_batches_expiry_idx" ON "product_batches" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "product_batches_status_idx" ON "product_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_member_prices_enterprise_idx" ON "product_member_prices" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "product_member_prices_product_idx" ON "product_member_prices" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_member_prices_level_idx" ON "product_member_prices" USING btree ("level_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_member_prices_product_level_uk" ON "product_member_prices" USING btree ("product_id","level_id");--> statement-breakpoint
CREATE INDEX "supplier_payments_enterprise_idx" ON "supplier_payments" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "supplier_payments_supplier_idx" ON "supplier_payments" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_payments_order_idx" ON "supplier_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "supplier_payments_date_idx" ON "supplier_payments" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "warehouses_enterprise_idx" ON "warehouses" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "warehouses_status_idx" ON "warehouses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_makeup_user_idx" ON "attendance_make_up_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attendance_makeup_status_idx" ON "attendance_make_up_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_records_user_idx" ON "attendance_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attendance_records_enterprise_idx" ON "attendance_records" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "attendance_records_date_idx" ON "attendance_records" USING btree ("date");