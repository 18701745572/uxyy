export interface PaymentRecord {
  id: number;
  enterpriseId: number;
  customerId: number;
  customerName: string;
  orderId: number | null;
  orderNo: string | null;
  amount: string;
  paymentMethod: "cash" | "bank" | "alipay" | "wechat";
  paymentDate: string;
  referenceNo: string | null;
  remark: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface PaymentRecordListResponse {
  data: PaymentRecord[];
  total: number;
  totalAmount: string;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreatePaymentRecordDto {
  customerId: number;
  orderId?: number;
  amount: string | number;
  paymentMethod: "cash" | "bank" | "alipay" | "wechat";
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "现金",
  bank: "银行转账",
  alipay: "支付宝",
  wechat: "微信支付",
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export async function getPaymentRecordPage(params: {
  page?: number;
  pageSize?: number;
  customerId?: number;
  orderId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<PaymentRecordListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.customerId) searchParams.set("customerId", String(params.customerId));
  if (params.orderId) searchParams.set("orderId", String(params.orderId));
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);

  const res = await fetch(`/api/inventory/payment-records?${searchParams}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("获取回款记录失败");
  return res.json();
}

export async function getPaymentRecord(id: number): Promise<PaymentRecord> {
  const res = await fetch(`/api/inventory/payment-records/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("获取回款记录详情失败");
  const data = await res.json();
  return data.data ?? data;
}

export async function createPaymentRecord(dto: CreatePaymentRecordDto): Promise<PaymentRecord> {
  const res = await fetch("/api/inventory/payment-records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "创建失败" }));
    throw new Error(err.message || "创建回款记录失败");
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function updatePaymentRecord(
  id: number,
  dto: Partial<CreatePaymentRecordDto>,
): Promise<PaymentRecord> {
  const res = await fetch(`/api/inventory/payment-records/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "更新失败" }));
    throw new Error(err.message || "更新回款记录失败");
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function deletePaymentRecord(id: number): Promise<void> {
  const res = await fetch(`/api/inventory/payment-records/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("删除回款记录失败");
}