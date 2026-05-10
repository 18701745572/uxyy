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

  const res = await fetch(`/api/inventory/sales-outbound?${searchParams}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('获取出库单失败');
  return res.json();
}

export async function getSalesOutbound(id: number): Promise<SalesOutboundOrder> {
  const res = await fetch(`/api/inventory/sales-outbound/${id}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('获取出库单详情失败');
  const data = await res.json();
  return data.data ?? data;
}

export async function createSalesOutbound(dto: CreateOutboundDto): Promise<SalesOutboundOrder> {
  const res = await fetch('/api/inventory/sales-outbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '创建失败' }));
    throw new Error(err.message || '创建出库单失败');
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function confirmSalesOutbound(id: number): Promise<SalesOutboundOrder> {
  const res = await fetch(`/api/inventory/sales-outbound/${id}/confirm`, {
    method: 'PUT',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '确认失败' }));
    throw new Error(err.message || '确认出库单失败');
  }
  const data = await res.json();
  return data.data ?? data;
}

export async function deleteSalesOutbound(id: number): Promise<void> {
  const res = await fetch(`/api/inventory/sales-outbound/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('删除出库单失败');
}