-- 操作审计日志（变更类 HTTP 请求）
-- Migration: 0016_operation_audit_logs

CREATE TABLE IF NOT EXISTS "operation_audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "enterprise_id" integer REFERENCES "enterprises"("id"),
    "user_id" integer REFERENCES "users"("id"),
    "method" varchar(10) NOT NULL,
    "path" varchar(500) NOT NULL,
    "ip" varchar(45),
    "user_agent" text,
    "request_body" text,
    "status_code" integer,
    "duration_ms" integer,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "op_audit_enterprise_created_idx" ON "operation_audit_logs" ("enterprise_id", "created_at");
CREATE INDEX IF NOT EXISTS "op_audit_user_created_idx" ON "operation_audit_logs" ("user_id", "created_at");
