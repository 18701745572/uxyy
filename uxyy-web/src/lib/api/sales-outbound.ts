import { apiFetch } from "./client";

export interface SalesOutboundOrder {
  id: number;
  enterpriseId: number;
  orderId: number;
  orderNo: string;
  customerId: number;
  customerName: string;
  warehouseId: number;
  status: 'draft' | 'confirmed';
  remark: string | null;
  createdBy: number;
  confirmedBy: number | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: SalesOutboundItem[];
}

export interface SalesOutboundItem {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  productCode: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  batchNo: string | null;
}

export interface CreateOutboundDto {
  orderId: number;
  customerId: number;
  customerName: string;
  warehouseId?: number;
  remark?: string;
  items: {
    productId: number;
    productName: string;
    productCode: string;
    unit: string;
    quantity: string;
    unitPrice: string;
    amount: string;
    batchNo?: string;
  }[];
}

export interface SalesOutboundListResponse {
  data: SalesOutboundOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getSalesOutboundPage(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  orderId?: number;
}): Promise<SalesOutboundListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.status) searchParams.set('status', params.status);
  if (params.orderId) searchParams.set('orderId', String(params.orderId));

  return apiFetch<SalesOutboundListResponse>(`/inventory/sales-outbound?${searchParams}`);
}

export async function getSalesOutbound(id: number): Promise<SalesOutboundOrder> {
  const data = await apiFetch<{ data?: SalesOutboundOrder } & SalesOutboundOrder>(`/inventory/sales-outbound/${id}`);
  return data.data ?? data;
}

export async function createSalesOutbound(dto: CreateOutboundDto): Promise<SalesOutboundOrder> {
  const data = await apiFetch<{ data?: SalesOutboundOrder } & SalesOutboundOrder>('/inventory/sales-outbound', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return data.data ?? data;
}

export async function confirmSalesOutbound(id: number): Promise<SalesOutboundOrder> {
  const data = await apiFetch<{ data?: SalesOutboundOrder } & SalesOutboundOrder>(`/inventory/sales-outbound/${id}/confirm`, {
    method: 'PUT',
  });
  return data.data ?? data;
}

export async function deleteSalesOutbound(id: number): Promise<void> {
  await apiFetch<void>(`/inventory/sales-outbound/${id}`, {
    method: 'DELETE',
  });
}