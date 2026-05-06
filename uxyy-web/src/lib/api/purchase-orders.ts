import type {
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  PurchaseOrderListResponseDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchPurchaseOrders(
  query: PurchaseOrderQueryDto,
): Promise<PurchaseOrderListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.supplierId) params.set("supplierId", String(query.supplierId));
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);

  const qs = params.toString();
  return apiFetch<PurchaseOrderListResponseDto>(
    `/inventory/purchase-orders${qs ? `?${qs}` : ""}`,
  );
}

export async function createPurchaseOrder(
  data: CreatePurchaseOrderDto,
): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>("/inventory/purchase-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePurchaseOrder(
  id: number,
  data: UpdatePurchaseOrderDto,
): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePurchaseOrder(id: number): Promise<void> {
  return apiFetch<void>(`/inventory/purchase-orders/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}`);
}

export async function submitPurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/submit`, {
    method: "POST",
  });
}

export async function approvePurchaseOrder(
  id: number,
  action: 'approve' | 'reject',
  comment?: string,
): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ action, comment }),
  });
}

export async function inboundPurchaseOrder(
  id: number,
  items: { itemId: number; inboundQty: number }[],
): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/inbound`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function cancelPurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/cancel`, {
    method: "POST",
  });
}
