"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSalesOutboundPage,
  createSalesOutbound,
  confirmSalesOutbound,
  deleteSalesOutbound,
  type CreateOutboundDto,
} from "@/lib/api/sales-outbound";
import { fetchSalesOrders } from "@/lib/api/sales-orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-bg-tertiary text-text-secondary" },
  confirmed: { label: "已确认", className: "bg-green-100 text-green-600" },
};

interface CreateFormData {
  orderId: number | undefined;
  remark: string;
}

function CreateOutboundForm({ onDone }: { onDone: () => void }) {
  const [formData, setFormData] = useState<CreateFormData>({
    orderId: undefined,
    remark: "",
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const { data: ordersData } = useQuery({
    queryKey: ["inventory", "sales-orders", "for-outbound"],
    queryFn: () =>
      fetchSalesOrders({
        page: 1,
        pageSize: 100,
        status: "approved",
      }),
  });

  const selectedOrder = ordersData?.list?.find((o) => o.id === formData.orderId);

  const mutation = useMutation({
    mutationFn: (dto: CreateOutboundDto) => createSalesOutbound(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "sales-outbound"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orderId || !selectedOrder) {
      setError("请选择销售订单");
      return;
    }

    const items: CreateOutboundDto["items"] = selectedOrder.items.map((item) => ({
      productId: item.productId,
      productName: item.productName ?? "",
      productCode: "",
      unit: "",
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      amount: String(item.amount),
    }));

    mutation.mutate({
      orderId: formData.orderId,
      customerId: selectedOrder.customerId,
      customerName: selectedOrder.customerName ?? "",
      remark: formData.remark || undefined,
      items,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">销售订单 *</label>
        <select
          className={selectCls}
          value={formData.orderId ?? ""}
          onChange={(e) => {
            setFormData((prev) => ({
              ...prev,
              orderId: e.target.value ? Number(e.target.value) : undefined,
            }));
          }}
        >
          <option value="">请选择销售订单</option>
          {ordersData?.list?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} - {o.customerName} - ¥{o.totalAmount}
            </option>
          ))}
        </select>
      </div>

      {selectedOrder && (
        <div className="p-3 bg-bg-secondary rounded-md">
          <h4 className="text-sm font-medium mb-2">订单商品明细</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="text-left py-1">商品</th>
                <th className="text-right py-1">单价</th>
                <th className="text-right py-1">数量</th>
                <th className="text-right py-1">金额</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1">{item.productName}</td>
                  <td className="text-right">¥{item.unitPrice}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">¥{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">备注</label>
        <textarea
          className={selectCls}
          rows={2}
          value={formData.remark}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remark: e.target.value }))
          }
          placeholder="可选"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? "创建中..." : "创建出库单"}
      </Button>
    </form>
  );
}

export default function SalesOutboundPanel() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", "sales-outbound", page],
    queryFn: () => getSalesOutboundPage({ page, pageSize: 20 }),
  });

  const confirmMutation = useMutation({
    mutationFn: confirmSalesOutbound,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "sales-outbound"] });
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSalesOutbound,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "sales-outbound"] });
      setDeleteId(null);
    },
  });

  const orders = data?.data ?? [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">销售出库</h1>
          <p className="text-sm text-text-tertiary">管理销售出库单，扣减库存</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ 创建出库单</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-text-tertiary">加载失败</Card>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-text-tertiary">暂无出库单</Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-left">
                  <th className="pb-3 font-medium text-text-tertiary">出库单号</th>
                  <th className="pb-3 font-medium text-text-tertiary">客户</th>
                  <th className="pb-3 font-medium text-text-tertiary">关联订单</th>
                  <th className="pb-3 font-medium text-text-tertiary">状态</th>
                  <th className="pb-3 font-medium text-text-tertiary">创建时间</th>
                  <th className="pb-3 font-medium text-text-tertiary">确认时间</th>
                  <th className="pb-3 font-medium text-text-tertiary">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border-secondary">
                    <td className="py-3 font-medium">{order.orderNo}</td>
                    <td className="py-3">{order.customerName}</td>
                    <td className="py-3">
                      <Badge variant="default">SO{order.orderId}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge className={STATUS_LABELS[order.status]?.className}>
                        {STATUS_LABELS[order.status]?.label}
                      </Badge>
                    </td>
                    <td className="py-3">{formatDate(order.createdAt)}</td>
                    <td className="py-3">
                      {order.confirmedAt ? formatDate(order.confirmedAt) : "-"}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        {order.status === "draft" && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => confirmMutation.mutate(order.id)}
                              disabled={confirmMutation.isPending}
                            >
                              {confirmMutation.isPending ? "确认中..." : "确认出库"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => setDeleteId(order.id)}
                            >
                              删除
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-text-tertiary">
                第 {page} / {data.totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建销售出库单</DialogTitle>
          </DialogHeader>
          <CreateOutboundForm onDone={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            确定要删除这条出库单吗？此操作不可撤销。
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}