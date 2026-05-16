import { apiFetch, apiUploadFile, ApiError, formatApiErrorBody } from "./client";

export type MemberLevelImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入会员等级（与导出表头对齐；mode=skip 跳过同名等级） */
export async function importMemberLevels(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<MemberLevelImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/crm/members/levels/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<MemberLevelImportResult>;
}

export type CustomerCategoryImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入客户分类（与导出表头对齐；mode=skip 跳过同名分类） */
export async function importCustomerCategories(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<CustomerCategoryImportResult> {
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/crm/categories/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<CustomerCategoryImportResult>;
}

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
  description?: string | null;
  status?: OpportunityStatus;
  estimatedAmount?: number | null;
  actualAmount?: number | null;
  /** 传 null 表示清空日期（与 PATCH 语义一致） */
  expectedCloseAt?: string | null;
  actualCloseAt?: string | null;
  /** 传 null 表示清空负责人 */
  assignedTo?: number | null;
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
  attachmentUrls?: string[] | null;
  nextFollowUpAt?: string | null;
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

// 商机导入类型
export type OpportunityImportResult = {
  created: number;
  skipped: number;
  failures: Array<{ row: number; reason: string }>;
};

/** multipart 导入商机（与导出表头对齐；mode=skip 跳过同企名称+客户重复） */
export async function importOpportunities(
  file: File,
  mode: "skip" | "force" = "skip",
): Promise<OpportunityImportResult> {
  const { apiUploadFile, ApiError, formatApiErrorBody } = await import("./client");
  const q = new URLSearchParams({ mode });
  const res = await apiUploadFile(`/crm/opportunities/import?${q.toString()}`, file);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(
      res.status,
      formatApiErrorBody(text, `导入失败（${res.status}）`),
    );
  }
  return res.json() as Promise<OpportunityImportResult>;
}

/** @see AiScriptService.generateScript */
export interface GeneratedScriptDto {
  type: string;
  title: string;
  content: string;
  tips: string[];
  alternatives: string[];
}

/**
 * 按场景为客户生成话术（基于模板 + 客户 / 跟进 / 商机上下文填充占位符）
 * GET /crm/ai-scripts/generate/:customerId?scene=...
 */
