import { apiFetch } from "./client";

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

  return apiFetch<PaymentRecordListResponse>(`/inventory/payment-records?${searchParams}`);
}

export async function getPaymentRecord(id: number): Promise<PaymentRecord> {
  const data = await apiFetch<{ data?: PaymentRecord } & PaymentRecord>(`/inventory/payment-records/${id}`);
  return data.data ?? data;
}

export async function createPaymentRecord(dto: CreatePaymentRecordDto): Promise<PaymentRecord> {
  const data = await apiFetch<{ data?: PaymentRecord } & PaymentRecord>("/inventory/payment-records", {
    method: "POST",
    body: JSON.stringify(dto),
  });
  return data.data ?? data;
}

export async function updatePaymentRecord(
  id: number,
  dto: Partial<CreatePaymentRecordDto>,
): Promise<PaymentRecord> {
  const data = await apiFetch<{ data?: PaymentRecord } & PaymentRecord>(`/inventory/payment-records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
  return data.data ?? data;
}

export async function deletePaymentRecord(id: number): Promise<void> {
  await apiFetch<void>(`/inventory/payment-records/${id}`, {
    method: "DELETE",
  });
}