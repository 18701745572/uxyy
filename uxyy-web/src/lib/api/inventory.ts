import { apiFetch } from "./client";

export type StockAlertType = "low" | "high";
export type StockAlertStatus = "pending" | "read" | "resolved";

export interface StockAlertResponseDto {
  id: number;
  enterpriseId: number;
  productId: number;
  productName: string;
  productCode: string;
  type: StockAlertType;
  currentStock: number;
  threshold: number;
  status: StockAlertStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockAlertListResponseDto {
  items: StockAlertResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StockAlertStatsDto {
  pendingCount: number;
  todayCount: number;
  lowCount: number;
  highCount: number;
}

export interface StockAlertListQueryDto {
  page?: number;
  pageSize?: number;
  type?: StockAlertType;
  status?: StockAlertStatus;
  productId?: number;
}

export interface UpdateStockAlertDto {
  status?: StockAlertStatus;
  remark?: string;
}

// 获取库存预警列表
export async function fetchStockAlerts(
  query: StockAlertListQueryDto,
): Promise<StockAlertListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.productId) params.set("productId", String(query.productId));

  const qs = params.toString();
  return apiFetch<StockAlertListResponseDto>(
    `/inventory/stock-alerts${qs ? `?${qs}` : ""}`,
  );
}

// 获取库存预警统计
export async function fetchStockAlertStats(): Promise<StockAlertStatsDto> {
  return apiFetch<StockAlertStatsDto>("/inventory/stock-alerts/stats");
}

// 手动触发库存检查
export async function checkAndCreateStockAlerts(): Promise<{
  checkedCount: number;
  alertCount: number;
}> {
  return apiFetch<{ checkedCount: number; alertCount: number }>(
    "/inventory/stock-alerts/check",
    {
      method: "POST",
    },
  );
}

// 更新库存预警
export async function updateStockAlert(
  id: number,
  data: UpdateStockAlertDto,
): Promise<StockAlertResponseDto> {
  return apiFetch<StockAlertResponseDto>(`/inventory/stock-alerts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}
