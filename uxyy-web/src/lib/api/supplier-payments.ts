import { apiFetch } from "./client";

export interface SupplierPayment {
  id: number;
  enterpriseId: number;
  supplierId: number;
  supplierName: string;
  orderId: number | null;
  orderNo: string | null;
  amount: string;
  paymentMethod: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate: string;
  referenceNo: string | null;
  remark: string | null;
  createdBy: number | null;
  createdAt: string;
}

export interface SupplierPaymentListResponse {
  data: SupplierPayment[];
  total: number;
  totalAmount: string;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateSupplierPaymentDto {
  supplierId: number;
  orderId?: number;
  amount: string | number;
  paymentMethod: 'cash' | 'bank' | 'alipay' | 'wechat';
  paymentDate?: string;
  referenceNo?: string;
  remark?: string;
}

export interface SupplierPaymentStats {
  supplierId: number;
  totalPayments: string;
  paymentCount: number;
}

export interface OrderPaymentStats {
  orderId: number;
  orderAmount: string;
  totalPayments: string;
  remainingAmount: string;
  paymentCount: number;
  isFullyPaid: boolean;
}

export async function getSupplierPaymentPage(params: {
  page?: number;
  pageSize?: number;
  supplierId?: number;
  orderId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<SupplierPaymentListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.supplierId) searchParams.set('supplierId', String(params.supplierId));
  if (params.orderId) searchParams.set('orderId', String(params.orderId));
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);

  return apiFetch<SupplierPaymentListResponse>(`/inventory/supplier-payments?${searchParams}`);
}

export async function getSupplierPayment(id: number): Promise<SupplierPayment> {
  const data = await apiFetch<{ data?: SupplierPayment } & SupplierPayment>(`/inventory/supplier-payments/${id}`);
  return data.data ?? data;
}

export async function createSupplierPayment(dto: CreateSupplierPaymentDto): Promise<SupplierPayment> {
  const data = await apiFetch<{ data?: SupplierPayment } & SupplierPayment>('/inventory/supplier-payments', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data.data ?? data;
}

export async function updateSupplierPayment(
  id: number,
  dto: Partial<CreateSupplierPaymentDto>,
): Promise<SupplierPayment> {
  const data = await apiFetch<{ data?: SupplierPayment } & SupplierPayment>(`/inventory/supplier-payments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return data.data ?? data;
}

export async function deleteSupplierPayment(id: number): Promise<void> {
  await apiFetch<void>(`/inventory/supplier-payments/${id}`, {
    method: 'DELETE',
  });
}

export async function getSupplierPaymentStats(supplierId: number): Promise<SupplierPaymentStats> {
  const data = await apiFetch<{ data?: SupplierPaymentStats } & SupplierPaymentStats>(`/inventory/supplier-payments/supplier/${supplierId}/stats`);
  return data.data ?? data;
}

export async function getOrderPaymentStats(orderId: number): Promise<OrderPaymentStats> {
  const data = await apiFetch<{ data?: OrderPaymentStats } & OrderPaymentStats>(`/inventory/supplier-payments/order/${orderId}/stats`);
  return data.data ?? data;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '现金',
  bank: '银行转账',
  alipay: '支付宝',
  wechat: '微信支付',
};

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}