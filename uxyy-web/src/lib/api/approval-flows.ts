import { apiFetch } from "./client";

export type ApprovalFlowType = "purchase" | "sales" | "reimbursement" | "leave";

export interface ApprovalStepPayload {
  step: number;
  role: string;
  userId?: number;
  condition?: {
    amount?: { gte?: number; lte?: number };
    days?: { gte?: number; lte?: number };
  };
}

export interface ApprovalFlow {
  id: number;
  enterpriseId: number;
  name: string;
  type: ApprovalFlowType;
  steps: ApprovalStepPayload[];
  status: "active" | "inactive";
  createdAt: string;
}

export async function fetchApprovalFlows(): Promise<ApprovalFlow[]> {
  return apiFetch<ApprovalFlow[]>("/oa/approval-flows");
}

export async function createApprovalFlow(body: {
  name: string;
  type: ApprovalFlowType;
  steps: ApprovalStepPayload[];
}): Promise<ApprovalFlow> {
  return apiFetch<ApprovalFlow>("/oa/approval-flows", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateApprovalFlow(
  id: number,
  body: {
    name?: string;
    steps?: ApprovalStepPayload[];
    status?: "active" | "inactive";
  },
): Promise<ApprovalFlow> {
  return apiFetch<ApprovalFlow>(`/oa/approval-flows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteApprovalFlow(id: number): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/oa/approval-flows/${id}`, {
    method: "DELETE",
  });
}
