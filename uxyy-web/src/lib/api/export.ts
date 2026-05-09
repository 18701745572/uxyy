export type ExportFormat = "excel" | "csv";

export interface ExportOptions {
  format: ExportFormat;
  type: "customers" | "products" | "sales_orders" | "purchase_orders" | "invoices" | "vouchers";
  filters?: Record<string, string>;
}

export async function exportData(options: ExportOptions): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", options.format);
  params.set("type", options.type);
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      params.set(key, value);
    }
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/common/export?${params.toString()}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("access_token")}`,
    },
  });

  if (!response.ok) {
    throw new Error(`导出失败: ${response.status}`);
  }

  return response.blob();
}

export async function downloadExport(options: ExportOptions, filename?: string) {
  const blob = await exportData(options);
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ext = options.format === "excel" ? "xlsx" : "csv";
  a.download = filename || `${options.type}_export.${ext}`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}