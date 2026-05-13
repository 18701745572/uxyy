CREATE TABLE "bank_statements" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"bank_name" varchar(50) NOT NULL,
	"bank_account" varchar(50) NOT NULL,
	"account_name" varchar(100),
	"transaction_date" timestamp NOT NULL,
	"transaction_time" varchar(20),
	"direction" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance" numeric(12, 2),
	"counterparty_name" varchar(100),
	"counterparty_account" varchar(50),
	"counterparty_bank" varchar(50),
	"transaction_type" varchar(50),
	"remark" text,
	"purpose" varchar(200),
	"reference_no" varchar(50),
	"match_status" varchar(20) DEFAULT 'unmatched' NOT NULL,
	"matched_voucher_id" integer,
	"suggested_account_id" integer,
	"confidence" numeric(3, 2),
	"import_batch_id" varchar(50),
	"raw_data" jsonb,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voucher_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL,
	"template_code" varchar(20) NOT NULL,
	"template_name" varchar(50) NOT NULL,
	"description" text,
	"category" varchar(30) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"summary" text,
	"entries" jsonb NOT NULL,
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_matched_voucher_id_vouchers_id_fk" FOREIGN KEY ("matched_voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_suggested_account_id_accounts_id_fk" FOREIGN KEY ("suggested_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;