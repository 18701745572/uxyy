"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPaymentRecordPage,
  createPaymentRecord,
  deletePaymentRecord,
  getPaymentMethodLabel,
  type CreatePaymentRecordDto,
} from "@/lib/api/payment-records";
import { fetchCustomers } from "@/lib/api/customers";
import { fetchSalesOrders } from "@/lib/api/sales-orders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, NumberInput } from "@/components/ui/input";
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

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "现金" },
  { value: "bank", label: "银行转账" },
  { value: "alipay", label: "支付宝" },
  { value: "wechat", label: "微信支付" },
];

interface PaymentFormData {
  customerId: number | undefined;
  orderId: number | undefined;
  amount: string;
  paymentMethod: "cash" | "bank" | "alipay" | "wechat";
  paymentDate: string;
  referenceNo: string;
  remark: string;
}

function PaymentForm({ onDone }: { onDone: () => void }) {
  const [formData, setFormData] = useState<PaymentFormData>({
    customerId: undefined,
    orderId: undefined,
    amount: "",
    paymentMethod: "bank",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    remark: "",
  });
  const [error, setError] = useState("");

  const qc = useQueryClient();

  const { data: customersData } = useQuery({
    queryKey: ["crm", "customers"],
    queryFn: () => fetchCustomers({ page: 1, pageSize: 100 }),
  });

  const { data: ordersData } = useQuery({
    queryKey: ["inventory", "sales-orders", "for-payment"],
    queryFn: () =>
      fetchSalesOrders({
        page: 1,
        pageSize: 100,
        status: "approved",
      }),
    enabled: !!formData.customerId,
  });

  const filteredOrders = ordersData?.list.filter(
    (o) => !formData.customerId || o.customerId === formData.customerId,
  );

  const mutation = useMutation({
    mutationFn: (dto: CreatePaymentRecordDto) => createPaymentRecord(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "payment-records"] });
      onDone();
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "操作失败"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      setError("请选择客户");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("请填写正确的回款金额");
      return;
    }
    mutation.mutate({
      customerId: formData.customerId,
      orderId: formData.orderId,
      amount: formData.amount,
      paymentMethod: formData.paymentMethod,
      paymentDate: formData.paymentDate,
      referenceNo: formData.referenceNo || undefined,
      remark: formData.remark || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">客户 *</label>
        <select
          className={selectCls}
          value={formData.customerId ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              customerId: e.target.value ? Number(e.target.value) : undefined,
              orderId: undefined,
            }))
          }
        >
          <option value="">请选择客户</option>
          {customersData?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">
          关联销售订单（可选）
        </label>
        <select
          className={selectCls}
          value={formData.orderId ?? ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              orderId: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
        >
          <option value="">无关联订单</option>
          {filteredOrders?.map((o) => (
            <option key={o.id} value={o.id}>
              {o.orderNo} - {o.customerName} - ¥{o.totalAmount}
            </option>
          ))}
        </select>
      </div>

      <NumberInput
        label="回款金额 *"
        step={0.01}
        min={0}
        value={formData.amount}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, amount: e.target.value }))
        }
        placeholder="0.00"
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">回款方式 *</label>
        <select
          className={selectCls}
          value={formData.paymentMethod}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              paymentMethod: e.target.value as PaymentFormData["paymentMethod"],
            }))
          }
        >
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="回款日期"
        type="date"
        value={formData.paymentDate}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
        }
      />

      <Input
        label="银行流水号"
        value={formData.referenceNo}
        onChange={(e) =>
          setFormData((prev) => ({ ...prev, referenceNo: e.target.value }))
        }
        placeholder="可选"
      />

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
        {mutation.isPending ? "提交中..." : "确认回款"}
      </Button>
    </form>
  );
}

export default function CustomerReceiptsPanel() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["inventory", "payment-records", page],
    queryFn: () => getPaymentRecordPage({ page, pageSize: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePaymentRecord,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", "payment-records"] });
      setDeleteId(null);
    },
  });

  const payments = data?.data ?? [];
  const totalAmount = data?.totalAmount ?? "0";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客户回款</h1>
          <p className="text-sm text-text-tertiary">
            回款总额：¥{formatAmount(totalAmount)}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ 登记回款</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : isError ? (
        <Card className="p-8 text-center text-text-tertiary">加载失败</Card>
      ) : payments.length === 0 ? (
        <Card className="p-8 text-center text-text-tertiary">
          暂无回款记录
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-left">
                  <th className="pb-3 font-medium text-text-tertiary">回款日期</th>
                  <th className="pb-3 font-medium text-text-tertiary">客户</th>
                  <th className="pb-3 font-medium text-text-tertiary">关联订单</th>
                  <th className="pb-3 font-medium text-text-tertiary">金额</th>
                  <th className="pb-3 font-medium text-text-tertiary">方式</th>
                  <th className="pb-3 font-medium text-text-tertiary">流水号</th>
                  <th className="pb-3 font-medium text-text-tertiary">备注</th>
                  <th className="pb-3 font-medium text-text-tertiary">操作</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border-secondary">
                    <td className="py-3">{formatDate(p.paymentDate)}</td>
                    <td className="py-3">{p.customerName}</td>
                    <td className="py-3">
                      {p.orderNo ? (
                        <Badge variant="default">{p.orderNo}</Badge>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                    <td className="py-3 font-medium text-green-600">
                      ¥{formatAmount(p.amount)}
                    </td>
                    <td className="py-3">
                      <Badge variant="secondary">
                        {getPaymentMethodLabel(p.paymentMethod)}
                      </Badge>
                    </td>
                    <td className="py-3 text-text-tertiary">
                      {p.referenceNo || "-"}
                    </td>
                    <td className="py-3 text-text-tertiary">
                      {p.remark || "-"}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeleteId(p.id)}
                      >
                        删除
                      </Button>
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
            <DialogTitle>登记客户回款</DialogTitle>
          </DialogHeader>
          <PaymentForm onDone={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            确定要删除这条回款记录吗？此操作不可撤销。
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