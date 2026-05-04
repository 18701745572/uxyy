CREATE TABLE "inventory_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"before_stock" integer NOT NULL,
	"after_stock" integer NOT NULL,
	"order_id" integer,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"code" varchar(50),
	"category" varchar(50),
	"unit" varchar(20) DEFAULT '件',
	"price" numeric(12, 2) DEFAULT '0',
	"cost" numeric(12, 2) DEFAULT '0',
	"stock" integer DEFAULT 0,
	"min_stock" integer DEFAULT 0,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"supplier_id" integer,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending',
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"order_no" varchar(50) NOT NULL,
	"customer_id" integer,
	"total_amount" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'pending',
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"type" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"title" varchar(200) NOT NULL,
	"tax_no" varchar(50),
	"address" varchar(255),
	"phone" varchar(20),
	"bank_name" varchar(100),
	"bank_account" varchar(50),
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"voucher_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"debit" numeric(12, 2) DEFAULT '0',
	"credit" numeric(12, 2) DEFAULT '0',
	"summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vouchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"voucher_no" varchar(50) NOT NULL,
	"voucher_date" timestamp NOT NULL,
	"total_debit" numeric(14, 2) DEFAULT '0',
	"total_credit" numeric(14, 2) DEFAULT '0',
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_logs" ADD CONSTRAINT "inventory_logs_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subjects" ADD CONSTRAINT "account_subjects_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_logs_enterprise_id_idx" ON "inventory_logs" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "products_enterprise_id_idx" ON "products" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "purchase_orders_enterprise_id_idx" ON "purchase_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "sales_orders_enterprise_id_idx" ON "sales_orders" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "account_subjects_enterprise_id_idx" ON "account_subjects" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "account_subjects_code_idx" ON "account_subjects" USING btree ("code");--> statement-breakpoint
CREATE INDEX "invoices_enterprise_id_idx" ON "invoices" USING btree ("enterprise_id");--> statement-breakpoint
CREATE INDEX "voucher_entries_voucher_id_idx" ON "voucher_entries" USING btree ("voucher_id");--> statement-breakpoint
CREATE INDEX "vouchers_enterprise_id_idx" ON "vouchers" USING btree ("enterprise_id");