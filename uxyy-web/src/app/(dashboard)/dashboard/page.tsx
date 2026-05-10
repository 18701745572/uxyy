"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Permission, type PermissionCode } from "@/lib/permissions/role-matrix";
import { permissionSet, hasAnyPermission } from "@/lib/permissions/nav-access";
import { useAuthStore } from "@/stores/auth-store";

type HomeTile = {
  href: string;
  label: string;
  desc: string;
  icon: string;
  anyOf?: readonly PermissionCode[];
};

const modules: HomeTile[] = [
  {
    href: "/dashboard/crm",
    label: "客户管理",
    desc: "客户档案、跟进记录、商机管理",
    icon: "👥",
    anyOf: [Permission.CRM_READ],
  },
  {
    href: "/dashboard/inventory",
    label: "进销存",
    desc: "商品、采购、销售、库存预警",
    icon: "📦",
    anyOf: [Permission.INV_READ],
  },
  {
    href: "/dashboard/finance",
    label: "财务",
    desc: "发票、凭证、应收应付、报表",
    icon: "💰",
    anyOf: [Permission.FIN_READ],
  },
  {
    href: "/dashboard/oa",
    label: "OA 办公",
    desc: "审批、请假报销、通讯录与考勤",
    icon: "📋",
    anyOf: [Permission.OA_READ],
  },
  {
    href: "/dashboard/ai",
    label: "AI 智能",
    desc: "OCR 识别、智能记账建议",
    icon: "🤖",
  },
];

export default function DashboardHome() {
  const permissions = useAuthStore((s) => s.permissions);
  const permSet = permissionSet(permissions);
  const visible = modules.filter((m) => {
    if (!m.anyOf?.length) return true;
    return hasAnyPermission(permSet, m.anyOf);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">欢迎使用优效营</h1>
        <p className="mt-1 text-sm text-zinc-600">
          小微企业一体化经营系统 · MVP
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          下方仅展示您当前角色有权使用的快捷入口。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((mod) => (
          <Link key={mod.href} href={mod.href}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {mod.icon}
                </span>
                <div>
                  <h2 className="font-medium text-zinc-900">{mod.label}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{mod.desc}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {permissions.length > 0 && visible.length === 0 ? (
        <p className="text-sm text-zinc-600">
          暂未匹配到工作台快捷卡片。可使用左侧菜单进入 OA 等有权限的功能；若侧边栏不完整，请联系管理员核对角色绑定。
        </p>
      ) : null}
    </div>
  );
}
