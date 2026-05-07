-- 添加通知表
-- Migration: 0013_add_notifications

-- 创建通知类型枚举
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('approval', 'system', 'reminder');
    END IF;
END$$;

-- 创建通知优先级枚举
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
        CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high');
    END IF;
END$$;

-- 创建通知表
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" serial PRIMARY KEY,
    "user_id" integer NOT NULL REFERENCES "users"("id"),
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_user_read_idx" ON "notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "notifications_type_idx" ON "notifications"("type");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at");
