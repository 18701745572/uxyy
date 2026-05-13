"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "@phosphor-icons/react";
import { fetchLeaveRequest } from "@/lib/api/leave-requests";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentApprovalActions } from "@/components/oa/document-approval-actions";
import { OaDocumentDetailSkeleton } from "@/components/oa/oa-document-detail-skeleton";

export default function LeaveRequestDetailPage() {
  const params = useParams();
  const idParam = params?.id;
  const id = typeof idParam === "string" ? Number(idParam) : NaN;

  const q = useQuery({
    queryKey: ["oa", "leave-requests", id],
    queryFn: () => fetchLeaveRequest(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <p className="text-sm text-red-600 p-6">无效的请假单 ID</p>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/oa/leave-requests">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-text-primary">请假详情 #{id}</h1>
      </div>

      {q.isLoading && <OaDocumentDetailSkeleton />}
      {q.isError && (
        <pre className="text-sm text-red-700 whitespace-pre-wrap">
          {q.error instanceof ApiError ? q.error.message : String(q.error)}
        </pre>
      )}
      {q.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{q.data.type} · {q.data.status}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-text-secondary">
              <p>
                起止：<span className="font-medium">{String(q.data.startDate).slice(0, 10)}</span>
                {" ～ "}
                <span className="font-medium">{String(q.data.endDate).slice(0, 10)}</span>
              </p>
              <p>天数：{q.data.days}</p>
              <p>原因：{q.data.reason ?? "—"}</p>
              <p className="text-xs text-text-tertiary pt-2">
                创建于 {String(q.data.createdAt).slice(0, 19).replace("T", " ")}
              </p>
            </CardContent>
          </Card>
          <DocumentApprovalActions
            approvalRecordId={q.data.approvalRecordId}
            documentStatus={q.data.status}
            invalidateQueryKeys={[
              ["oa", "pending-approvals"],
              ["oa", "leave-requests"],
            ]}
            detailQueryKey={["oa", "leave-requests", id]}
          />
        </>
      )}
    </div>
  );
}
