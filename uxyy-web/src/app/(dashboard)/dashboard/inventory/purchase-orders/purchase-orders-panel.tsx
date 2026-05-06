"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PurchaseOrderResponseDto, OrderStatus } from "@uxyy/shared";
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
} from "@/lib/api/purchase-orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const statusMap: Record<OrderStatus, string> = {
  draft: "草稿",
  pending: "待审批",
  approved: "已批准",
  completed: "已完成",
  cancelled: "已取消",
};

const statusColorMap: Record<OrderStatus, string> = {
  draft: "text-zinc-500",
  pending: "text-yellow-600",
  approved: "text-blue-600",
  completed: "text-green-600",
  cancelled: "text-red-600",
};

interface OrderFormData {
  supplierId: number;
  remark?: string;
  items: { productId: number; quantity: number; unitPrice: number }[];
}

function PurchaseOrderForm({
  init,
  onDone,
}: {
  init?: PurchaseOrderResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [formData, setFormData] = useState<OrderFormData>({
    supplierId: init?.supplierId ?? 0,
    remark: init?.remark ?? "",
    items: init?.items ?? [],
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updatePurchaseOrder(init!.id, { remark: formData.remark })
        : createPurchaseOrder(formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && (formData.supplierId <= 0 || formData.items.length === 0)) {
      setError("请填写供应商和商品明细");
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {!isEdit && (
        <Input
          label="供应商ID *"
          type="number"
          value={formData.supplierId}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              supplierId: Number(e.target.value),
            }))
          }
          placeholder="1"
        />
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">备注</label>
        <textarea
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          rows={3}
          value={formData.remark}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, remark: e.target.value }))
          }
          placeholder="采购备注..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 rounded-md bg-red-50 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onDone}>
          取消
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "保存" : "创建"}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseOrdersPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [editing, setEditing] = useState<PurchaseOrderResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["inventory", "purchase-orders", page, pageSize, status],
    [page, status],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchPurchaseOrders({ page, pageSize, status }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] }),
  });

  const submitMutation = useMutation({
    mutationFn: submitPurchaseOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      approvePurchaseOrder(id, action),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] }),
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">新建采购订单</h2>
        <PurchaseOrderForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-zinc-900 mb-4">
          编辑采购订单 · {editing.orderNo}
        </h2>
        <PurchaseOrderForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">采购订单</h1>
        <Button onClick={() => setCreating(true)}>+ 新建采购订单</Button>
      </div>

      <div className="flex gap-2">
        <select
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/20"
          value={status ?? ""}
          onChange={(e) => {
            setStatus((e.target.value as OrderStatus) || undefined);
            setPage(1);
          }}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="pending">待审批</option>
          <option value="approved">已批准</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        {q.isLoading ? (
          <p className="text-sm text-zinc-600 p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-zinc-600 border-b border-zinc-100 flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!q.data?.list?.length ? (
              <p className="p-8 text-center text-sm text-zinc-500">
                暂无采购订单数据
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {(q.data?.list ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">
                        {row.orderNo}
                        <span
                          className={`ml-2 text-xs ${statusColorMap[row.status]}`}
                        >
                          {statusMap[row.status]}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600">
                        <span className="mr-3">
                          供应商: {row.supplierName ?? `ID:${row.supplierId}`}
                        </span>
                        <span className="mr-3">
                          金额: ¥{row.totalAmount}
                        </span>
                        <span>商品数: {row.items?.length ?? 0} 项</span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      {row.status === "draft" && (
                        <>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1"
                            onClick={() => setEditing(row)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1"
                            onClick={() => submitMutation.mutate(row.id)}
                          >
                            提交
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`确定删除订单 ${row.orderNo} 吗？`)) {
                                deleteMutation.mutate(row.id);
                              }
                            }}
                          >
                            删除
                          </Button>
                        </>
                      )}
                      {row.status === "pending" && (
                        <>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1"
                            onClick={() =>
                              approveMutation.mutate({ id: row.id, action: "approve" })
                            }
                          >
                            批准
                          </Button>
                          <Button
                            variant="secondary"
                            className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                            onClick={() =>
                              approveMutation.mutate({ id: row.id, action: "reject" })
                            }
                          >
                            拒绝
                          </Button>
                        </>
                      )}
                      {(row.status === "approved" || row.status === "pending") && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2.5 py-1 text-red-600 hover:text-red-700"
                          onClick={() => cancelMutation.mutate(row.id)}
                        >
                          取消
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-zinc-600">
                {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
