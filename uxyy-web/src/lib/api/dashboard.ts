import { apiFetch } from "./client";

export interface DashboardOverview {
  todaySales: string;
  pendingOrders: number;
  stockAlerts: number;
}

export interface StockAlertItem {
  id: number;
  name: string;
  stock: number;
  minStock: number;
}

export interface DashboardTodos {
  pendingApprovals: number;
  followUpCustomers: number;
  stockAlertList: StockAlertItem[];
}

/**
 * 获取经营概览数据
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  return apiFetch<DashboardOverview>("/dashboard/overview");
}

/**
 * 获取待办事项
 */
export async function getDashboardTodos(): Promise<DashboardTodos> {
  return apiFetch<DashboardTodos>("/dashboard/todos");
}
