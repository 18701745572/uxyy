"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle 
} from "lucide-react";

// 模拟数据
const mockLeaveRequests = [
  {
    id: 1,
    type: "年假",
    startDate: "2026-05-10",
    endDate: "2026-05-12",
    days: "3.0",
    reason: "回家探亲",
    status: "pending",
    createdAt: "2026-05-07",
  },
  {
    id: 2,
    type: "病假",
    startDate: "2026-04-15",
    endDate: "2026-04-16",
    days: "2.0",
    reason: "感冒发烧",
    status: "approved",
    createdAt: "2026-04-14",
  },
];

const statusMap = {
  pending: { label: "待审批", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "已通过", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
};

const typeMap = {
  "年假": "bg-blue-100 text-blue-800",
  "病假": "bg-red-100 text-red-800",
  "事假": "bg-orange-100 text-orange-800",
};

export default function LeaveRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredRequests = mockLeaveRequests.filter((req) => {
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    if (searchQuery && !req.reason?.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">请假管理</h1>
          <p className="text-zinc-500 mt-1">事假、病假、年假申请与审批</p>
        </div>
        <Link href="/dashboard/oa/leave-requests/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            请假申请
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">本月请假</p>
            <p className="text-2xl font-bold text-zinc-900">2 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">剩余年假</p>
            <p className="text-2xl font-bold text-zinc-900">5 天</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">待审批</p>
            <p className="text-2xl font-bold text-yellow-600">1</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">已批准</p>
            <p className="text-2xl font-bold text-green-600">1</p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
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
        <div className="flex gap-2">
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

      {/* 请假列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">请假记录</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无请假记录</p>
              <p className="text-sm mt-1">点击右上角按钮发起请假申请</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const status = statusMap[req.status as keyof typeof statusMap];
                const StatusIcon = status.icon;
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
                        <div className="flex items-center gap-2">
                          <Badge className={typeMap[req.type as keyof typeof typeMap]}>
                            {req.type}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-900 mt-1">
                          {req.startDate} 至 {req.endDate} · {req.days}天
                        </p>
                        <p className="text-sm text-zinc-500">{req.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">{req.createdAt}</p>
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
