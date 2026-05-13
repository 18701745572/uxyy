"use client";

import Link from "next/link";
import { FeatureCard } from "@/components/ui/card";
import { Permission, type PermissionCode } from "@/lib/permissions/role-matrix";
import {
  permissionSet,
  hasAnyPermission,
  hasEveryPermission,
} from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";
import type { Icon } from "@phosphor-icons/react";
import {
  Package,
  Truck,
  ShoppingCart,
  Money,
  Storefront,
  ArrowFatLineUp,
  Coins,
  Warehouse,
  Clipboard,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type InvTile = {
  title: string;
  desc: string;
  href: string;
  icon: Icon;
  gradient: string;
  anyOf?: readonly PermissionCode[];
  everyOf?: readonly PermissionCode[];
};

const modules: InvTile[] = [
  {
    title: "商品管理",
    desc: "管理商品信息、库存、价格",
    href: "/dashboard/inventory/products",
    icon: Package,
    gradient: "from-blue-500/20 to-cyan-500/20",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "供应商管理",
    desc: "管理供应商信息",
    href: "/dashboard/inventory/suppliers",
    icon: Truck,
    gradient: "from-purple-500/20 to-pink-500/20",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "采购订单",
    desc: "创建和管理采购订单",
    href: "/dashboard/inventory/purchase-orders",
    icon: ShoppingCart,
    gradient: "from-emerald-500/20 to-teal-500/20",
    everyOf: [Permission.INV_PURCHASE],
  },
  {
    title: "供应商付款",
    desc: "管理供应商付款记录",
    href: "/dashboard/inventory/supplier-payments",
    icon: Money,
    gradient: "from-amber-500/20 to-orange-500/20",
    everyOf: [Permission.INV_PURCHASE],
  },
  {
    title: "销售订单",
    desc: "创建和管理销售订单",
    href: "/dashboard/inventory/sales-orders",
    icon: Storefront,
    gradient: "from-rose-500/20 to-pink-500/20",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "销售出库",
    desc: "创建销售出库单，扣减库存",
    href: "/dashboard/inventory/sales-outbound",
    icon: ArrowFatLineUp,
    gradient: "from-violet-500/20 to-purple-500/20",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "客户回款",
    desc: "管理客户回款记录",
    href: "/dashboard/inventory/customer-receipts",
    icon: Coins,
    gradient: "from-cyan-500/20 to-blue-500/20",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "仓库管理",
    desc: "查看企业仓库档案（与盘点、库存 warehouseId 对应）",
    href: "/dashboard/inventory/warehouses",
    icon: Warehouse,
    gradient: "from-indigo-500/20 to-violet-500/20",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "库存盘点",
    desc: "库存盘点管理",
    href: "/dashboard/inventory/stocktaking",
    icon: Clipboard,
    gradient: "from-lime-500/20 to-green-500/20",
    everyOf: [Permission.INV_STOCK],
  },
  {
    title: "库存预警",
    desc: "查看库存预警信息",
    href: "/dashboard/inventory/stock-alerts",
    icon: Warning,
    gradient: "from-red-500/20 to-rose-500/20",
    everyOf: [Permission.INV_READ],
  },
];

/**
 * 进销存概览页面 - 深色主题
 */
export default function InventoryPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const set = permissionSet(permissions);
  const visible = modules.filter((m) => {
    const allOk =
      !m.everyOf?.length || hasEveryPermission(set, [...m.everyOf]);
    const anyOk = !m.anyOf?.length || hasAnyPermission(set, [...m.anyOf]);
    return allOk && anyOk;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">进销存</h1>
        <p className="mt-1 text-sm text-text-secondary">
          商品管理、采购销售、库存盘点、仓库管理
        </p>
      </div>

      {/* 无权限提示 */}
      {visible.length === 0 ? (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
          <p className="text-sm text-warning">
            当前角色没有可用的进销存入口。如需采购、出库或盘点等能力，请联系企业管理员调整<strong>仓管</strong>或<strong>销售</strong>等与库存相关的角色。
          </p>
        </div>
      ) : null}

      {/* 功能模块卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className="group">
              <FeatureCard
                title={m.title}
                description={m.desc}
                icon={
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    "bg-gradient-to-br",
                    m.gradient
                  )}>
                    <Icon className="h-5 w-5 text-text-primary" weight="regular" />
                  </div>
                }
                className="h-full group-hover:shadow-glow transition-all duration-300"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
