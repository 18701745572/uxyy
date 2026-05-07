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
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle 
} from "lucide-react";

// 模拟数据
const mockExpenseRequests = [
  {
    id: 1,
    type: "差旅费",
    amount: "1280.00",
    description: "上海出差交通费",
    status: "pending",
    createdAt: "2026-05-06",
  },
  {
    id: 2,
    type: "办公费",
    amount: "256.50",
    description: "购买办公用品",
    status: "approved",
    createdAt: "2026-05-01",
  },
];

const statusMap = {
  pending: { label: "待审批", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "已通过", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
};

const typeMap = {
  "差旅费": "bg-blue-100 text-blue-800",
  "办公费": "bg-green-100 text-green-800",
  "招待费": "bg-orange-100 text-orange-800",
  "其他": "bg-gray-100 text-gray-800",
};

export default function ExpenseRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredRequests = mockExpenseRequests.filter((req) => {
    if (filterStatus !== "all" && req.status !== filterStatus) return false;
    if (searchQuery && !req.description?.includes(searchQuery)) return false;
    return true;
  });

  const totalAmount = mockExpenseRequests
    .filter(r => r.status === "approved")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">报销管理</h1>
          <p className="text-zinc-500 mt-1">费用报销申请、凭证上传与审批</p>
        </div>
        <Link href="/dashboard/oa/expense-requests/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            报销申请
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">本月报销</p>
            <p className="text-2xl font-bold text-zinc-900">¥{totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">报销笔数</p>
            <p className="text-2xl font-bold text-zinc-900">{mockExpenseRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">待审批</p>
            <p className="text-2xl font-bold text-yellow-600">
              {mockExpenseRequests.filter(r => r.status === "pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-zinc-500">已批准</p>
            <p className="text-2xl font-bold text-green-600">
              {mockExpenseRequests.filter(r => r.status === "approved").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索报销说明..."
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

      {/* 报销列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">报销记录</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无报销记录</p>
              <p className="text-sm mt-1">点击右上角按钮发起报销申请</p>
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
                        <Receipt className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={typeMap[req.type as keyof typeof typeMap] || typeMap["其他"]}>
                            {req.type}
                          </Badge>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-900 mt-1">
                          ¥{req.amount}
                        </p>
                        <p className="text-sm text-zinc-500">{req.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">{req.createdAt}</p>
                      <Link href={`/dashboard/oa/expense-requests/${req.id}`}>
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
