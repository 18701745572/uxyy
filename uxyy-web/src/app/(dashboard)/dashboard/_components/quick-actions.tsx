"use client";

import Link from "next/link";
import { Users, ShoppingCart, Receipt } from "@phosphor-icons/react";
import { Permission, type PermissionCode } from "@/lib/permissions/role-matrix";
import { permissionSet, hasAnyPermission } from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface QuickAction {
  href: string;
  label: string;
  icon: React.ReactNode;
  anyOf: PermissionCode[];
  color: string;
}

const quickActions: QuickAction[] = [
  {
    href: "/dashboard/crm/customers",
    label: "新建客户",
    icon: <Users className="h-5 w-5" />,
    anyOf: [Permission.CRM_WRITE],
    color: "from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30",
  },
  {
    href: "/dashboard/inventory/sales-orders",
    label: "新建订单",
    icon: <ShoppingCart className="h-5 w-5" />,
    anyOf: [Permission.INV_WRITE],
    color: "from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30",
  },
  {
    href: "/dashboard/finance/invoices",
    label: "录入发票",
    icon: <Receipt className="h-5 w-5" />,
    anyOf: [Permission.FIN_WRITE],
    color: "from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30",
  },
];

export function QuickActions() {
  const permissions = useAuthStore((s) => s.permissions);
  const permSet = permissionSet(permissions);

  const visibleActions = quickActions.filter((action) =>
    hasAnyPermission(permSet, action.anyOf)
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4">快捷操作</h3>
      <div className="flex flex-wrap gap-3">
        {visibleActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-gradient-to-br text-sm font-medium text-text-primary",
              "transition-all duration-200 hover:scale-[1.02] hover:shadow-glow",
              action.color
            )}
          >
            {action.icon}
            <span>{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
