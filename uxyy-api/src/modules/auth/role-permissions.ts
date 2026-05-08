/**
 * PRD · 基础能力层：五种预设企业内角色 + 细粒度权限码。
 * 数据库存储可为历史别名（owner→boss, admin→oa），对外统一规范码见 {@link UxyyRole}。
 */

export const UxyyRole = {
  /** 老板 / 企业主：全部权限 */
  BOSS: 'boss',
  /** 财务 */
  FINANCE: 'finance',
  /** 销售 */
  SALES: 'sales',
  /** 仓管 */
  WAREHOUSE: 'warehouse',
  /** 行政 */
  OA: 'oa',
} as const;

export type UxyyRoleCode = (typeof UxyyRole)[keyof typeof UxyyRole];

/** 与 PRD 对齐的权限点（按模块细分，供 @Permissions 与前端禁用态对齐） */
export const Permission = {
  CRM_READ: 'crm:read',
  CRM_WRITE: 'crm:write',
  CRM_DELETE: 'crm:delete',

  INV_READ: 'inventory:read',
  INV_WRITE: 'inventory:write',
  INV_STOCK: 'inventory:stock',
  INV_PURCHASE: 'inventory:purchase',
  INV_SALES_ORDER: 'inventory:sales_order',

  FIN_READ: 'finance:read',
  FIN_WRITE: 'finance:write',
  FIN_VOUCHER: 'finance:voucher',
  FIN_REPORT: 'finance:report',

  OA_READ: 'oa:read',
  OA_APPROVE: 'oa:approve',
  OA_MANAGE: 'oa:manage',

  SYS_BACKUP: 'system:backup',
  SYS_MEMBER: 'system:member',
  SYS_AUDIT_LOG: 'system:audit_log',
} as const;

export type PermissionCode = (typeof Permission)[keyof typeof Permission];

const P = Permission;

const ALL_PERMISSIONS: readonly PermissionCode[] = Object.values(
  Permission,
) as PermissionCode[];

export const ROLE_PERMISSIONS: Record<
  UxyyRoleCode,
  readonly PermissionCode[]
> = {
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

/** 前端/文档用：预设角色说明 */
export const PRESET_ENTERPRISE_ROLES: ReadonlyArray<{
  code: UxyyRoleCode;
  label: string;
  description: string;
}> = [
  {
    code: UxyyRole.BOSS,
    label: '老板',
    description: '全模块数据与系统设置、成员与备份',
  },
  {
    code: UxyyRole.FINANCE,
    label: '财务',
    description: '发票、凭证、报表；可查看客户与库存以便对账',
  },
  {
    code: UxyyRole.SALES,
    label: '销售',
    description: '客户、商机、报价、销售订单；基础 OA 查看',
  },
  {
    code: UxyyRole.WAREHOUSE,
    label: '仓管',
    description: '采购、库存、盘点、批次、条码等仓储作业',
  },
  {
    code: UxyyRole.OA,
    label: '行政',
    description: '审批、通讯录、考勤；备份、成员邀请、操作审计',
  },
];

export const KNOWN_ENTERPRISE_ROLE_CODES: readonly UxyyRoleCode[] =
  Object.values(UxyyRole);

const KNOWN_ROLE_SET = new Set<string>(KNOWN_ENTERPRISE_ROLE_CODES);

/**
 * 将 user_enterprises.role 规范为五种角色之一。
 * - owner（注册企业主）→ boss
 * - admin（历史后台管理员）→ oa
 */
export function normalizeEnterpriseRole(
  role: string | undefined,
): UxyyRoleCode | undefined {
  if (!role || typeof role !== 'string') return undefined;
  const r = role.trim().toLowerCase();
  if (r === 'owner') return UxyyRole.BOSS;
  if (r === 'admin') return UxyyRole.OA;
  if (KNOWN_ROLE_SET.has(r)) return r as UxyyRoleCode;
  return undefined;
}

export function getPermissionsForRole(role: string | undefined): string[] {
  const c = normalizeEnterpriseRole(role);
  if (!c) return [];
  return [...ROLE_PERMISSIONS[c]];
}

/** 当前角色是否拥有任一权限（用于 @Permissions('a','b') 的 OR 语义） */
export function roleHasAnyPermission(
  role: string | undefined,
  required: readonly string[],
): boolean {
  if (!required.length) return true;
  const c = normalizeEnterpriseRole(role);
  if (!c) return false;
  const mine = new Set(ROLE_PERMISSIONS[c]);
  return required.some((p) => mine.has(p as PermissionCode));
}

/** 是否企业内最高权限角色（用于审批兜底等） */
export function isBossRole(role: string | undefined): boolean {
  return normalizeEnterpriseRole(role) === UxyyRole.BOSS;
}
