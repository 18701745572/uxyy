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
import {
  Receipt,
  FileText,
  ListDashes,
  Bank,
  ChartPie,
  TrendUp,
  ArrowsLeftRight,
  Robot,
  Scan,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type FinanceTile = {
  title: string;
  desc: string;
  href: string;
  icon: React.ElementType;
  gradient: string;
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
    icon: Receipt,
    gradient: "from-blue-500/20 to-cyan-500/20",
    everyOf: [Permission.FIN_READ],
  },
  {
    title: "凭证录入",
    desc: "创建和管理会计凭证",
    href: "/dashboard/finance/vouchers",
    icon: FileText,
    gradient: "from-purple-500/20 to-pink-500/20",
    everyOf: [Permission.FIN_VOUCHER],
  },
  {
    title: "会计科目",
    desc: "配置企业会计科目表",
    href: "/dashboard/finance/account-subjects",
    icon: ListDashes,
    gradient: "from-emerald-500/20 to-teal-500/20",
    everyOf: [Permission.FIN_CONFIG],
  },
  {
    title: "银行流水",
    desc: "导入对公账户流水，自动匹配生成凭证",
    href: "/dashboard/finance/bank-statements",
    icon: Bank,
    gradient: "from-amber-500/20 to-orange-500/20",
    everyOf: [Permission.FIN_WRITE],
  },
  {
    title: "财务报表",
    desc: "查看财务报表和经营分析",
    href: "/dashboard/finance/reports",
    icon: ChartPie,
    gradient: "from-rose-500/20 to-pink-500/20",
    everyOf: [Permission.FIN_REPORT],
  },
  {
    title: "利润分析",
    desc: "深度分析利润趋势、利润率、成本结构",
    href: "/dashboard/finance/profit-analysis",
    icon: TrendUp,
    gradient: "from-violet-500/20 to-purple-500/20",
    everyOf: [Permission.FIN_REPORT],
  },
  {
    title: "应收应付",
    desc: "管理应收应付账款（已核验未入账发票）",
    href: "/dashboard/finance/ar-ap",
    icon: ArrowsLeftRight,
    gradient: "from-cyan-500/20 to-blue-500/20",
    everyOf: [Permission.FIN_READ],
  },
  {
    title: "AI智能纠错",
    desc: "自动检测凭证错误，提供修复建议",
    href: "/dashboard/finance/ai-error-correction",
    icon: Robot,
    gradient: "from-accent-blue/20 to-accent-purple/20",
    anyOf: [Permission.FIN_VOUCHER, Permission.FIN_REPORT],
  },
  {
    title: "发票OCR识别",
    desc: "上传发票图片，AI自动识别信息",
    href: "/dashboard/finance/invoices/ocr",
    icon: Scan,
    gradient: "from-indigo-500/20 to-violet-500/20",
    everyOf: [Permission.FIN_WRITE],
  },
];

/**
 * 财务概览页面 - 深色主题
 */
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
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">财务</h1>
        <p className="mt-1 text-sm text-text-secondary">
          发票管理、凭证录入、财务报表、AI智能分析
        </p>
      </div>

      {/* 无权限提示 */}
      {visible.length === 0 ? (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
          <p className="text-sm text-warning">
            当前角色没有财务模块权限。如需开票、入账或报表等功能，请联系企业管理员为您分配<strong>财务</strong>或与财务相关的权限。
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
