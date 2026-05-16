import type {
  CreatePurchaseOrderDto,
  PurchaseOrderQueryDto,
  PurchaseOrderListResponseDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from "@uxyy/shared";
import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type PurchaseOrderImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入采购订单（与导出表头对齐；mode=skip 跳过同订单号重复） */
export async function importPurchaseOrders(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<PurchaseOrderImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/inventory/purchase-orders/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<PurchaseOrderImportResult>;
}

/** 后端列表字段为 `items`，此处统一为 shared 约定的 `list` */
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
  const raw = await apiFetch<{
    list?: PurchaseOrderResponseDto[];
    items?: PurchaseOrderResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }>(`/inventory/purchase-orders${qs ? `?${qs}` : ""}`);

  return {
    list: raw.list ?? raw.items ?? [],
    total: raw.total,
    page: raw.page,
    pageSize: raw.pageSize,
  };
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
    method: "PUT",
    body: JSON.stringify({ action, comment }),
  });
}

export async function inboundPurchaseOrder(
  id: number,
  items: { itemId: number; inboundQty: number }[],
): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/inbound`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export async function cancelPurchaseOrder(id: number): Promise<PurchaseOrderResponseDto> {
  return apiFetch<PurchaseOrderResponseDto>(`/inventory/purchase-orders/${id}/cancel`, {
    method: "POST",
  });
}
