-- 添加回款记录表
-- Migration: 0012_add_payment_records

-- 创建回款记录表
CREATE TABLE IF NOT EXISTS "payment_records" (
    "id" serial PRIMARY KEY,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "customer_id" integer NOT NULL REFERENCES "customers"("id"),
    "order_id" integer REFERENCES "sales_orders"("id"),
    "order_no" varchar(50),
    "amount" numeric(12, 2) NOT NULL,
    "payment_method" varchar(20) NOT NULL,
    "payment_date" timestamp DEFAULT now() NOT NULL,
    "reference_no" varchar(50),
    "remark" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "payment_records_enterprise_idx" ON "payment_records"("enterprise_id");
CREATE INDEX IF NOT EXISTS "payment_records_customer_idx" ON "payment_records"("customer_id");
CREATE INDEX IF NOT EXISTS "payment_records_order_idx" ON "payment_records"("order_id");
CREATE INDEX IF NOT EXISTS "payment_records_date_idx" ON "payment_records"("payment_date");
