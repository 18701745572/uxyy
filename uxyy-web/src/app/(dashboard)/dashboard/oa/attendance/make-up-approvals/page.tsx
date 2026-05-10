"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchMakeUpRequests,
  approveMakeUp,
  type MakeUpRequestListItem,
} from "@/lib/api/attendance";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, CheckCircle2, XCircle, Clock, User, Calendar, MessageSquare } from "lucide-react";

type FilterStatus = "pending" | "all" | "approved" | "rejected";

function statusLabel(s: MakeUpRequestListItem["status"]): string {
  switch (s) {
    case "pending":
      return "待审批";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
    default:
      return s;
  }
}

function statusBadgeClass(s: MakeUpRequestListItem["status"]): string {
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

function formatLocalDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function MakeUpApprovalsPage() {
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [selectedRequest, setSelectedRequest] = useState<MakeUpRequestListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["attendance", "make-up-requests", filter],
    [filter],
  );

  const listQuery = useQuery({
    queryKey,
    queryFn: () =>
      fetchMakeUpRequests(filter === "all" ? undefined : filter),
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 403) return false;
      return failureCount < 1;
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({
      id,
      approved,
      remark,
    }: {
      id: number;
      approved: boolean;
      remark?: string;
    }) => approveMakeUp(id, approved, remark),
    onSuccess: (_, v) => {
      toast.success(v.approved ? "已通过补卡申请" : "已驳回");
      void qc.invalidateQueries({ queryKey: ["attendance", "make-up-requests"] });
      setSelectedRequest(null);
      setRejectReason("");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "操作失败");
    },
  });

  const is403 =
    listQuery.isError &&
    listQuery.error instanceof ApiError &&
    listQuery.error.status === 403;

  const handleApprove = (request: MakeUpRequestListItem) => {
    setActionType("approve");
    setSelectedRequest(request);
    setRejectReason("");
  };

  const handleReject = (request: MakeUpRequestListItem) => {
    setActionType("reject");
    setSelectedRequest(request);
    setRejectReason("");
  };

  const confirmAction = () => {
    if (!selectedRequest) return;
    
    if (actionType === "approve") {
      approveMutation.mutate({ id: selectedRequest.id, approved: true });
    } else {
      approveMutation.mutate({ id: selectedRequest.id, approved: false, remark: rejectReason });
    }
  };

  const statusCounts = useMemo(() => {
    if (!listQuery.data) return { pending: 0, approved: 0, rejected: 0 };
    return {
      pending: listQuery.data.filter((r) => r.status === "pending").length,
      approved: listQuery.data.filter((r) => r.status === "approved").length,
      rejected: listQuery.data.filter((r) => r.status === "rejected").length,
    };
  }, [listQuery.data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/oa/attendance">
            <Button variant="ghost" size="icon" className="hover:bg-zinc-100">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900">补卡审批</h1>
            <p className="text-sm text-zinc-600">
              处理员工补卡申请，支持批量查看和审批操作
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { status: "pending" as const, label: "待审批", count: statusCounts.pending, bg: "bg-amber-50", color: "text-amber-600" },
          { status: "approved" as const, label: "已通过", count: statusCounts.approved, bg: "bg-green-50", color: "text-green-600" },
          { status: "rejected" as const, label: "已驳回", count: statusCounts.rejected, bg: "bg-red-50", color: "text-red-600" },
          { status: "all" as const, label: "全部", count: listQuery.data?.length || 0, bg: "bg-zinc-50", color: "text-zinc-600" },
        ].map(({ status, label, count, bg, color }) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "ghost"}
            onClick={() => setFilter(status)}
            className={`justify-start gap-2 ${filter === status ? "" : bg}`}
          >
            <span className={color}>{label}</span>
            <Badge variant="outline" className="ml-auto">
              {count}
            </Badge>
          </Button>
        ))}
      </div>

      {listQuery.isLoading && (
        <Card className="p-8 text-center">
          <Spinner className="mx-auto mb-2" />
          <p className="text-sm text-zinc-600">加载中…</p>
        </Card>
      )}

      {is403 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-900">
            当前账号没有「OA 审批」权限，无法查看补卡列表。请使用老板或分配了行政（oa）等含审批权限的账号登录。
          </p>
        </Card>
      )}

      {!listQuery.isLoading && listQuery.isError && !is403 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-800">
            {(listQuery.error as Error).message || "加载失败"}
          </p>
        </Card>
      )}

      {listQuery.data && (
        <div className="space-y-3">
          {listQuery.data.length === 0 ? (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">暂无{filter === "all" ? "" : statusLabel(filter)}补卡申请</p>
            </Card>
          ) : (
            listQuery.data.map((row) => (
              <Card key={row.id} className="p-4 transition-all duration-200 hover:shadow-md">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900">{row.applicantName}</span>
                          <Badge className={statusBadgeClass(row.status)}>
                            {statusLabel(row.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {row.type === "in" ? "上班卡" : "下班卡"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateOnly(row.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-13 pl-13">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-zinc-700">{row.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <span className="text-xs text-zinc-500">
                      提交于 {formatLocalDate(row.createdAt)}
                      {row.status !== "pending" && row.approvedAt && (
                        <>
                          {" · "}处理于 {formatLocalDate(row.approvedAt)}
                          {row.remark && ` · 备注: ${row.remark}`}
                        </>
                      )}
                    </span>
                    {row.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={approveMutation.isPending}
                          onClick={() => handleReject(row)}
                          className="flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          驳回
                        </Button>
                        <Button
                          size="sm"
                          disabled={approveMutation.isPending}
                          onClick={() => handleApprove(row)}
                          className="flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          通过
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  通过补卡申请
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  驳回补卡申请
                </>
              )}
            </DialogTitle>
            {selectedRequest && (
              <DialogDescription className="text-sm">
                {selectedRequest.applicantName} · {selectedRequest.type === "in" ? "上班卡" : "下班卡"} · {formatDateOnly(selectedRequest.date)}
              </DialogDescription>
            )}
          </DialogHeader>

          {actionType === "reject" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                驳回原因（选填）
              </label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="请说明驳回原因..."
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={() => setSelectedRequest(null)}
              disabled={approveMutation.isPending}
            >
              取消
            </Button>
            <Button
              onClick={confirmAction}
              disabled={approveMutation.isPending}
              className={actionType === "approve" ? "" : "bg-red-500 hover:bg-red-600"}
            >
              {approveMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  处理中...
                </>
              ) : (
                actionType === "approve" ? "确认通过" : "确认驳回"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}