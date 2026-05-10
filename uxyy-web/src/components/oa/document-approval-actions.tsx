"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { submitApprovalRecordAction } from "@/lib/api/oa-approval-queue";
import { Permission } from "@/lib/permissions/role-matrix";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  /** `approval_records.id` */
  approvalRecordId: number | null | undefined;
  documentStatus: string;
  invalidateQueryKeys?: ReadonlyArray<QueryKey>;
  /** 通过后刷新详情 */
  detailQueryKey?: QueryKey;
};

export function DocumentApprovalActions(props: Props) {
  const qc = useQueryClient();
  const {
    approvalRecordId,
    documentStatus,
    invalidateQueryKeys = [],
    detailQueryKey,
  } = props;

  const [comment, setComment] = useState("");
  const permissions = useAuthStore((s) => s.permissions);
  const canApprove = permissions.includes(Permission.OA_APPROVE);

  const mut = useMutation({
    mutationFn: ({
      action,
      c,
    }: {
      action: "approve" | "reject";
      c?: string;
    }) =>
      submitApprovalRecordAction(Number(approvalRecordId), {
        action,
        ...(c?.trim() ? { comment: c.trim() } : {}),
      }),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === "approve" ? "已通过" : "已驳回");
      setComment("");
      for (const k of invalidateQueryKeys) {
        void qc.invalidateQueries({ queryKey: k });
      }
      if (detailQueryKey?.length) {
        void qc.invalidateQueries({ queryKey: detailQueryKey });
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "审批提交失败");
    },
  });

  if (documentStatus !== "pending") {
    return null;
  }

  /** 待审但尚未写入审批记录时，详情页无法直接提交 action，引导至队列页 */
  if (!approvalRecordId) {
    if (!canApprove) {
      return (
        <Card className="border-amber-100 bg-amber-50/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-900">
              待审批 · 单据传暂未关联审批实例
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-800 space-y-2 pb-4">
            <p>
              通常由具备 <strong>oa:approve</strong> 的同事在
              <strong>待审批中心</strong> 统一处理。若长时间无进展，请联系企业管理员排查流程配置。
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-emerald-100 bg-emerald-50/70">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-900">
            待审批 · 请到队列中处理
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-emerald-900 space-y-3 pb-4">
          <p>
            本单暂无法在详情页直接点「同意/驳回」（未关联 <code>approval_record</code>
            ）。您可在<strong>待审批中心</strong>查看本企业同类型待办并操作。
          </p>
          <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto bg-white">
            <Link href="/dashboard/oa/pending-approvals">打开待审批中心 →</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!canApprove) {
    return (
      <Card className="border-amber-100 bg-amber-50/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-amber-900">
            待审批 · 仅限审批人操作
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-amber-800 space-y-2 pb-4">
          <p>
            本条需具有 <strong>oa:approve</strong> 的成员处理（通常为<strong>老板</strong>或
            <strong>行政</strong>）。当前账号无权在此页点击审批按钮。
          </p>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto border-amber-200">
            <Link href="/dashboard/oa/pending-approvals">了解待审批队列</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-green-100 bg-green-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-900">审批操作</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          label="审批意见（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="例如：同意，注意安排好交接"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            loading={mut.isPending}
            onClick={() => mut.mutate({ action: "approve", c: comment })}
          >
            同意
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={mut.isPending}
            onClick={() => mut.mutate({ action: "reject", c: comment })}
          >
            驳回
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
