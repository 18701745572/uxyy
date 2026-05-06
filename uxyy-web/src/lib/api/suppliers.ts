import type {
  CreateSupplierDto,
  SupplierListQueryDto,
  SupplierListResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchSuppliers(
  query: SupplierListQueryDto,
): Promise<SupplierListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));

  const qs = params.toString();
  return apiFetch<SupplierListResponseDto>(
    `/inventory/suppliers${qs ? `?${qs}` : ""}`,
  );
}

export async function createSupplier(
  data: CreateSupplierDto,
): Promise<SupplierResponseDto> {
  return apiFetch<SupplierResponseDto>("/inventory/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSupplier(
  id: number,
  data: UpdateSupplierDto,
): Promise<SupplierResponseDto> {
  return apiFetch<SupplierResponseDto>(`/inventory/suppliers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSupplier(id: number): Promise<void> {
  return apiFetch<void>(`/inventory/suppliers/${id}`, {
    method: "DELETE",
  });
}

export async function fetchSupplier(id: number): Promise<SupplierResponseDto> {
  return apiFetch<SupplierResponseDto>(`/inventory/suppliers/${id}`);
}
