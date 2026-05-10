import { readJwtAccessClaims } from "@/lib/api/jwt-payload";
import { readStoredAccessToken } from "@/lib/api/token-store";
import { Permission } from "@/lib/permissions/role-matrix";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 是否与「待审批中心 / 单据同意驳回」能力与一致。
 * 优先使用 Zustand 内 `/auth:permissions`（及 JWT 先导出的权限）；若权限尚未就绪则 JWT 角色兜底（含 owner/admin 别名）。
 */
export function currentUserCanOaApprove(): boolean {
  const { permissions } = useAuthStore.getState();
  if (permissions.length > 0) {
    return permissions.includes(Permission.OA_APPROVE);
  }

  const tok = readStoredAccessToken();
  if (!tok) return false;
  const role = readJwtAccessClaims(tok)?.role?.trim().toLowerCase() ?? "";
  return (
    role === "boss" ||
    role === "owner" ||
    role === "oa" ||
    role === "admin"
  );
}
