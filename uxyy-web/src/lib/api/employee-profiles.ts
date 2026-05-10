import { apiFetch } from "./client";
import { readJwtAccessClaims } from "./jwt-payload";
import { readStoredAccessToken } from "./token-store";

export type EmployeeProfileRow = {
  profile: {
    id: number;
    userId: number;
    enterpriseId: number;
    department?: string | null;
    position?: string | null;
    employeeNo?: string | null;
    phone?: string | null;
    email?: string | null;
    joinDate?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  user: {
    id: number;
    phone: string | null;
    nickname: string | null;
    avatar: string | null;
  };
};

export type EnterpriseMemberCandidate = {
  userId: number;
  phone: string | null;
  nickname: string | null;
  enterpriseRole: string;
  hasProfile: boolean;
};

export type CreateEmployeeProfilePayload = {
  userId: number;
  department?: string;
  position?: string;
  employeeNo?: string;
  phone?: string;
  email?: string;
  /** YYYY-MM-DD */
  joinDate?: string;
};

export type UpdateEmployeeProfilePayload = {
  department?: string;
  position?: string;
  employeeNo?: string;
  phone?: string;
  email?: string;
  joinDate?: string;
};

export async function fetchEnterpriseMembers(): Promise<
  EnterpriseMemberCandidate[]
> {
  return apiFetch<EnterpriseMemberCandidate[]>(
    "/oa/employee-profiles/members",
  );
}

export async function createEmployeeProfile(
  body: CreateEmployeeProfilePayload,
): Promise<EmployeeProfileRow["profile"]> {
  return apiFetch(`/oa/employee-profiles`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateEmployeeProfile(
  id: number,
  body: UpdateEmployeeProfilePayload,
): Promise<EmployeeProfileRow["profile"]> {
  return apiFetch(`/oa/employee-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteEmployeeProfile(
  id: number,
): Promise<{ success: boolean }> {
  return apiFetch(`/oa/employee-profiles/${id}`, { method: "DELETE" });
}

/** 老板 / owner、行政 oa / admin 持有 `oa:manage`，可建档与维护通讯录 */
export function canManageEmployeeProfiles(): boolean {
  const token = readStoredAccessToken();
  if (!token) return false;
  const raw = readJwtAccessClaims(token)?.role?.trim().toLowerCase();
  if (!raw) return false;
  return (
    raw === "boss" ||
    raw === "owner" ||
    raw === "oa" ||
    raw === "admin"
  );
}

export async function fetchEmployeeProfiles(query?: {
  department?: string;
  keyword?: string;
}): Promise<EmployeeProfileRow[]> {
  const sp = new URLSearchParams();
  if (query?.department) sp.set("department", query.department);
  if (query?.keyword) sp.set("keyword", query.keyword);
  const qs = sp.toString();
  return apiFetch<EmployeeProfileRow[]>(
    `/oa/employee-profiles${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchEmployeeDepartments(): Promise<string[]> {
  return apiFetch<string[]>("/oa/employee-profiles/departments");
}
