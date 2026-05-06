-- 商机管理表
CREATE TABLE IF NOT EXISTS "opportunities" (
    "id" SERIAL PRIMARY KEY,
    "enterprise_id" INTEGER NOT NULL REFERENCES "enterprises"("id"),
    "customer_id" INTEGER NOT NULL REFERENCES "customers"("id"),
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) DEFAULT 'potential' NOT NULL,
    "estimated_amount" NUMERIC(12, 2),
    "actual_amount" NUMERIC(12, 2),
    "expected_close_at" TIMESTAMP,
    "actual_close_at" TIMESTAMP,
    "assigned_to" INTEGER REFERENCES "users"("id"),
    "probability" INTEGER DEFAULT 0,
    "remark" TEXT,
    "is_deleted" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "opportunities_enterprise_id_idx" ON "opportunities"("enterprise_id");
CREATE INDEX IF NOT EXISTS "opportunities_customer_id_idx" ON "opportunities"("customer_id");
CREATE INDEX IF NOT EXISTS "opportunities_status_idx" ON "opportunities"("status");
CREATE INDEX IF NOT EXISTS "opportunities_assigned_to_idx" ON "opportunities"("assigned_to");
CREATE INDEX IF NOT EXISTS "opportunities_created_at_idx" ON "opportunities"("created_at");

-- 客户分类表
CREATE TABLE IF NOT EXISTS "customer_categories" (
    "id" SERIAL PRIMARY KEY,
    "enterprise_id" INTEGER NOT NULL REFERENCES "enterprises"("id"),
    "name" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) DEFAULT 'custom' NOT NULL,
    "description" TEXT,
    "color" VARCHAR(20) DEFAULT '#1890ff',
    "sort_order" INTEGER DEFAULT 0,
    "is_deleted" BOOLEAN DEFAULT false NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "customer_categories_enterprise_id_idx" ON "customer_categories"("enterprise_id");
CREATE INDEX IF NOT EXISTS "customer_categories_type_idx" ON "customer_categories"("type");

-- 客户与分类关联表
CREATE TABLE IF NOT EXISTS "customer_category_relations" (
    "id" SERIAL PRIMARY KEY,
    "customer_id" INTEGER NOT NULL REFERENCES "customers"("id"),
    "category_id" INTEGER NOT NULL REFERENCES "customer_categories"("id"),
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "customer_cat_rel_customer_id_idx" ON "customer_category_relations"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_cat_rel_category_id_idx" ON "customer_category_relations"("category_id");
