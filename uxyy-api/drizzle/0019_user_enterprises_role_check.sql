-- 企业成员角色仅存五种规范码；迁移前先将历史别名写回规范值
UPDATE "user_enterprises" SET "role" = 'boss' WHERE lower(trim("role")) IN ('owner');
UPDATE "user_enterprises" SET "role" = 'oa' WHERE lower(trim("role")) IN ('admin');

ALTER TABLE "user_enterprises" DROP CONSTRAINT IF EXISTS "user_enterprises_role_ck";
ALTER TABLE "user_enterprises" ADD CONSTRAINT "user_enterprises_role_ck" CHECK ("role" IN ('boss', 'finance', 'sales', 'warehouse', 'oa'));
