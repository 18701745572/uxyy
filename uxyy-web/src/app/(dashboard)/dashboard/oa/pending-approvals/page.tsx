"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ClipboardText } from "@/components/icons";
import {
  fetchPendingApprovals,
  type PendingApprovalBundle,
} from "@/lib/api/oa-approval-queue";
import { ApiError } from "@/lib/api/client";
import { Permission } from "@/lib/permissions/role-matrix";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function documentHref(bundle: PendingApprovalBundle): string | null {
  const id = bundle.record.businessId;
  if (id == null) return null;
  switch (bundle.record.businessType) {
    case "leave":
      return `/dashboard/oa/leave-requests/${id}`;
    case "expense":
      return `/dashboard/oa/expense-requests/${id}`;
    default:
      return null;
  }
}

export default function PendingApprovalsPage() {
  const permissions = useAuthStore((s) => s.permissions);
  const canApprove = permissions.includes(Permission.OA_APPROVE);

  const q = useQuery({
    queryKey: ["oa", "pending-approvals"],
    queryFn: fetchPendingApprovals,
    enabled: canApprove,
  });

  const rows = q.data ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">待审批中心</h1>
        <p className="text-text-tertiary mt-1 text-sm">
          汇总本企业<strong>未完成</strong>的审批实例（请假、报销等）。同意后业务单状态会与审批记录一并更新。
          仅限具备 <strong>oa:approve</strong>
          的账号（通常为老板或行政）；若看不到数据，请将企业切换为有审批权限的成员或联系管理员授予权限。
        </p>
      </div>

      {!canApprove ? (
        <Card className="border-amber-100 bg-amber-50/60">
          <CardContent className="py-6 text-sm text-amber-900">
            当前登录角色<strong>无审批权限</strong>。请使用<strong>老板</strong>（boss）或<strong>行政</strong>
            （oa）账号登录后重试。
          </CardContent>
        </Card>
      ) : null}

      {canApprove && q.isError ? (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {q.error instanceof ApiError ? q.error.message : String(q.error)}
        </p>
      ) : null}

      {canApprove && q.isLoading ? (
        <p className="text-sm text-text-tertiary">加载中…</p>
      ) : null}

      {canApprove && !q.isLoading && rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-text-tertiary text-sm">
            <ClipboardText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            暂无待处理审批。
          </CardContent>
        </Card>
      ) : null}

      {canApprove && rows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">队列（{rows.length}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((bundle) => {
              const href = documentHref(bundle);
              const st = bundle.record.status;
              return (
                <div
                  key={bundle.record.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border-secondary p-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border border-border-primary bg-white text-text-secondary">
                        {bundle.record.businessType}
                      </Badge>
                      <Badge
                        className={
                          st === "pending"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-bg-tertiary text-text-secondary"
                        }
                      >
                        {st}
                      </Badge>
                    </div>
                    <p className="font-medium text-text-primary mt-2">
                      {bundle.record.title}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      流程：{bundle.flow.name} · 类型 {bundle.flow.type} · 记录 #
                      {bundle.record.id}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {href ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={href}>打开业务单审批</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-text-muted">无外链业务类型</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
