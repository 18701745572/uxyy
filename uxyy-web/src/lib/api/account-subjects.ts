import type {
  CreateAccountSubjectDto,
  UpdateAccountSubjectDto,
  AccountSubjectDto,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export type { CreateAccountSubjectDto, UpdateAccountSubjectDto, AccountSubjectDto };

export async function fetchAccountSubjects(): Promise<AccountSubjectDto[]> {
  return apiFetch<AccountSubjectDto[]>("/finance/account-subjects");
}

export async function createAccountSubject(
  data: CreateAccountSubjectDto,
): Promise<AccountSubjectDto> {
  return apiFetch<AccountSubjectDto>("/finance/account-subjects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAccountSubject(
  id: number,
  data: UpdateAccountSubjectDto,
): Promise<AccountSubjectDto> {
  return apiFetch<AccountSubjectDto>(`/finance/account-subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteAccountSubject(id: number): Promise<void> {
  return apiFetch<void>(`/finance/account-subjects/${id}`, {
    method: "DELETE",
  });
}
