import { apiFetch } from "./client";

/** 与 `approval-flow.service#getPendingApprovals` 嵌套形状一致（日期序列化为 ISO 字符串） */
export type ApprovalRecordSnapshot = {
  id: number;
  flowId: number;
  businessType: string;
  businessId: number | null;
  title: string;
  remark: string | null;
  status: string;
  currentStep: number;
  submittedBy: number;
  approvedBy: number | null;
  comment: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type PendingApprovalFlowRow = {
  id: number;
  enterpriseId: number;
  name: string;
  type: string;
  status: string;
};

export type PendingApprovalBundle = {
  record: ApprovalRecordSnapshot;
  flow: PendingApprovalFlowRow;
};

/** 当前企业待处理的审批实例（需 `oa:approve`，通常为 boss / 行政） */
export async function fetchPendingApprovals(): Promise<PendingApprovalBundle[]> {
  return apiFetch<PendingApprovalBundle[]>("/oa/approval-flows/pending/list");
}

/** 审批动作：同意后若流程为多级可能仍为 pending（由服务端返回判定） */
export async function submitApprovalRecordAction(
  recordId: number,
  body: {
    action: "approve" | "reject";
    comment?: string;
  },
): Promise<unknown> {
  return apiFetch(`/oa/approval-flows/records/${recordId}/action`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
