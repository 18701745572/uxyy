-- 考勤记录表、补卡申请表（与 `db/schema/oa.ts` 一致；此前仅有 TS schema 未迁库会导致 500）
CREATE TABLE IF NOT EXISTS "attendance_records" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
	"date" timestamp NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"status" varchar(20) DEFAULT 'normal' NOT NULL,
	"work_hours" numeric(4, 1) DEFAULT '0',
	"late_minutes" integer DEFAULT 0,
	"early_minutes" integer DEFAULT 0,
	"location" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "attendance_records_user_idx" ON "attendance_records"("user_id");
CREATE INDEX IF NOT EXISTS "attendance_records_enterprise_idx" ON "attendance_records"("enterprise_id");
CREATE INDEX IF NOT EXISTS "attendance_records_date_idx" ON "attendance_records"("date");

CREATE TABLE IF NOT EXISTS "attendance_make_up_requests" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL REFERENCES "users"("id"),
	"enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
	"date" timestamp NOT NULL,
	"type" varchar(10) NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approver_id" integer REFERENCES "users"("id"),
	"approved_at" timestamp,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "attendance_makeup_user_idx" ON "attendance_make_up_requests"("user_id");
CREATE INDEX IF NOT EXISTS "attendance_makeup_status_idx" ON "attendance_make_up_requests"("status");
