"use client";

import Link from "next/link";
import { FeatureCard } from "@/components/ui/card";
import { useCrmCaps } from "@/lib/permissions/crm-capabilities";
import { Users, ChartLineUp, Phone, Tag, Crown, Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const modules = [
  {
    href: "/dashboard/crm/customers",
    title: "客户列表",
    desc: "浏览客户档案",
    icon: Users,
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    href: "/dashboard/crm/opportunities",
    title: "商机管理",
    desc: "维护商机阶段与成交金额",
    icon: ChartLineUp,
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    href: "/dashboard/crm/follow-ups",
    title: "跟进记录",
    desc: "记录沟通与下次回访",
    icon: Phone,
    gradient: "from-emerald-500/20 to-teal-500/20",
  },
  {
    href: "/dashboard/crm/categories",
    title: "客户分类",
    desc: "配置标签与客户分群维度",
    icon: Tag,
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    href: "/dashboard/crm/members",
    title: "会员管理",
    desc: "管理会员积分、等级、消费记录",
    icon: Crown,
    gradient: "from-rose-500/20 to-pink-500/20",
  },
  {
    href: "/dashboard/crm/member-levels",
    title: "会员等级",
    desc: "配置会员等级规则、权益、折扣",
    icon: Star,
    gradient: "from-violet-500/20 to-purple-500/20",
  },
];

/**
 * CRM 概览页面 - 深色主题
 */
export default function CrmOverviewPage() {
  const caps = useCrmCaps();

  return (
    <div className="flex flex-col gap-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-xl font-bold text-text-primary">客户管理</h1>
        <p className="mt-1 text-sm text-text-secondary">
          管理客户档案、商机跟进、会员体系
        </p>
      </div>

      {/* 权限提示 */}
      {!caps.write ? (
        <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
          <p className="text-sm text-warning">
            当前账号仅有<strong>客户查看（crm:read）</strong>
            权限，无法在本模块新建或修改客户与商机数据。如需建档或跟进录入，请联系管理员分配<strong>销售</strong>等具备写入权限的角色。
          </p>
        </div>
      ) : null}

      {/* 功能模块卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} className="group">
              <FeatureCard
                title={mod.title}
                description={caps.write ? mod.desc : `${mod.desc}（只读）`}
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
    </div>
  );
}