export async function generateAiScript(
  customerId: number,
  scene: string,
): Promise<GeneratedScriptDto[]> {
  const params = new URLSearchParams({ scene });
  return apiFetch<GeneratedScriptDto[]>(
    `/crm/ai-scripts/generate/${customerId}?${params.toString()}`,
  );
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

// ==================== 会员管理相关类型和API ====================

// 会员等级类型
export type MemberLevelCode = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface MemberLevelResponseDto {
  id: number;
  enterpriseId: number;
  name: string;
  code: MemberLevelCode;
  minPoints: number;
  maxPoints?: number;
  discountRate: string; // 折扣率，如 "95.00" 表示95折
  description?: string;
  benefits?: string[];
  color: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberLevelDto {
  name: string;
  code: MemberLevelCode;
  minPoints?: number;
  maxPoints?: number;
  discountRate?: string;
  description?: string;
  benefits?: string[];
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

export interface UpdateMemberLevelDto {
  name?: string;
  code?: MemberLevelCode;
  minPoints?: number;
  maxPoints?: number;
  discountRate?: string;
  description?: string;
  benefits?: string[];
  color?: string;
  sortOrder?: number;
  isDefault?: boolean;
}

// 客户会员类型
export interface CustomerMemberResponseDto {
  id: number;
  customerId: number;
  customerName?: string;
  enterpriseId: number;
  memberNo?: string;
  levelId?: number;
  levelName?: string;
  levelCode?: MemberLevelCode;
  totalPoints: number;
  availablePoints: number;
  usedPoints: number;
  balance: string;
  totalConsumption: string;
  orderCount: number;
  joinDate: string;
  expireDate?: string;
  lastConsumptionAt?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerMemberDto {
  customerId: number;
  levelId?: number;
  memberNo?: string;
  remark?: string;
}

export interface UpdateCustomerMemberDto {
  levelId?: number;
  memberNo?: string;
  remark?: string;
}

// 积分记录类型
export type PointsChangeType = "earn" | "redeem" | "adjust" | "expire";

export interface PointsRecordResponseDto {
  id: number;
  customerId: number;
  customerName?: string;
  enterpriseId: number;
  type: PointsChangeType;
  points: number; // 正数为增加，负数为减少
  beforePoints: number;
  afterPoints: number;
  sourceType?: string;
  sourceId?: number;
  description?: string;
  createdBy?: number;
  createdAt: string;
}

export interface AddPointsDto {
  customerId: number;
  points: number;
  type: PointsChangeType;
  description?: string;
  sourceType?: string;
  sourceId?: number;
}

// 会员等级管理API
export async function fetchMemberLevels(): Promise<MemberLevelResponseDto[]> {
  return apiFetch<MemberLevelResponseDto[]>("/crm/members/levels");
}

export async function fetchMemberLevel(id: number): Promise<MemberLevelResponseDto> {
  return apiFetch<MemberLevelResponseDto>(`/crm/members/levels/${id}`);
}

export async function createMemberLevel(
  data: CreateMemberLevelDto,
): Promise<MemberLevelResponseDto> {
  return apiFetch<MemberLevelResponseDto>("/crm/members/levels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMemberLevel(
  id: number,
  data: UpdateMemberLevelDto,
): Promise<MemberLevelResponseDto> {
  return apiFetch<MemberLevelResponseDto>(`/crm/members/levels/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMemberLevel(id: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/crm/members/levels/${id}`, {
    method: "DELETE",
  });
}

// 会员管理API
export interface MemberListQueryDto {
  page?: number;
  pageSize?: number;
  levelId?: number;
  search?: string;
}

export interface MemberListResponseDto {
  items: CustomerMemberResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchMembers(query?: MemberListQueryDto): Promise<MemberListResponseDto> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));
  if (query?.levelId) params.set("levelId", String(query.levelId));
  if (query?.search) params.set("search", query.search);

  const qs = params.toString();
  return apiFetch<MemberListResponseDto>(`/crm/members${qs ? `?${qs}` : ""}`);
}

export async function fetchCustomerMember(customerId: number): Promise<CustomerMemberResponseDto> {
  return apiFetch<CustomerMemberResponseDto>(`/crm/members/customer/${customerId}`);
}

export async function createCustomerMember(
  data: CreateCustomerMemberDto,
): Promise<CustomerMemberResponseDto> {
  return apiFetch<CustomerMemberResponseDto>("/crm/members", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCustomerMember(
  customerId: number,
  data: UpdateCustomerMemberDto,
): Promise<CustomerMemberResponseDto> {
  return apiFetch<CustomerMemberResponseDto>(`/crm/members/customer/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCustomerMember(customerId: number): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/crm/members/customer/${customerId}`, {
    method: "DELETE",
  });
}

// 积分管理API
export async function addPoints(data: AddPointsDto): Promise<CustomerMemberResponseDto> {
  return apiFetch<CustomerMemberResponseDto>("/crm/members/points/add", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchPointsRecords(
  customerId: number,
  query?: { page?: number; pageSize?: number },
): Promise<{ items: PointsRecordResponseDto[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams();
  if (query?.page) params.set("page", String(query.page));
  if (query?.pageSize) params.set("pageSize", String(query.pageSize));

  const qs = params.toString();
  return apiFetch(
    `/crm/members/points/records/${customerId}${qs ? `?${qs}` : ""}`,
  );
}

// 获取积分变动类型标签
export function getPointsChangeTypeLabel(type: PointsChangeType): string {
  const labels: Record<PointsChangeType, string> = {
    earn: "获得积分",
    redeem: "兑换消耗",
    adjust: "手动调整",
    expire: "积分过期",
  };
  return labels[type];
}

// 获取积分变动类型颜色
export function getPointsChangeTypeColor(type: PointsChangeType): string {
  const colors: Record<PointsChangeType, string> = {
    earn: "text-green-600 bg-green-50",
    redeem: "text-orange-600 bg-orange-50",
    adjust: "text-blue-600 bg-blue-50",
    expire: "text-text-secondary bg-bg-secondary",
  };
  return colors[type];
}

// 获取会员等级标签
export function getMemberLevelLabel(code: MemberLevelCode): string {
  const labels: Record<MemberLevelCode, string> = {
    bronze: "青铜会员",
    silver: "白银会员",
    gold: "黄金会员",
    platinum: "铂金会员",
    diamond: "钻石会员",
  };
  return labels[code];
}

// 获取会员等级颜色
export function getMemberLevelColor(code: MemberLevelCode): string {
  const colors: Record<MemberLevelCode, string> = {
    bronze: "text-amber-700 bg-amber-100",
    silver: "text-slate-600 bg-slate-200",
    gold: "text-yellow-700 bg-yellow-100",
    platinum: "text-cyan-700 bg-cyan-100",
    diamond: "text-purple-700 bg-purple-100",
  };
  return colors[code];
}
