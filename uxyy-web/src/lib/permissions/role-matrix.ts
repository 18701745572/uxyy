/**
 * 与 `uxyy-api/src/modules/auth/role-permissions.ts` 对齐：角色 → 权限码。
 * JWT 会先给出角色，此处用于同步推导菜单；`/auth/permissions` 成功返回后会覆盖为本端状态。
 */

export const UxyyRole = {
  BOSS: "boss",
  FINANCE: "finance",
  SALES: "sales",
  WAREHOUSE: "warehouse",
  OA: "oa",
} as const;

export type UxyyRoleCode = (typeof UxyyRole)[keyof typeof UxyyRole];

export const Permission = {
  CRM_READ: "crm:read",
  CRM_WRITE: "crm:write",
  CRM_DELETE: "crm:delete",

  INV_READ: "inventory:read",
  INV_WRITE: "inventory:write",
  INV_STOCK: "inventory:stock",
  INV_PURCHASE: "inventory:purchase",
  INV_SALES_ORDER: "inventory:sales_order",

  FIN_READ: "finance:read",
  FIN_WRITE: "finance:write",
  FIN_VOUCHER: "finance:voucher",
  FIN_REPORT: "finance:report",

  OA_READ: "oa:read",
  OA_APPROVE: "oa:approve",
  OA_MANAGE: "oa:manage",

  SYS_BACKUP: "system:backup",
  SYS_MEMBER: "system:member",
  SYS_AUDIT_LOG: "system:audit_log",
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

const P = Permission;

const ALL_PERMISSIONS = Object.values(Permission) as PermissionCode[];

const ROLE_PERMISSIONS: Record<UxyyRoleCode, readonly PermissionCode[]> = {
  [UxyyRole.BOSS]: ALL_PERMISSIONS,

  [UxyyRole.FINANCE]: [
    P.FIN_READ,
    P.FIN_WRITE,
    P.FIN_VOUCHER,
    P.FIN_REPORT,
    P.CRM_READ,
    P.INV_READ,
    P.OA_READ,
  ],

  [UxyyRole.SALES]: [
    P.CRM_READ,
    P.CRM_WRITE,
    P.CRM_DELETE,
    P.INV_READ,
    P.INV_SALES_ORDER,
    P.OA_READ,
  ],

  [UxyyRole.WAREHOUSE]: [
    P.INV_READ,
    P.INV_WRITE,
    P.INV_STOCK,
    P.INV_PURCHASE,
    P.CRM_READ,
    P.OA_READ,
  ],

  [UxyyRole.OA]: [
    P.OA_READ,
    P.OA_APPROVE,
    P.OA_MANAGE,
    P.SYS_BACKUP,
    P.SYS_MEMBER,
    P.SYS_AUDIT_LOG,
    P.CRM_READ,
    P.INV_READ,
  ],
};

const KNOWN = new Set<string>(Object.values(UxyyRole));

export function normalizeEnterpriseRole(
  role: string | undefined,
): UxyyRoleCode | undefined {
  if (!role || typeof role !== "string") return undefined;
  const r = role.trim().toLowerCase();
  if (r === "owner") return UxyyRole.BOSS;
  if (r === "admin") return UxyyRole.OA;
  if (KNOWN.has(r)) return r as UxyyRoleCode;
  return undefined;
}

export function getPermissionsFromEnterpriseRole(
  role: string | undefined,
): PermissionCode[] {
  const c = normalizeEnterpriseRole(role);
  if (!c) return [];
  return [...ROLE_PERMISSIONS[c]];
}

export function roleLabel(code: string | undefined): string {
  const map: Record<string, string> = {
    boss: "老板",
    finance: "财务",
    sales: "销售",
    warehouse: "仓管",
    oa: "行政",
  };
  const k = code?.trim().toLowerCase() ?? "";
  return map[k] ?? (code ? code : "未知");
}
