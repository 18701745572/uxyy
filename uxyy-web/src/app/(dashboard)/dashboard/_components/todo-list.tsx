"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  Users,
  Warning,
  ArrowRight,
} from "@phosphor-icons/react";
import { getDashboardTodos } from "@/lib/api/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Permission } from "@/lib/permissions/role-matrix";
import { permissionSet, hasAnyPermission } from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  href: string;
  color: string;
  loading?: boolean;
}

function TodoItem({ icon, title, count, href, color, loading }: TodoItemProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-8" />
      </div>
    );
  }

  if (count === 0) {
    return null;
  }

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          color
        )}
      >
        {icon}
      </div>
      <span className="flex-1 text-sm text-text-primary">{title}</span>
      <span className="text-lg font-bold text-text-primary">{count}</span>
      <ArrowRight className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

interface StockAlertItemProps {
  id: number;
  name: string;
  stock: number;
  minStock: number;
}

function StockAlertItem({ name, stock, minStock }: StockAlertItemProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-tertiary/30 text-sm">
      <span className="text-text-primary truncate">{name}</span>
      <span className="text-amber-500 whitespace-nowrap">
        {stock} / {minStock}
      </span>
    </div>
  );
}

export function TodoList() {
  const permissions = useAuthStore((s) => s.permissions);
  const permSet = permissionSet(permissions);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "todos"],
    queryFn: getDashboardTodos,
  });

  const canViewApprovals = hasAnyPermission(permSet, [Permission.OA_READ]);
  const canViewCustomers = hasAnyPermission(permSet, [Permission.CRM_READ]);
  const canViewInventory = hasAnyPermission(permSet, [Permission.INV_READ]);

  const hasAnyTodos =
    (canViewApprovals && (data?.pendingApprovals ?? 0) > 0) ||
    (canViewCustomers && (data?.followUpCustomers ?? 0) > 0) ||
    (canViewInventory && (data?.stockAlertList?.length ?? 0) > 0);

  return (
    <div className="rounded-xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary p-5">
      <h3 className="text-sm font-medium text-text-primary mb-4">待办事项</h3>

      <div className="space-y-2">
        {canViewApprovals && (
          <TodoItem
            icon={<CheckCircle className="h-5 w-5 text-emerald-500" />}
            title="待审批"
            count={data?.pendingApprovals ?? 0}
            href="/dashboard/oa/pending-approvals"
            color="bg-emerald-500/10"
            loading={isLoading}
          />
        )}

        {canViewCustomers && (
          <TodoItem
            icon={<Users className="h-5 w-5 text-blue-500" />}
            title="待跟进客户"
            count={data?.followUpCustomers ?? 0}
            href="/dashboard/crm/follow-ups"
            color="bg-blue-500/10"
            loading={isLoading}
          />
        )}

        {canViewInventory && (data?.stockAlertList?.length ?? 0) > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Warning className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-text-muted">库存预警</span>
              <Link
                href="/dashboard/inventory/stock-alerts"
                className="ml-auto text-xs text-accent-blue hover:underline"
              >
                查看全部
              </Link>
            </div>
            <div className="space-y-1">
              {data?.stockAlertList?.slice(0, 3).map((item) => (
                <StockAlertItem key={item.id} {...item} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && !hasAnyTodos && (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">暂无待办事项</p>
          </div>
        )}
      </div>
    </div>
  );
}
