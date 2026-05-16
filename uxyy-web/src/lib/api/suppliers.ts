import type {
  CreateSupplierDto,
  SupplierListQueryDto,
  SupplierListResponseDto,
  SupplierResponseDto,
  UpdateSupplierDto,
} from "@uxyy/shared";
import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type SupplierImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入供应商（与导出表头对齐；mode=skip 跳过同企名称重复） */
export async function importSuppliers(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<SupplierImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/inventory/suppliers/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<SupplierImportResult>;
}

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

/** 分页拉取全部供应商（单页最大 100，与后端 PaginationQueryDto 一致） */
export async function fetchAllSuppliers(): Promise<SupplierResponseDto[]> {
  const pageSize = 100;
  const out: SupplierResponseDto[] = [];
  let page = 1;
  const maxPages = 100;
  for (; page <= maxPages; page += 1) {
    const res = await fetchSuppliers({ page, pageSize });
    out.push(...res.items);
    if (out.length >= res.total || res.items.length < pageSize) break;
  }
  return out;
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
