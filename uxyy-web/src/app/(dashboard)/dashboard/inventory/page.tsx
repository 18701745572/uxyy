"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Permission, type PermissionCode } from "@/lib/permissions/role-matrix";
import {
  permissionSet,
  hasAnyPermission,
  hasEveryPermission,
} from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";

type InvTile = {
  title: string;
  desc: string;
  href: string;
  anyOf?: readonly PermissionCode[];
  everyOf?: readonly PermissionCode[];
};

const modules: InvTile[] = [
  {
    title: "商品管理",
    desc: "管理商品信息、库存、价格",
    href: "/dashboard/inventory/products",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "供应商管理",
    desc: "管理供应商信息",
    href: "/dashboard/inventory/suppliers",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "采购订单",
    desc: "创建和管理采购订单",
    href: "/dashboard/inventory/purchase-orders",
    everyOf: [Permission.INV_PURCHASE],
  },
  {
    title: "供应商付款",
    desc: "管理供应商付款记录",
    href: "/dashboard/inventory/supplier-payments",
    everyOf: [Permission.INV_PURCHASE],
  },
  {
    title: "销售订单",
    desc: "创建和管理销售订单",
    href: "/dashboard/inventory/sales-orders",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "销售出库",
    desc: "创建销售出库单，扣减库存",
    href: "/dashboard/inventory/sales-outbound",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "客户回款",
    desc: "管理客户回款记录",
    href: "/dashboard/inventory/customer-receipts",
    everyOf: [Permission.INV_SALES_ORDER],
  },
  {
    title: "仓库管理",
    desc: "查看企业仓库档案（与盘点、库存 warehouseId 对应）",
    href: "/dashboard/inventory/warehouses",
    everyOf: [Permission.INV_READ],
  },
  {
    title: "库存盘点",
    desc: "库存盘点管理",
    href: "/dashboard/inventory/stocktaking",
    everyOf: [Permission.INV_STOCK],
  },
  {
    title: "库存预警",
    desc: "查看库存预警信息",
    href: "/dashboard/inventory/stock-alerts",
    everyOf: [Permission.INV_READ],
  },
];

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
      <h1 className="text-lg font-semibold text-zinc-900">进销存</h1>
      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          当前角色没有可用的进销存入口。如需采购、出库或盘点等能力，请联系企业管理员调整<strong>仓管</strong>或<strong>销售</strong>等与库存相关的角色。
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full hover:border-zinc-400 transition-colors cursor-pointer">
              <h2 className="font-medium text-zinc-900">{m.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{m.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
