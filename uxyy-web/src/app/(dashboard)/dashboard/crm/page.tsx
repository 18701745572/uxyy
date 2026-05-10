"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useCrmCaps } from "@/lib/permissions/crm-capabilities";

export default function CrmOverviewPage() {
  const caps = useCrmCaps();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900">客户管理</h1>

      {!caps.write ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          当前账号仅有<strong>客户查看（crm:read）</strong>
          权限，无法在本模块新建或修改客户与商机数据。如需建档或跟进录入，请联系管理员分配<strong>销售</strong>等具备写入权限的角色。
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/crm/customers">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <h2 className="font-medium text-zinc-900">客户列表</h2>
            <p className="mt-1 text-sm text-zinc-600">
              浏览客户档案{caps.write ? "，支持建档与归属维护" : "（只读）"}
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/crm/opportunities">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <h2 className="font-medium text-zinc-900">商机管理</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {caps.write ? "维护商机阶段与成交金额" : "查看商机与销售进度"}
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/crm/follow-ups">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <h2 className="font-medium text-zinc-900">跟进记录</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {caps.write ? "记录沟通与下次回访" : "查看历史跟进（只读）"}
            </p>
          </Card>
        </Link>

        <Link href="/dashboard/crm/categories">
          <Card className="transition-shadow hover:shadow-md cursor-pointer">
            <h2 className="font-medium text-zinc-900">客户分类</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {caps.write ? "配置标签与客户分群维度" : "查看分类字典（只读）"}
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
