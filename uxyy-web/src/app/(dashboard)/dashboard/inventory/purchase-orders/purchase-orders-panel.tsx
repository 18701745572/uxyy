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
import { createSupplierPayment } from "@/lib/api/supplier-payments";
import { fetchAllSuppliers } from "@/lib/api/suppliers";
import { fetchAllProducts } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NumberInput } from "@/components/ui/input";
import { ExportMenu } from "@/components/export/export-menu";
import { Plus, Trash } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const selectCls =
  "rounded-md border border-border-primary bg-bg-secondary text-text-primary px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all";

const statusMap: Record<OrderStatus, string> = {
  draft: "草稿",
  pending: "待审批",
  approved: "已批准",
  completed: "已完成",
  cancelled: "已取消",
};

const statusColorMap: Record<OrderStatus, string> = {
  draft: "text-text-tertiary",
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

function mapItemsFromOrder(
  init: PurchaseOrderResponseDto | undefined,
): OrderFormData["items"] {
  if (init?.items?.length) {
    return init.items.map((it) => ({
      productId: it.productId,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
    }));
  }
  return [{ productId: 0, quantity: 1, unitPrice: 0 }];
}

function PurchaseOrderForm({
  init,
  onDone,
}: {
  init?: PurchaseOrderResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [formData, setFormData] = useState<OrderFormData>(() => ({
    supplierId: init?.supplierId ?? 0,
    remark: init?.remark ?? "",
    items: mapItemsFromOrder(init),
  }));
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const suppliersQ = useQuery({
    queryKey: ["inventory", "suppliers", "purchase-order-form"],
    queryFn: () => fetchAllSuppliers(),
    enabled: !isEdit,
  });

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "purchase-order-form"],
    queryFn: () => fetchAllProducts(),
    enabled: !isEdit,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        return updatePurchaseOrder(init!.id, {
          remark: formData.remark?.trim() || undefined,
        });
      }
      const validItems = formData.items.filter(
        (l) => l.productId > 0 && l.quantity > 0 && !Number.isNaN(l.quantity),
      );
      const body = {
        supplierId: formData.supplierId,
        remark: formData.remark?.trim() || undefined,
        items: validItems.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
      } satisfies Parameters<typeof createPurchaseOrder>[0];
      return createPurchaseOrder(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEdit) {
      if (formData.supplierId <= 0) {
        setError("请选择供应商");
        return;
      }
      const validItems = formData.items.filter(
        (l) => l.productId > 0 && l.quantity > 0 && !Number.isNaN(l.quantity),
      );
      if (validItems.length === 0) {
        setError("请至少添加一行商品，并选择商品、填写数量（单价可为 0）");
        return;
      }
      if (validItems.some((l) => l.unitPrice < 0 || Number.isNaN(l.unitPrice))) {
        setError("单价不能为负数");
        return;
      }
    }
    mutation.mutate();
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: 0, quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItemRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItemRow = (
    index: number,
    patch: Partial<OrderFormData["items"][number]>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const suppliers = suppliersQ.data ?? [];
  const products = productsQ.data ?? [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isEdit && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">供应商 *</label>
            {suppliersQ.isLoading ? (
              <p className="text-sm text-text-tertiary">加载供应商…</p>
            ) : suppliers.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                暂无供应商，请先在「进销存 → 供应商」中新建供应商后再建采购单。
              </p>
            ) : (
              <select
                className={selectCls}
                value={formData.supplierId > 0 ? String(formData.supplierId) : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    supplierId: Number(e.target.value),
                  }))
                }
                required
              >
                <option value="">请选择供应商</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (#{s.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-text-secondary">
                采购明细 *
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={addItemRow}
              >
                <Plus className="h-4 w-4" />
                添加商品行
              </Button>
            </div>
            {productsQ.isLoading ? (
              <p className="text-sm text-text-tertiary">加载商品…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                暂无商品，请先在「进销存 → 商品」中建档后再添加明细。
              </p>
            ) : (
              <div className="space-y-2 rounded-lg border border-border-primary p-3">
                {formData.items.map((row, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end sm:flex-wrap"
                  >
                    <div className="flex flex-col gap-1 min-w-[180px] flex-1">
                      <span className="text-xs text-text-tertiary">商品</span>
                      <select
                        className={selectCls}
                        value={row.productId > 0 ? String(row.productId) : ""}
                        onChange={(e) =>
                          updateItemRow(idx, {
                            productId: Number(e.target.value),
                          })
                        }
                      >
                        <option value="">选择商品</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) #{p.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <NumberInput
                      label="数量 *"
                      min={0.01}
                      step={0.01}
                      className="w-full sm:w-28"
                      value={row.quantity}
                      onChange={(e) =>
                        updateItemRow(idx, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <NumberInput
                      label="单价"
                      min={0}
                      step={0.01}
                      className="w-full sm:w-28"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateItemRow(idx, {
                          unitPrice: Number(e.target.value),
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      disabled={formData.items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      aria-label="删除本行"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isEdit && init?.items?.length ? (
        <div className="rounded-lg border border-border-primary p-3 space-y-2">
          <p className="text-sm font-medium text-text-secondary">采购明细（只读）</p>
          <p className="text-xs text-text-tertiary">
            草稿仅支持修改备注；若要调整商品，请删除本单后重新创建。
          </p>
          <ul className="text-sm text-text-secondary space-y-1">
            {init.items.map((it) => (
              <li key={it.id}>
                商品 #{it.productId} × {it.quantity} @ ¥{it.unitPrice} = ¥
                {it.amount}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">备注</label>
        <textarea
          className={selectCls}
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
  const [payingOrder, setPayingOrder] = useState<PurchaseOrderResponseDto | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "bank" | "alipay" | "wechat">("bank");
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

  const payMutation = useMutation({
    mutationFn: ({
      orderId,
      supplierId,
      amount,
      paymentMethod,
      orderNo,
    }: {
      orderId: number;
      supplierId: number;
      amount: string;
      paymentMethod: string;
      orderNo: string;
    }) =>
      createSupplierPayment({
        supplierId,
        orderId,
        amount,
        paymentMethod: paymentMethod as "cash" | "bank" | "alipay" | "wechat",
        paymentDate: new Date().toISOString().split("T")[0],
        remark: `采购订单 ${orderNo} 付款`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["inventory", "supplier-payments"] });
      setPayingOrder(null);
      setPayAmount("");
    },
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
        <h2 className="font-medium text-text-primary mb-4">新建采购订单</h2>
        <PurchaseOrderForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-text-primary mb-4">
          编辑采购订单 · {editing.orderNo}
        </h2>
        <PurchaseOrderForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">采购订单</h1>
        <div className="flex items-center gap-2">
          <ExportMenu type="purchase_orders" filename="purchase-orders" />
          <Button onClick={() => setCreating(true)}>+ 新建采购订单</Button>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          className={selectCls}
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
          <p className="text-sm text-text-secondary p-6">加载中…</p>
        ) : q.isError ? (
          <pre className="whitespace-pre-wrap text-sm text-red-700 p-6">
            {q.error instanceof Error ? q.error.message : String(q.error)}
          </pre>
        ) : (
          <>
            <div className="px-4 py-3 text-sm text-text-secondary border-b border-border-secondary flex justify-between">
              <span>
                共 <strong>{q.data?.total ?? 0}</strong> 条 · 第{" "}
                <strong>{q.data?.page ?? page}</strong> 页
              </span>
            </div>

            {!q.data?.list?.length ? (
              <p className="p-8 text-center text-sm text-text-tertiary">
                暂无采购订单数据
              </p>
            ) : (
              <ul className="divide-y divide-border-secondary">
                {(q.data?.list ?? []).map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium text-text-primary">
                        {row.orderNo}
                        <span
                          className={`ml-2 text-xs ${statusColorMap[row.status]}`}
                        >
                          {statusMap[row.status]}
                        </span>
                      </div>
                      <div className="text-xs text-text-secondary">
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
                      {row.status === "approved" && (
                        <Button
                          variant="secondary"
                          className="text-xs px-2.5 py-1 text-green-600 hover:text-green-700"
                          onClick={() => {
                            setPayingOrder(row);
                            setPayAmount(String(row.totalAmount));
                          }}
                        >
                          付款
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-center justify-between px-4 py-3 border-t border-border-secondary">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-text-secondary">
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

      <Dialog
        open={!!payingOrder}
        onOpenChange={(open) => {
          if (!open) {
            setPayingOrder(null);
            setPayAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              采购付款 · {payingOrder?.orderNo}
            </DialogTitle>
          </DialogHeader>
          {payingOrder && (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-text-secondary">
                <p>
                  供应商：{payingOrder.supplierName}
                </p>
                <p>
                  订单金额：¥{payingOrder.totalAmount}
                </p>
              </div>

              <NumberInput
                label="付款金额 *"
                step={0.01}
                min={0}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">
                  付款方式
                </label>
                <select
                  className={selectCls}
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(e.target.value as typeof payMethod)
                  }
                >
                  <option value="bank">银行转账</option>
                  <option value="cash">现金</option>
                  <option value="alipay">支付宝</option>
                  <option value="wechat">微信支付</option>
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPayingOrder(null);
                    setPayAmount("");
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (!payAmount || parseFloat(payAmount) <= 0) return;
                    payMutation.mutate({
                      orderId: payingOrder.id,
                      supplierId: payingOrder.supplierId,
                      amount: payAmount,
                      paymentMethod: payMethod,
                      orderNo: payingOrder.orderNo,
                    });
                  }}
                  disabled={
                    payMutation.isPending ||
                    !payAmount ||
                    parseFloat(payAmount) <= 0
                  }
                >
                  {payMutation.isPending ? "付款中..." : "确认付款"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
