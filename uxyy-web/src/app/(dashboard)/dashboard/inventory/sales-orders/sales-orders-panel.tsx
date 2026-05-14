"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SalesOrderResponseDto, OrderStatus } from "@uxyy/shared";
import {
  fetchSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  submitSalesOrder,
  approveSalesOrder,
  cancelSalesOrder,
} from "@/lib/api/sales-orders";
import { createPaymentRecord } from "@/lib/api/payment-records";
import { fetchCustomersAllPages } from "@/lib/api/customers";
import { fetchAllProducts } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type DeliveryChoice = "self" | "delivery";

interface OrderFormData {
  customerId: number;
  deliveryType: DeliveryChoice;
  remark?: string;
  items: { productId: number; quantity: number; unitPrice: number }[];
}

function mapItemsFromOrder(
  init: SalesOrderResponseDto | undefined,
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

function normalizeDelivery(init?: SalesOrderResponseDto): DeliveryChoice {
  const d = init?.deliveryType;
  return d === "delivery" ? "delivery" : "self";
}

function SalesOrderForm({
  init,
  onDone,
}: {
  init?: SalesOrderResponseDto;
  onDone: () => void;
}) {
  const isEdit = !!init;
  const [formData, setFormData] = useState<OrderFormData>(() => ({
    customerId: init?.customerId ?? 0,
    deliveryType: normalizeDelivery(init),
    remark: init?.remark ?? "",
    items: mapItemsFromOrder(init),
  }));
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const customersQ = useQuery({
    queryKey: ["crm", "customers", "sales-order-form"],
    queryFn: () => fetchCustomersAllPages(),
    enabled: !isEdit,
  });

  const productsQ = useQuery({
    queryKey: ["inventory", "products", "sales-order-form"],
    queryFn: () => fetchAllProducts(),
    enabled: !isEdit,
  });

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? updateSalesOrder(init!.id, {
            remark: formData.remark?.trim() || undefined,
            deliveryType: formData.deliveryType,
          })
        : (() => {
            const validItems = formData.items.filter(
              (l) =>
                l.productId > 0 &&
                l.quantity > 0 &&
                !Number.isNaN(l.quantity),
            );
            const body = {
              customerId: formData.customerId,
              deliveryType: formData.deliveryType,
              remark: formData.remark?.trim() || undefined,
              items: validItems.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
              })),
            } satisfies Parameters<typeof createSalesOrder>[0];
            return createSalesOrder(body);
          })(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isEdit) {
      if (formData.customerId <= 0) {
        setError("请选择客户");
        return;
      }
      const validItems = formData.items.filter(
        (l) =>
          l.productId > 0 && l.quantity > 0 && !Number.isNaN(l.quantity),
      );
      if (validItems.length === 0) {
        setError("请至少添加一行商品，并选择商品、填写数量（单价可为 0）");
        return;
      }
      if (
        validItems.some((l) => l.unitPrice < 0 || Number.isNaN(l.unitPrice))
      ) {
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
      items: prev.items.map((row, i) =>
        i === index ? { ...row, ...patch } : row,
      ),
    }));
  };

  const customers = customersQ.data?.items ?? [];
  const products = productsQ.data ?? [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isEdit && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">客户 *</label>
            {customersQ.isLoading ? (
              <p className="text-sm text-text-tertiary">加载客户…</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-md px-3 py-2">
                暂无客户，请先在「客户管理 → 客户列表」中新建客户后再建销售单。
              </p>
            ) : (
              <select
                className={selectCls}
                value={formData.customerId > 0 ? String(formData.customerId) : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerId: Number(e.target.value),
                  }))
                }
                required
              >
                <option value="">请选择客户</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (#{c.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">交付方式</label>
            <select
              className={selectCls}
              value={formData.deliveryType}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryType: e.target.value as DeliveryChoice,
                }))
              }
            >
              <option value="self">客户自提</option>
              <option value="delivery">配送</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-text-secondary">
                销售明细 *
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
                    <Input
                      label="数量 *"
                      type="number"
                      min={0.01}
                      step="any"
                      className="w-full sm:w-28"
                      value={row.quantity}
                      onChange={(e) =>
                        updateItemRow(idx, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <Input
                      label="单价"
                      type="number"
                      min={0}
                      step="any"
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

      {isEdit ? (
        <div className="flex flex-col gap-4">
          {init?.items?.length ? (
            <div className="rounded-lg border border-border-primary p-3 space-y-2">
              <p className="text-sm font-medium text-text-secondary">销售明细（只读）</p>
              <p className="text-xs text-text-tertiary">
                草稿仅支持修改备注与交付方式；若要调整商品，请删除本单后重新创建。
              </p>
              <ul className="text-sm text-text-secondary space-y-1">
                {init.items.map((it) => (
                  <li key={it.id}>
                    {it.productName ? `${it.productName} ` : ""}#
                    {it.productId} × {it.quantity} @ ¥{it.unitPrice} = ¥{it.amount}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">交付方式</label>
            <select
              className={selectCls}
              value={formData.deliveryType}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryType: e.target.value as DeliveryChoice,
                }))
              }
            >
              <option value="self">客户自提</option>
              <option value="delivery">配送</option>
            </select>
          </div>
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
          placeholder="销售备注..."
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

export function SalesOrdersPanel() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [editing, setEditing] = useState<SalesOrderResponseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<SalesOrderResponseDto | null>(null);
  const [receiveAmount, setReceiveAmount] = useState("");
  const [receiveMethod, setReceiveMethod] = useState<"cash" | "bank" | "alipay" | "wechat">("bank");
  const pageSize = 10;

  const qc = useQueryClient();

  const queryKey = useMemo(
    () => ["inventory", "sales-orders", page, pageSize, status],
    [page, status],
  );

  const q = useQuery({
    queryKey,
    queryFn: () => fetchSalesOrders({ page, pageSize, status }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSalesOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] }),
  });

  const submitMutation = useMutation({
    mutationFn: submitSalesOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "approve" | "reject" }) =>
      approveSalesOrder(id, action),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSalesOrder,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] }),
  });

  const receiveMutation = useMutation({
    mutationFn: ({
      orderId,
      customerId,
      amount,
      paymentMethod,
      orderNo,
    }: {
      orderId: number;
      customerId: number;
      amount: string;
      paymentMethod: string;
      orderNo: string;
    }) =>
      createPaymentRecord({
        customerId,
        orderId,
        amount,
        paymentMethod: paymentMethod as "cash" | "bank" | "alipay" | "wechat",
        paymentDate: new Date().toISOString().split("T")[0],
        remark: `销售订单 ${orderNo} 回款`,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "sales-orders"] });
      qc.invalidateQueries({ queryKey: ["inventory", "payment-records"] });
      setReceivingOrder(null);
      setReceiveAmount("");
    },
  });

  const totalPages = Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize));

  if (creating) {
    return (
      <Card>
        <h2 className="font-medium text-text-primary mb-4">新建销售订单</h2>
        <SalesOrderForm onDone={() => setCreating(false)} />
      </Card>
    );
  }

  if (editing) {
    return (
      <Card>
        <h2 className="font-medium text-text-primary mb-4">
          编辑销售订单 · {editing.orderNo}
        </h2>
        <SalesOrderForm init={editing} onDone={() => setEditing(null)} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">销售订单</h1>
        <div className="flex items-center gap-2">
          <ExportMenu type="sales_orders" filename="sales-orders" />
          <Button onClick={() => setCreating(true)}>+ 新建销售订单</Button>
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
                暂无销售订单数据
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
                          客户: {row.customerName ?? `ID:${row.customerId}`}
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
                            setReceivingOrder(row);
                            setReceiveAmount(String(row.totalAmount));
                          }}
                        >
                          回款
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
        open={!!receivingOrder}
        onOpenChange={(open) => {
          if (!open) {
            setReceivingOrder(null);
            setReceiveAmount("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              客户回款 · {receivingOrder?.orderNo}
            </DialogTitle>
          </DialogHeader>
          {receivingOrder && (
            <div className="flex flex-col gap-3">
              <div className="text-sm text-text-secondary">
                <p>
                  客户：{receivingOrder.customerName}
                </p>
                <p>
                  订单金额：¥{receivingOrder.totalAmount}
                </p>
              </div>

              <Input
                label="回款金额 *"
                type="number"
                step="0.01"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">
                  回款方式
                </label>
                <select
                  className={selectCls}
                  value={receiveMethod}
                  onChange={(e) =>
                    setReceiveMethod(e.target.value as typeof receiveMethod)
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
                    setReceivingOrder(null);
                    setReceiveAmount("");
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={() => {
                    if (!receiveAmount || parseFloat(receiveAmount) <= 0) return;
                    receiveMutation.mutate({
                      orderId: receivingOrder.id,
                      customerId: receivingOrder.customerId,
                      amount: receiveAmount,
                      paymentMethod: receiveMethod,
                      orderNo: receivingOrder.orderNo,
                    });
                  }}
                  disabled={
                    receiveMutation.isPending ||
                    !receiveAmount ||
                    parseFloat(receiveAmount) <= 0
                  }
                >
                  {receiveMutation.isPending ? "回款中..." : "确认回款"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
