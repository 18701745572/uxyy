import { apiFetch } from "./client";

// 商机相关类型
export type OpportunityStatus =
  | "potential"
  | "intention"
  | "quotation"
  | "deal"
  | "after_sales"
  | "lost";

export interface OpportunityResponseDto {
  id: number;
  enterpriseId: number;
  customerId: number;
  customerName?: string;
  name: string;
  description?: string;
  status: OpportunityStatus;
  estimatedAmount?: number;
  actualAmount?: number;
  expectedCloseAt?: string;
  actualCloseAt?: string;
  assignedTo?: number;
  probability: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityListResponseDto {
  items: OpportunityResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateOpportunityDto {
  customerId: number;
  name: string;
  description?: string;
  status?: OpportunityStatus;
  estimatedAmount?: number;
  actualAmount?: number;
  expectedCloseAt?: string;
  actualCloseAt?: string;
  assignedTo?: number;
  probability?: number;
  remark?: string;
}

export interface UpdateOpportunityDto {
  name?: string;
  description?: string;
  status?: OpportunityStatus;
  estimatedAmount?: number;
  actualAmount?: number;
  expectedCloseAt?: string;
  actualCloseAt?: string;
  assignedTo?: number;
  probability?: number;
  remark?: string;
}

export interface OpportunityListQueryDto {
  page?: number;
  pageSize?: number;
  customerId?: number;
  status?: OpportunityStatus;
  assignedTo?: number;
  search?: string;
}

// 客户分类相关类型
export type CustomerCategoryType = "status" | "industry" | "region" | "custom";

export interface CustomerCategoryResponseDto {
  id: number;
  enterpriseId: number;
  name: string;
  type: CustomerCategoryType;
  description?: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerCategoryDto {
  name: string;
  type?: CustomerCategoryType;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface UpdateCustomerCategoryDto {
  name?: string;
  type?: CustomerCategoryType;
  description?: string;
  color?: string;
  sortOrder?: number;
}

export interface CustomerCategoryListQueryDto {
  type?: CustomerCategoryType;
}

// 跟进记录相关类型
export type FollowUpType = "text" | "image" | "voice" | "file";

export interface FollowUpRecordResponseDto {
  id: number;
  customerId: number;
  enterpriseId: number;
  content: string;
  type: FollowUpType;
  attachmentUrls?: string[];
  nextFollowUpAt?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpListResponseDto {
  items: FollowUpRecordResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateFollowUpDto {
  content: string;
  type?: FollowUpType;
  attachmentUrls?: string[];
  nextFollowUpAt?: string;
}

export interface UpdateFollowUpDto {
  content?: string;
  type?: FollowUpType;
  attachmentUrls?: string[];
  nextFollowUpAt?: string;
}

export interface FollowUpListQueryDto {
  page?: number;
  pageSize?: number;
}

// API 函数

// 商机管理
export async function fetchOpportunities(
  query: OpportunityListQueryDto,
): Promise<OpportunityListResponseDto> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.customerId) params.set("customerId", String(query.customerId));
  if (query.status) params.set("status", query.status);
  if (query.assignedTo) params.set("assignedTo", String(query.assignedTo));
  if (query.search) params.set("search", query.search);

  const qs = params.toString();
  return apiFetch<OpportunityListResponseDto>(
    `/crm/opportunities${qs ? `?${qs}` : ""}`,
  );
}

export async function createOpportunity(
  data: CreateOpportunityDto,
): Promise<OpportunityResponseDto> {
  return apiFetch<OpportunityResponseDto>("/crm/opportunities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchOpportunity(id: number): Promise<OpportunityResponseDto> {
  return apiFetch<OpportunityResponseDto>(`/crm/opportunities/${id}`);
}

export async function updateOpportunity(
  id: number,
  data: UpdateOpportunityDto,
): Promise<OpportunityResponseDto> {
  return apiFetch<OpportunityResponseDto>(`/crm/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteOpportunity(id: number): Promise<{ ok: boolean; id: number }> {
  return apiFetch<{ ok: boolean; id: number }>(`/crm/opportunities/${id}`, {
    method: "DELETE",
  });
}

// 客户分类管理
export async function fetchCustomerCategories(
  query?: CustomerCategoryListQueryDto,
): Promise<CustomerCategoryResponseDto[]> {
  const params = new URLSearchParams();
  if (query?.type) params.set("type", query.type);

  const qs = params.toString();
  return apiFetch<CustomerCategoryResponseDto[]>(
    `/crm/categories${qs ? `?${qs}` : ""}`,
  );
}

export async function createCustomerCategory(
  data: CreateCustomerCategoryDto,
): Promise<CustomerCategoryResponseDto> {
  return apiFetch<CustomerCategoryResponseDto>("/crm/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCustomerCategory(
  id: number,
  data: UpdateCustomerCategoryDto,
): Promise<CustomerCategoryResponseDto> {
  return apiFetch<CustomerCategoryResponseDto>(`/crm/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCustomerCategory(id: number): Promise<{ ok: boolean; id: number }> {
  return apiFetch<{ ok: boolean; id: number }>(`/crm/categories/${id}`, {
    method: "DELETE",
  });
}

// 客户分类关联
export async function assignCustomerToCategory(
  customerId: number,
  categoryId: number,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch<{ ok: boolean; message: string }>(
    `/crm/customers/${customerId}/categories/${categoryId}`,
    {
      method: "POST",
    },
  );
}

export async function removeCustomerFromCategory(
  customerId: number,
  categoryId: number,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch<{ ok: boolean; message: string }>(
    `/crm/customers/${customerId}/categories/${categoryId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getCustomerCategories(
  customerId: number,
): Promise<{ id: number; name: string; type: string; color: string }[]> {
  return apiFetch<{ id: number; name: string; type: string; color: string }[]>(
    `/crm/customers/${customerId}/categories`,
  );
}

// 跟进记录管理
export async function fetchFollowUpRecords(
  customerId: number,
  query?: FollowUpListQueryDto,
): Promise<FollowUpListResponseDto> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));

  const qs = params.toString();
  return apiFetch<FollowUpListResponseDto>(
    `/crm/customers/${customerId}/follow-ups${qs ? `?${qs}` : ""}`,
  );
}

export async function createFollowUpRecord(
  customerId: number,
  data: CreateFollowUpDto,
): Promise<FollowUpRecordResponseDto> {
  return apiFetch<FollowUpRecordResponseDto>(`/crm/customers/${customerId}/follow-ups`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateFollowUpRecord(
  customerId: number,
  followUpId: number,
  data: UpdateFollowUpDto,
): Promise<FollowUpRecordResponseDto> {
  return apiFetch<FollowUpRecordResponseDto>(
    `/crm/customers/${customerId}/follow-ups/${followUpId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteFollowUpRecord(
  customerId: number,
  followUpId: number,
): Promise<{ ok: boolean; id: number }> {
  return apiFetch<{ ok: boolean; id: number }>(
    `/crm/customers/${customerId}/follow-ups/${followUpId}`,
    {
      method: "DELETE",
    },
  );
}
