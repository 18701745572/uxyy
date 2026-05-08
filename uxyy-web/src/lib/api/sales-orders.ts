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
  /** 后端 `SalesOrderListResponseDto` 使用 `items` 表示订单列表；shared 与各页面约定为 `list`。 */
  const raw = await apiFetch<{
    list?: SalesOrderResponseDto[];
    items?: SalesOrderResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/inventory/sales-orders${qs ? `?${qs}` : ""}`);

  return {
    list: raw.list ?? raw.items ?? [],
    total: raw.total,
    page: raw.page,
    pageSize: raw.pageSize,
  };
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
    method: "PUT",
    body: JSON.stringify({ action, comment }),
  });
}

/** 出库；与后端 `PUT .../outbound`、`OutboundDto` 一致（`outboundQty`） */
export async function outboundSalesOrder(
  id: number,
  items: { itemId: number; outboundQty: number }[],
): Promise<{ ok: boolean; orderId: number; status: string }> {
  return apiFetch<{ ok: boolean; orderId: number; status: string }>(
    `/inventory/sales-orders/${id}/outbound`,
    {
      method: "PUT",
      body: JSON.stringify({ items }),
    },
  );
}

export async function cancelSalesOrder(id: number): Promise<SalesOrderResponseDto> {
  return apiFetch<SalesOrderResponseDto>(`/inventory/sales-orders/${id}/cancel`, {
    method: "POST",
  });
}
