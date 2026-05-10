-- 租户成员邀请（统一链路：未注册走受限注册，已注册用户走接受邀请）
CREATE TABLE IF NOT EXISTS "enterprise_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"enterprise_id" integer NOT NULL REFERENCES "enterprises"("id"),
	"invitee_phone" varchar(20) NOT NULL,
	"preset_role" varchar(20) NOT NULL CHECK ("preset_role" IN ('finance', 'sales', 'warehouse', 'oa')),
	"inviter_user_id" integer NOT NULL REFERENCES "users"("id"),
	"token_hash" varchar(64) NOT NULL UNIQUE,
	"status" varchar(20) DEFAULT 'pending' NOT NULL CHECK ("status" IN ('pending', 'accepted', 'expired', 'revoked')),
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_user_id" integer REFERENCES "users"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "enterprise_invitations_ent_phone_idx"
	ON "enterprise_invitations" ("enterprise_id", "invitee_phone");
CREATE INDEX IF NOT EXISTS "enterprise_invitations_ent_status_idx"
	ON "enterprise_invitations" ("enterprise_id", "status");
