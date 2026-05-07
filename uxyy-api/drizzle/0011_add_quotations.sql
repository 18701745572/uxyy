-- 添加报价单相关表和类型
-- Migration: 0011_add_quotations

-- 创建报价单状态枚举类型
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quotation_status') THEN
        CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
    END IF;
END$$;

-- 创建报价单主表
CREATE TABLE IF NOT EXISTS "quotations" (
    "id" serial PRIMARY KEY,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "customer_id" integer NOT NULL REFERENCES "customers"("id"),
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
    "created_by" integer REFERENCES "users"("id"),
    "is_deleted" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建报价单明细表
CREATE TABLE IF NOT EXISTS "quotation_items" (
    "id" serial PRIMARY KEY,
    "quotation_id" integer NOT NULL REFERENCES "quotations"("id"),
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "quotations_enterprise_id_idx" ON "quotations"("enterprise_id");
CREATE INDEX IF NOT EXISTS "quotations_customer_id_idx" ON "quotations"("customer_id");
CREATE INDEX IF NOT EXISTS "quotations_opportunity_id_idx" ON "quotations"("opportunity_id");
CREATE INDEX IF NOT EXISTS "quotations_status_idx" ON "quotations"("status");
CREATE INDEX IF NOT EXISTS "quotations_quotation_no_idx" ON "quotations"("quotation_no");
CREATE INDEX IF NOT EXISTS "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");
CREATE INDEX IF NOT EXISTS "quotation_items_product_id_idx" ON "quotation_items"("product_id");
