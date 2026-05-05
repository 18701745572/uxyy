import { z } from "zod";
import { paginationSchema } from "./pagination";

/** 客户记录：与 NestJS CustomerResponseDto 对齐 */
export const customerSchema = z.object({
  id: z.number(),
  enterpriseId: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  remark: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CustomerDto = z.infer<typeof customerSchema>;

/** 客户分页列表响应 */
export const customerListSchema = z.object({
  items: z.array(customerSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type CustomerListResponse = z.infer<typeof customerListSchema>;

/** 创建客户 */
export const createCustomerSchema = z.object({
  name: z.string().min(1, "名称不能为空").max(200),
  phone: z.string().max(20).optional(),
  remark: z.string().max(4000).optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/** 更新客户（部分字段） */
export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

/** 客户列表查询参数：分页基 + 可选搜索 */
export const customerListQuerySchema = paginationSchema.extend({
  /** 预留搜索字段（后续对接 CRM search 参数） */
  // search: z.string().optional(),
});

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
