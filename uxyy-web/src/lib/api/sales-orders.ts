import type {
  CreateSalesOrderDto,
  SalesOrderQueryDto,
  SalesOrderListResponseDto,
  SalesOrderResponseDto,
  UpdateSalesOrderDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchSalesOrders(
  query: SalesOrderQueryDto,
): Promise<SalesOrderListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.status) params.set("status", query.status);
  if (query.customerId) params.set("customerId", String(query.customerId));
  if (query.startDate) params.set("startDate", query.startDate);
  if (query.endDate) params.set("endDate", query.endDate);

  const qs = params.toString();
  return apiFetch<SalesOrderListResponseDto>(
    `/inventory/sales-orders${qs ? `?${qs}` : ""}`,
  );
}

export async function createSalesOrder(
  data: CreateSalesOrderDto,
): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>("/inventory/sales-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSalesOrder(
  id: number,
  data: UpdateSalesOrderDto,
): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSalesOrder(id: number): Promise<void> {
  return apiFetch<void>(`/inventory/sales-orders/${id}`, {
    method: "DELETE",
  });
}

export async function fetchSalesOrder(id: number): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}`);
}

export async function submitSalesOrder(id: number): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}/submit`, {
    method: "POST",
  });
}

export async function approveSalesOrder(
  id: number,
  action: 'approve' | 'reject',
  comment?: string,
): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ action, comment }),
  });
}

export async function deliverSalesOrder(
  id: number,
  items: { itemId: number; deliverQty: number }[],
): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}/deliver`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function cancelSalesOrder(id: number): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}/cancel`, {
    method: "POST",
  });
}
