"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, CheckCircle, Clock, XCircle, AlertCircle, Plus, Search } from "lucide-react";
import { fetchLeaveRequests } from "@/lib/api/leave-requests";
import { ApiError } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const statusMap = {
  pending: { label: "待审批", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "已通过", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
} as const;

const typeTone: Record<string, string> = {
  年假: "bg-blue-100 text-blue-800",
  病假: "bg-red-100 text-red-800",
  事假: "bg-orange-100 text-orange-800",
};

function formatDay(iso: string) {
  return String(iso).slice(0, 10);
}

export default function LeaveRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const q = useQuery({
    queryKey: ["oa", "leave-requests"],
    queryFn: () => fetchLeaveRequests(),
  });

  const rows = useMemo(() => q.data ?? [], [q.data]);

  const filteredRequests = useMemo(() => {
    return rows.filter((req) => {
      if (filterStatus !== "all" && req.status !== filterStatus) return false;
      if (searchQuery && !String(req.reason ?? "").includes(searchQuery)) return false;
      return true;
    });
  }, [rows, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const approved = rows.filter((r) => r.status === "approved").length;
    return { pending, approved, totalDays: "—" };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">请假管理</h1>
          <p className="text-zinc-500 mt-1">事假、病假、年假申请与审批（数据来自后端）</p>
        </div>
        <Link href="/dashboard/oa/leave-requests/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            请假申请
          </Button>
        </Link>
      </div>

      {q.isError && (
        <p className="text-sm text-red-700 bg-red-50 rounded-md px-3 py-2">
          {q.error instanceof ApiError ? q.error.message : String(q.error)}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">本月请假统计</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.totalDays}</p>
            <p className="text-xs text-zinc-400 mt-1">可按列表自行汇总天数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">列表条数</p>
            <p className="text-2xl font-bold text-zinc-900">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">待审批</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">已通过</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索请假原因..."
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
          <CardTitle className="text-lg">请假记录</CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <p className="text-sm text-zinc-500 py-8 text-center">加载中…</p>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无请假记录</p>
              <p className="text-sm mt-1">点击右上角按钮发起请假申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const meta = statusMap[req.status as keyof typeof statusMap] ?? statusMap.pending;
                const StatusIcon = meta.icon;
                const tone = typeTone[req.type] ?? "bg-zinc-100 text-zinc-800";
                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-100 p-3 rounded-lg">
                        <Calendar className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={tone}>{req.type}</Badge>
                          <Badge className={meta.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-900 mt-1">
                          {formatDay(req.startDate)} 至 {formatDay(req.endDate)} · {req.days}天
                        </p>
                        <p className="text-sm text-zinc-500">{req.reason ?? "—"}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-zinc-400">{formatDay(req.createdAt)}</p>
                      <Link href={`/dashboard/oa/leave-requests/${req.id}`}>
                        <Button variant="ghost" size="sm" className="mt-2">
                          查看详情
                        </Button>
                      </Link>
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
