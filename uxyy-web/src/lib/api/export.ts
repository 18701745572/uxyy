export type ExportFormat = "excel" | "csv";

export interface ExportOptions {
  format: ExportFormat;
  type: "customers" | "opportunities" | "products" | "suppliers" | "sales_orders" | "purchase_orders" | "stocktaking" | "invoices" | "vouchers" | "member_levels" | "customer_categories" | "employee_profiles";
  filters?: Record<string, string>;
}

import { apiFetchBlob } from "./client";

const endpointMap: Record<ExportOptions["type"], string> = {
  customers: "/export/customers",
  opportunities: "/export/opportunities",
  products: "/export/products",
  suppliers: "/export/suppliers",
  sales_orders: "/export/sales-orders",
  purchase_orders: "/export/purchase-orders",
  stocktaking: "/export/stocktaking",
  invoices: "/export/invoices",
  vouchers: "/export/vouchers",
  member_levels: "/export/member_levels",
  customer_categories: "/export/customer_categories",
  employee_profiles: "/export/employee_profiles",
};

export async function exportData(options: ExportOptions): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("format", options.format);
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      params.set(key, value);
    }
  }

  const endpoint = endpointMap[options.type];
  return apiFetchBlob(`${endpoint}?${params.toString()}`, { method: "GET" });
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