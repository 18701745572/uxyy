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

type FinanceTile = {
  title: string;
  desc: string;
  href: string;
  /**
   * 满足其一即可（与 「全部满足」互斥）。
   */
  anyOf?: readonly PermissionCode[];
  everyOf?: readonly PermissionCode[];
};

const financeModules: FinanceTile[] = [
  {
    title: "发票管理",
    desc: "管理发票信息、核验、入账",
    href: "/dashboard/finance/invoices",
    everyOf: [Permission.FIN_READ],
  },
  {
    title: "凭证录入",
    desc: "创建和管理会计凭证",
    href: "/dashboard/finance/vouchers",
    everyOf: [Permission.FIN_VOUCHER],
  },
  {
    title: "财务报表",
    desc: "查看财务报表和经营分析",
    href: "/dashboard/finance/reports",
    everyOf: [Permission.FIN_REPORT],
  },
  {
    title: "应收应付",
    desc: "管理应收应付账款（已核验未入账发票）",
    href: "/dashboard/finance/ar-ap",
    everyOf: [Permission.FIN_READ],
  },
  {
    title: "AI智能纠错",
    desc: "自动检测凭证错误，提供修复建议",
    href: "/dashboard/finance/ai-error-correction",
    anyOf: [Permission.FIN_VOUCHER, Permission.FIN_REPORT],
  },
  {
    title: "发票OCR识别",
    desc: "上传发票图片，AI自动识别信息",
    href: "/dashboard/finance/invoices/ocr",
    everyOf: [Permission.FIN_WRITE],
  },
];

export default function FinancePage() {
  const permissions = useAuthStore((s) => s.permissions);
  const set = permissionSet(permissions);
  const visible = financeModules.filter((m) => {
    const allOk =
      !m.everyOf?.length || hasEveryPermission(set, [...m.everyOf]);
    const anyOk =
      !m.anyOf?.length || hasAnyPermission(set, [...m.anyOf]);
    return allOk && anyOk;
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">财务</h1>
      {visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          当前角色没有财务模块权限。如需开票、入账或报表等功能，请联系企业管理员为您分配<strong>财务</strong>或与财务相关的权限。
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
