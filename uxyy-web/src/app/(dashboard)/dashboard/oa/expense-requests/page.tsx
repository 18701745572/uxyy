"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  MagnifyingGlass,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  WarningCircle,
} from "@/components/icons";
import { fetchExpenseRequests } from "@/lib/api/expense-requests";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const statusMap = {
  pending: {
    label: "待审批",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  approved: {
    label: "已通过",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  rejected: {
    label: "已驳回",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  cancelled: {
    label: "已取消",
    color: "bg-gray-100 text-gray-800",
    icon: WarningCircle,
  },
} as const;

const typeTone: Record<string, string> = {
  差旅费: "bg-blue-100 text-blue-800",
  办公费: "bg-green-100 text-green-800",
  招待费: "bg-orange-100 text-orange-800",
};

export default function ExpenseRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const q = useQuery({
    queryKey: ["oa", "expense-requests"],
    queryFn: () => fetchExpenseRequests(),
  });

  const rows = useMemo(() => q.data ?? [], [q.data]);

  const filteredRequests = useMemo(() => {
    return rows.filter((req) => {
      if (filterStatus !== "all" && req.status !== filterStatus) return false;
      if (searchQuery && !String(req.description ?? "").includes(searchQuery))
        return false;
      return true;
    });
  }, [rows, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const approvedSum = rows
      .filter((r) => r.status === "approved")
      .reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
    return {
      approvedSum,
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">报销管理</h1>
          <p className="text-text-tertiary mt-1">
            费用报销申请（数据来自后端）
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/oa/expense-requests/new">
            <Plus className="w-4 h-4 mr-2" />
            报销申请
          </Link>
        </Button>
      </div>

      {q.isError && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {q.error instanceof ApiError ? q.error.message : String(q.error)}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">已通过金额合计</p>
            <p className="text-2xl font-bold text-text-primary">
              ¥{stats.approvedSum.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">报销笔数</p>
            <p className="text-2xl font-bold text-text-primary">
              {rows.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">待审批</p>
            <p className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-text-tertiary">已通过</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.approved}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="搜索报销说明..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "primary" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
            >
              {status === "all" && "全部"}
              {status === "pending" && "待审批"}
              {status === "approved" && "已通过"}
              {status === "rejected" && "已驳回"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">报销记录</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-text-tertiary py-8 text-center">
              加载中…
            </p>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无报销记录</p>
              <p className="text-sm mt-1">点击右上角按钮发起报销申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const meta =
                  statusMap[req.status as keyof typeof statusMap] ??
                  statusMap.pending;
                const StatusIcon = meta.icon;
                const tone = typeTone[req.type] ?? "bg-gray-100 text-gray-800";
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-bg-tertiary p-3 rounded-lg">
                        <Receipt className="w-5 h-5 text-text-secondary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={tone}>{req.type}</Badge>
                          <Badge className={meta.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-text-primary mt-1">
                          ¥{req.amount}
                        </p>
                        <p className="text-sm text-text-tertiary">
                          {req.description ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-text-muted">
                        {String(req.createdAt).slice(0, 10)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        asChild
                      >
                        <Link href={`/dashboard/oa/expense-requests/${req.id}`}>
                          查看详情
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
