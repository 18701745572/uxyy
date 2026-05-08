-- 仓库主档（与 Drizzle schema warehouses 一致）

CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" serial PRIMARY KEY NOT NULL,
    "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
    "name" varchar(100) NOT NULL,
    "code" varchar(50),
    "address" text,
    "manager_id" integer REFERENCES "users"("id"),
    "phone" varchar(20),
    "is_default" boolean DEFAULT false,
    "status" varchar(20) DEFAULT 'active',
    "remark" text,
    "created_by" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "warehouses_enterprise_idx" ON "warehouses" ("enterprise_id");
CREATE INDEX IF NOT EXISTS "warehouses_status_idx" ON "warehouses" ("status");
