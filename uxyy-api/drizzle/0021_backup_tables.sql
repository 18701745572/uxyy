-- 数据备份：backup_configs、backup_records（与 src/db/schema/backup.ts 一致）

CREATE TABLE IF NOT EXISTS "backup_configs" (
  "id" serial PRIMARY KEY,
  "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
  "auto_backup" boolean DEFAULT true,
  "backup_frequency" varchar(20) DEFAULT 'daily',
  "backup_time" varchar(10) DEFAULT '02:00',
  "retention_days" integer DEFAULT 30,
  "include_files" boolean DEFAULT false,
  "encryption_enabled" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "backup_configs_enterprise_id_idx" ON "backup_configs"("enterprise_id");

CREATE TABLE IF NOT EXISTS "backup_records" (
  "id" serial PRIMARY KEY,
  "enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
  "backup_type" varchar(20) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_path" varchar(500) NOT NULL,
  "file_size" integer NOT NULL,
  "status" varchar(20) DEFAULT 'completed' NOT NULL,
  "checksum" varchar(64),
  "metadata" jsonb,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "backup_records_enterprise_id_idx" ON "backup_records"("enterprise_id");
CREATE INDEX IF NOT EXISTS "backup_records_created_at_idx" ON "backup_records"("created_at" DESC);
