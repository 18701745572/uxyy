"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  hintForPermissionCode,
  parseNeedParam,
} from "@/lib/permissions/permission-hints";
import { roleLabel } from "@/lib/permissions/role-matrix";
import { useAuthStore } from "@/stores/auth-store";

function ForbiddenBody() {
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get("from");
  const from =
    rawFrom?.startsWith("/dashboard") &&
    !rawFrom.startsWith("/dashboard/forbidden")
      ? rawFrom
      : null;
  const need = searchParams.get("need");
  const needList = parseNeedParam(need);
  const canon = useAuthStore((s) => s.canonicalRole);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold text-zinc-900">当前账号无权访问该页面</h1>
      <Card className="p-6 space-y-3">
        <p className="text-sm text-zinc-600 leading-relaxed">
          系统在后台按<strong>企业内角色</strong>控制功能入口。您在当前企业的角色为
          <span className="font-medium text-zinc-900">
            {" "}
            {roleLabel(canon ?? undefined)}
          </span>
          ，因此无法打开此模块或子页面。
        </p>
        {from ? (
          <p className="text-xs text-zinc-500 break-all">
            尝试路径：<code>{from}</code>
          </p>
        ) : null}
        {needList.length > 0 ? (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 space-y-1.5">
            <p className="font-medium text-zinc-800">缺少以下权限（任一即可时，以页面规则为准）</p>
            <ul className="list-disc pl-4 space-y-1">
              {needList.map((code) => (
                <li key={code}>
                  <span className="text-zinc-800">{hintForPermissionCode(code)}</span>
                  <code className="ml-1 text-zinc-500">{code}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-xs text-zinc-500">
          如需使用相关功能，请联系企业管理员（老板或行政）在「用户资料 →
          <Link
            href="/dashboard/profile/enterprise-members"
            className="text-zinc-700 underline underline-offset-2"
          >
            企业成员
          </Link>
          」中为您调整角色。
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard">返回首页</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard/profile">用户资料</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">加载中…</p>
      }
    >
      <ForbiddenBody />
    </Suspense>
  );
}
