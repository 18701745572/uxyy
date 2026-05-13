import type { Icon } from "@phosphor-icons/react";
import {
  House,
  Bell,
  Users,
  Package,
  Coins,
  ClipboardText,
  Robot,
} from "@phosphor-icons/react";
import { Permission, type PermissionCode } from "./role-matrix";

export function permissionSet(permissions: readonly string[]): Set<string> {
  return new Set(permissions);
}

export function hasAnyPermission(
  perms: Set<string>,
  required: readonly PermissionCode[],
): boolean {
  return required.some((p) => perms.has(p));
}

export function hasEveryPermission(
  perms: Set<string>,
  required: readonly PermissionCode[],
): boolean {
  return required.every((p) => perms.has(p));
}

/** 导航项类型定义 */
export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  anyOf: PermissionCode[];
}

/** 侧栏：满足任一权限即显示该入口 */
export const SIDEBAR_NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "工作台",
    icon: House,
    anyOf: [],
  },
  {
    href: "/dashboard/messages",
    label: "消息中心",
    icon: Bell,
    anyOf: [],
  },
  {
    href: "/dashboard/crm",
    label: "客户管理",
    icon: Users,
    anyOf: [Permission.CRM_READ],
  },
  {
    href: "/dashboard/inventory",
    label: "进销存管",
    icon: Package,
    anyOf: [Permission.INV_READ],
  },
  {
    href: "/dashboard/finance",
    label: "财务管理",
    icon: Coins,
    anyOf: [Permission.FIN_READ],
  },
  {
    href: "/dashboard/oa",
    label: "OA 办公",
    icon: ClipboardText,
    anyOf: [Permission.OA_READ],
  },
  {
    href: "/dashboard/ai",
    label: "AI 智能",
    icon: Robot,
    /** AI 任务仅要求登录+企业；具体能力由各接口鉴权 */
    anyOf: [],
  },
] as const;

export function visibleSidebarItems(permissions: readonly string[]) {
  const s = permissionSet(permissions);
  return SIDEBAR_NAV.filter(
    (item) => item.anyOf.length === 0 || hasAnyPermission(s, item.anyOf),
  );
}

/** 最长前缀匹配；无匹配规则则放行 */
export function evaluateRouteGuard(
  pathname: string,
  permissions: readonly string[],
): { allowed: boolean; missingPermissions?: PermissionCode[] } {
  if (!pathname.startsWith("/dashboard")) {
    return { allowed: true };
  }
  if (
    pathname === "/dashboard/forbidden" ||
    pathname.startsWith("/dashboard/forbidden/")
  ) {
    return { allowed: true };
  }
  if (pathname === "/dashboard") {
    return { allowed: true };
  }

  const rules: { prefix: string; everyOf?: PermissionCode[] }[] = [
    {
      prefix: "/dashboard/profile/enterprise-members",
      everyOf: [Permission.SYS_MEMBER],
    },
    {
      prefix: "/dashboard/oa/approval-flows",
      everyOf: [Permission.OA_MANAGE],
    },
    {
      prefix: "/dashboard/oa/employee-profiles",
      everyOf: [Permission.OA_MANAGE],
    },
    {
      prefix: "/dashboard/oa/pending-approvals",
      everyOf: [Permission.OA_APPROVE],
    },
    {
      prefix: "/dashboard/oa/attendance/make-up-approvals",
      everyOf: [Permission.OA_APPROVE],
    },
    {
      prefix: "/dashboard/finance",
      everyOf: [Permission.FIN_READ],
    },
    {
      prefix: "/dashboard/inventory",
      everyOf: [Permission.INV_READ],
    },
    {
      prefix: "/dashboard/crm",
      everyOf: [Permission.CRM_READ],
    },
    {
      prefix: "/dashboard/oa",
      everyOf: [Permission.OA_READ],
    },
    /** AI：登录即可进入工作台；不写 everyOf（放行）*/
    {
      prefix: "/dashboard/ai",
    },
    {
      prefix: "/dashboard/profile",
    },
    {
      prefix: "/dashboard/profile/backup",
      everyOf: [Permission.SYS_BACKUP],
    },
  ];

  rules.sort((a, b) => b.prefix.length - a.prefix.length);

  for (const r of rules) {
    if (pathname === r.prefix || pathname.startsWith(`${r.prefix}/`)) {
      if (!r.everyOf?.length) return { allowed: true };
      const set = permissionSet(permissions);
      const missing = r.everyOf.filter((p) => !set.has(p));
      if (missing.length > 0) {
        return { allowed: false, missingPermissions: missing };
      }
      return { allowed: true };
    }
  }

  return { allowed: true };
}
