"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStockAlerts,
  fetchStockAlertStats,
  checkAndCreateStockAlerts,
  updateStockAlert,
  type StockAlertResponseDto,
  type StockAlertType,
  type StockAlertStatus,
} from "@/lib/api/inventory";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { RefreshCw, CheckCircle, Bell } from "lucide-react";

const alertTypeMap: Record<string, { label: string; color: string }> = {
  low: { label: "低于下限", color: "bg-red-100 text-red-800" },
  high: { label: "高于上限", color: "bg-yellow-100 text-yellow-800" },
};

const alertStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-red-100 text-red-800" },
  read: { label: "已读", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "已解决", color: "bg-green-100 text-green-800" },
};

export default function StockAlertsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">库存预警</h1>
      <StockAlertsPanel />
    </div>
  );
}

function StockAlertsPanel() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState<StockAlertType | undefined>(undefined);
  const [status, setStatus] = useState<StockAlertStatus | undefined>(undefined);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = ["inventory", "stock-alerts", page, pageSize, type, status];

  const q = useQuery({
    queryKey,
    queryFn: () =>
      fetchStockAlerts({ page, pageSize, type, status }),
    placeholderData: (prev) => prev,
  });

  const statsQ = useQuery({
    queryKey: ["inventory", "stock-alerts-stats"],
    queryFn: fetchStockAlertStats,
  });

  const checkMutation = useMutation({
    mutationFn: checkAndCreateStockAlerts,
    onSuccess: (data) => {
      alert(`检查完成，新增 ${data.alertCount} 条预警`);
      qc.invalidateQueries({ queryKey: ["inventory", "stock-alerts"] });
      qc.invalidateQueries({ queryKey: ["inventory", "stock-alerts-stats"] });
    },
    onError: (e: Error) => alert(e.message || "检查失败"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StockAlertStatus }) =>
      updateStockAlert(id, { status }),
    onSuccess: () => {
      alert("更新成功");
      qc.invalidateQueries({ queryKey: ["inventory", "stock-alerts"] });
      qc.invalidateQueries({ queryKey: ["inventory", "stock-alerts-stats"] });
    },
    onError: (e: Error) => alert(e.message || "更新失败"),
  });

  const items: StockAlertResponseDto[] = q.data?.items ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const stats = statsQ.data;

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardDescription>待处理预警</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {stats?.pendingCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardDescription>今日新增</CardDescription>
            <CardTitle className="text-3xl">
              {stats?.todayCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardDescription>低于下限</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {stats?.lowCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="p-0">
          <CardHeader className="pb-2">
            <CardDescription>高于上限</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {stats?.highCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={type ?? "all"}
          onValueChange={(v) => setType(v === "all" ? undefined : (v as StockAlertType))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="预警类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="low">低于下限</SelectItem>
            <SelectItem value="high">高于上限</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status ?? "all"}
          onValueChange={(v) => setStatus(v === "all" ? undefined : (v as StockAlertStatus))}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="read">已读</SelectItem>
            <SelectItem value="resolved">已解决</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => checkMutation.mutate()}
          disabled={checkMutation.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${checkMutation.isPending ? "animate-spin" : ""}`} />
          立即检查
        </Button>
      </div>

      {/* 预警列表 */}
      <Card className="p-0">
        <CardHeader>
          <CardTitle>预警记录</CardTitle>
          <CardDescription>
            共 {total} 条记录
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>当前库存</TableHead>
                <TableHead>阈值</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    暂无预警记录
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.productCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={alertTypeMap[item.type]?.color ?? ""}>
                        {alertTypeMap[item.type]?.label ?? item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={item.type === "low" ? "text-red-600 font-medium" : "text-yellow-600 font-medium"}>
                        {item.currentStock}
                      </span>
                    </TableCell>
                    <TableCell>{item.threshold}</TableCell>
                    <TableCell>
                      <Badge className={alertStatusMap[item.status]?.color ?? ""}>
                        {alertStatusMap[item.status]?.label ?? item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateMutation.mutate({ id: item.id, status: "read" })
                            }
                            disabled={updateMutation.isPending}
                          >
                            标记已读
                          </Button>
                        )}
                        {item.status !== "resolved" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              updateMutation.mutate({ id: item.id, status: "resolved" })
                            }
                            disabled={updateMutation.isPending}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            解决
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                第 {page} / {totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
