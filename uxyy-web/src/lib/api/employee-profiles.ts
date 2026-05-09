import { apiFetch } from "./client";

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
