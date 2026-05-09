import { apiFetch } from "./client";

export type ExpenseRequestRow = {
  id: number;
  enterpriseId: number;
  userId: number;
  type: string;
  amount: string;
  description: string | null;
  attachments: string[] | null;
  status: string;
  approvalRecordId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseRequestPayload = {
  type: string;
  amount: string;
  description?: string;
  attachments?: string[];
};

export async function fetchExpenseRequests(params?: {
  status?: "pending" | "approved" | "rejected" | "cancelled";
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ExpenseRequestRow[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.type) sp.set("type", params.type);
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  const qs = sp.toString();
  return apiFetch<ExpenseRequestRow[]>(
    `/oa/expense-requests${qs ? `?${qs}` : ""}`,
  );
}

export async function createExpenseRequest(
  body: CreateExpenseRequestPayload,
): Promise<ExpenseRequestRow> {
  return apiFetch<ExpenseRequestRow>("/oa/expense-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchExpenseRequest(
  id: number,
): Promise<ExpenseRequestRow> {
  return apiFetch<ExpenseRequestRow>(`/oa/expense-requests/${id}`);
}
