"use client";

import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { Users, Package, Coins, ClipboardText, Robot } from "@phosphor-icons/react";
import { FeatureCard } from "@/components/ui/card";
import { Permission, type PermissionCode } from "@/lib/permissions/role-matrix";
import { permissionSet, hasAnyPermission } from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

interface HomeTile {
  href: string;
  label: string;
  desc: string;
  icon: Icon;
  anyOf?: readonly PermissionCode[];
  gradient: string;
}

const modules: HomeTile[] = [
  {
    href: "/dashboard/crm",
    label: "客户管理",
    desc: "客户档案、跟进记录、商机管理",
    icon: Users,
    anyOf: [Permission.CRM_READ],
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    href: "/dashboard/inventory",
    label: "进销存管",
    desc: "商品、采购、销售、库存预警",
    icon: Package,
    anyOf: [Permission.INV_READ],
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    href: "/dashboard/finance",
    label: "财务管理",
    desc: "发票、凭证、应收应付、报表",
    icon: Coins,
    anyOf: [Permission.FIN_READ],
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    href: "/dashboard/oa",
    label: "OA 办公",
    desc: "审批、请假报销、通讯录与考勤",
    icon: ClipboardText,
    anyOf: [Permission.OA_READ],
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    href: "/dashboard/ai",
    label: "AI 智能",
    desc: "OCR 识别、智能记账建议",
    icon: Robot,
    gradient: "from-accent-blue/20 to-accent-purple/20",
  },
];

/**
 * Dashboard 首页 - 深色主题
 * 
 * 设计原则：
 * 1. 深色背景适配
 * 2. 渐变图标背景
 * 3. 玻璃拟态卡片
 * 4. 悬停发光效果
 */
export default function DashboardHome() {
  const permissions = useAuthStore((s) => s.permissions);
  const permSet = permissionSet(permissions);
  const visible = modules.filter((m) => {
    if (!m.anyOf?.length) return true;
    return hasAnyPermission(permSet, m.anyOf);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary p-6">
        {/* 装饰背景 */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-purple/5 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-xl font-bold text-text-primary">欢迎使用优效营</h1>
          <p className="mt-2 text-sm text-text-secondary">
            小微企业一体化经营系统
          </p>
          <p className="mt-3 text-xs text-text-muted">
            下方仅展示您当前角色有权使用的快捷入口。
          </p>
        </div>
      </div>

      {/* 功能模块卡片 */}
      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group">
              <FeatureCard
                title={mod.label}
                description={mod.desc}
                icon={
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl",
                    "bg-gradient-to-br",
                    mod.gradient
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

      {permissions.length > 0 && visible.length === 0 ? (
        <div className="rounded-xl bg-bg-secondary border border-border-primary p-4">
          <p className="text-sm text-text-secondary">
            暂未匹配到工作台快捷卡片。可使用左侧菜单进入 OA 等有权限的功能；若侧边栏不完整，请联系管理员核对角色绑定。
          </p>
        </div>
      ) : null}
    </div>
  );
}
