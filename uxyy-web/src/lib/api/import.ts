import { apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type ImportMode = "skip" | "force";

export interface ImportResult {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
}

/**
 * 通用导入函数
 * @param endpoint - API 端点路径（如 "/crm/customers/import"）
 * @param file - 要上传的文件
 * @param mode - 重复处理模式：skip 跳过重复，force 强制写入
 * @returns 导入结果
 */
export async function importData(
  endpoint: string,
  file: File,
  mode: ImportMode = "skip",
): Promise<ImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`${endpoint}?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<ImportResult>;
}

/**
 * 创建特定端点的导入函数
 * @param endpoint - API 端点路径
 * @returns 绑定端点的导入函数
 */
export function createImportFn(endpoint: string) {
  return (file: File, mode: ImportMode = "skip") =>
    importData(endpoint, file, mode);
}
