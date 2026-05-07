-- 添加会员等级、批次管理表
-- Migration: 0014_add_member_and_batch

-- 创建会员等级表
CREATE TABLE IF NOT EXISTS "member_levels" (
    "id" serial PRIMARY KEY,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
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

-- 创建客户会员表
CREATE TABLE IF NOT EXISTS "customer_members" (
    "id" serial PRIMARY KEY,
    "customer_id" integer NOT NULL UNIQUE REFERENCES "customers"("id"),
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "member_no" varchar(50),
    "level_id" integer REFERENCES "member_levels"("id"),
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
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建积分记录表
CREATE TABLE IF NOT EXISTS "points_records" (
    "id" serial PRIMARY KEY,
    "customer_id" integer NOT NULL REFERENCES "customers"("id"),
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "type" varchar(20) NOT NULL,
    "points" integer NOT NULL,
    "before_points" integer NOT NULL,
    "after_points" integer NOT NULL,
    "source_type" varchar(50),
    "source_id" integer,
    "description" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 创建商品批次表
CREATE TABLE IF NOT EXISTS "product_batches" (
    "id" serial PRIMARY KEY,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "product_id" integer NOT NULL REFERENCES "products"("id"),
    "batch_no" varchar(50) NOT NULL,
    "production_date" timestamp,
    "expiry_date" timestamp,
    "quantity" numeric(12, 2) NOT NULL,
    "initial_quantity" numeric(12, 2) NOT NULL,
    "cost_price" numeric(12, 2),
    "supplier_id" integer REFERENCES "suppliers"("id"),
    "warehouse_id" integer DEFAULT 1,
    "source_type" varchar(20),
    "source_id" integer,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "remark" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 创建批次流水表
CREATE TABLE IF NOT EXISTS "batch_logs" (
    "id" serial PRIMARY KEY,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "batch_id" integer NOT NULL REFERENCES "product_batches"("id"),
    "product_id" integer NOT NULL REFERENCES "products"("id"),
    "type" varchar(20) NOT NULL,
    "quantity" numeric(12, 2) NOT NULL,
    "before_qty" numeric(12, 2) NOT NULL,
    "after_qty" numeric(12, 2) NOT NULL,
    "source_type" varchar(20),
    "source_id" integer,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "member_levels_enterprise_id_idx" ON "member_levels"("enterprise_id");
CREATE INDEX IF NOT EXISTS "member_levels_code_idx" ON "member_levels"("enterprise_id", "code");

CREATE INDEX IF NOT EXISTS "customer_members_customer_id_idx" ON "customer_members"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_members_enterprise_id_idx" ON "customer_members"("enterprise_id");
CREATE INDEX IF NOT EXISTS "customer_members_member_no_idx" ON "customer_members"("member_no");
CREATE INDEX IF NOT EXISTS "customer_members_level_id_idx" ON "customer_members"("level_id");

CREATE INDEX IF NOT EXISTS "points_records_customer_id_idx" ON "points_records"("customer_id");
CREATE INDEX IF NOT EXISTS "points_records_enterprise_id_idx" ON "points_records"("enterprise_id");
CREATE INDEX IF NOT EXISTS "points_records_type_idx" ON "points_records"("type");
CREATE INDEX IF NOT EXISTS "points_records_created_at_idx" ON "points_records"("created_at");

CREATE INDEX IF NOT EXISTS "product_batches_enterprise_idx" ON "product_batches"("enterprise_id");
CREATE INDEX IF NOT EXISTS "product_batches_product_idx" ON "product_batches"("product_id");
CREATE INDEX IF NOT EXISTS "product_batches_batch_no_idx" ON "product_batches"("batch_no");
CREATE INDEX IF NOT EXISTS "product_batches_expiry_idx" ON "product_batches"("expiry_date");
CREATE INDEX IF NOT EXISTS "product_batches_status_idx" ON "product_batches"("status");

CREATE INDEX IF NOT EXISTS "batch_logs_batch_idx" ON "batch_logs"("batch_id");
CREATE INDEX IF NOT EXISTS "batch_logs_product_idx" ON "batch_logs"("product_id");
CREATE INDEX IF NOT EXISTS "batch_logs_created_idx" ON "batch_logs"("created_at");
