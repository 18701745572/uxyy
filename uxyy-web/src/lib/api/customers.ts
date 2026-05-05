import type {
  CustomerListResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerDto,
  CustomerListQuery,
} from "@uxyy/shared";
import { apiFetch } from "./client";

export async function fetchCustomers(
  params: CustomerListQuery,
): Promise<CustomerListResponse> {
  const sp = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  return apiFetch<CustomerListResponse>(`/crm/customers?${sp}`);
}

export async function createCustomer(
  input: CreateCustomerInput,
): Promise<CustomerDto> {
  return apiFetch<CustomerDto>("/crm/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<CustomerDto> {
  return apiFetch<CustomerDto>(`/crm/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiFetch(`/crm/customers/${id}`, { method: "DELETE" });
}
