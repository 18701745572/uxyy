import { apiFetch } from "./client";

export interface EnterpriseDto {
  id: number;
  name: string;
  industry: string | null;
  role: string;
  isDefault: boolean;
}

export async function fetchEnterprises(): Promise<EnterpriseDto[]> {
  return apiFetch<EnterpriseDto[]>("/auth/enterprises");
}
