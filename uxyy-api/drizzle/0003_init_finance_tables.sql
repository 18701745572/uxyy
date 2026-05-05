CREATE TYPE "public"."balance_direction" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('unverified', 'verified', 'entered', 'void');--> statement-breakpoint
CREATE TYPE "public"."invoice_type" AS ENUM('special', 'normal', 'electronic');--> statement-breakpoint
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
ALTER TABLE "account_subjects" ADD CONSTRAINT "account_subjects_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_subjects" ADD CONSTRAINT "account_subjects_parent_id_account_subjects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."account_subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_entries" ADD CONSTRAINT "voucher_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;