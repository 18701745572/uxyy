import { apiFetch } from "./client";

export type LeaveRequestRow = {
  id: number;
  enterpriseId: number;
  userId: number;
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  reason: string | null;
  status: string;
  approvalRecordId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateLeaveRequestPayload = {
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  reason?: string;
};

export async function fetchLeaveRequests(params?: {
  status?: "pending" | "approved" | "rejected" | "cancelled";
  type?: string;
  startDate?: string;
  endDate?: string;
}): Promise<LeaveRequestRow[]> {
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.type) sp.set("type", params.type);
  if (params?.startDate) sp.set("startDate", params.startDate);
  if (params?.endDate) sp.set("endDate", params.endDate);
  const qs = sp.toString();
  return apiFetch<LeaveRequestRow[]>(
    `/oa/leave-requests${qs ? `?${qs}` : ""}`,
  );
}

export async function createLeaveRequest(
  body: CreateLeaveRequestPayload,
): Promise<LeaveRequestRow> {
  return apiFetch<LeaveRequestRow>("/oa/leave-requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchLeaveRequest(id: number): Promise<LeaveRequestRow> {
  return apiFetch<LeaveRequestRow>(`/oa/leave-requests/${id}`);
}
