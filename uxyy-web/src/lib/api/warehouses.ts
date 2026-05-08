import { apiFetch } from "./client";

/** 与 `GET /inventory/warehouses` 列表项一致（含汇总字段） */
export type WarehouseListRow = {
  id: number;
  name: string;
  code?: string | null;
  isDefault?: boolean | null;
  status?: string | null;
  managerName?: string | null;
  productCount?: number;
  totalQuantity?: string;
};

/** 与后端 `POST /inventory/warehouses` 请求体一致（managerId 暂不开放） */
export type CreateWarehousePayload = {
  name: string;
  code?: string;
  address?: string;
  phone?: string;
  remark?: string;
  isDefault?: boolean;
};

export async function fetchWarehouses(): Promise<WarehouseListRow[]> {
  return apiFetch<WarehouseListRow[]>("/inventory/warehouses");
}

export async function createWarehouse(
  body: CreateWarehousePayload,
): Promise<{ id: number; name: string }> {
  return apiFetch<{ id: number; name: string }>("/inventory/warehouses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
