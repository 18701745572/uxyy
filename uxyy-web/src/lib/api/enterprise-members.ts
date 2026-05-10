import { apiFetch } from "./client";

export type EnterpriseMemberRow = {
  userId: number;
  phone: string | null;
  nickname: string | null;
  role: string;
  isDefault: boolean;
  isOwner: boolean;
};

const PATH = "/enterprise/members";

export async function fetchEnterpriseMemberRows(): Promise<EnterpriseMemberRow[]> {
  return apiFetch<EnterpriseMemberRow[]>(PATH);
}

export async function inviteEnterpriseMember(input: {
  phone: string;
  role: string;
}): Promise<EnterpriseMemberRow> {
  return apiFetch<EnterpriseMemberRow>(PATH, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEnterpriseMemberRole(
  userId: number,
  role: string,
): Promise<{ userId: number; role: string }> {
  return apiFetch(`${PATH}/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeEnterpriseMember(
  userId: number,
): Promise<{ userId: number }> {
  return apiFetch(`${PATH}/${userId}`, {
    method: "DELETE",
  });
}

/** 与后端 ROLE_PERMISSIONS 一致：SYS_MEMBER（system:member）目前赋给 boss、oa */
export function canManageEnterpriseMembers(role?: string): boolean {
  const r = role?.trim().toLowerCase() ?? "";
  return r === "boss" || r === "oa";
}

export const ENTERPRISE_MEMBER_ASSIGNABLE_OPTIONS = [
  { value: "finance", label: "财务 finance" },
  { value: "sales", label: "销售 sales" },
  { value: "warehouse", label: "仓管 warehouse" },
  { value: "oa", label: "行政 oa" },
] as const;

export function labelForEnterpriseRole(role: string): string {
  const map: Record<string, string> = {
    boss: "老板",
    finance: "财务",
    sales: "销售",
    warehouse: "仓管",
    oa: "行政",
  };
  const k = role.trim().toLowerCase();
  return map[k] ?? role;
}
