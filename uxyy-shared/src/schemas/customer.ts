import { z } from 'zod';

export const customerTypeEnum = z.enum(['personal', 'enterprise']);
export type CustomerType = z.infer<typeof customerTypeEnum>;

export const customerLevelEnum = z.enum(['VIP', 'regular', 'potential']);
export type CustomerLevel = z.infer<typeof customerLevelEnum>;

export const customerSourceEnum = z.enum(['manual', 'import', 'wechat']);
export type CustomerSource = z.infer<typeof customerSourceEnum>;

export const followUpTypeEnum = z.enum(['text', 'image', 'voice', 'file']);
export type FollowUpType = z.infer<typeof followUpTypeEnum>;

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  contactPerson: z.string().max(50).optional(),
  address: z.string().optional(),
  type: customerTypeEnum.optional().default('enterprise'),
  level: customerLevelEnum.optional().default('regular'),
  industry: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  source: customerSourceEnum.optional().default('manual'),
  assignedTo: z.number().int().positive().optional(),
  creditLimit: z.number().min(0).optional(),
  remark: z.string().max(4000).optional(),
  force: z.boolean().optional().default(false),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional().nullable(),
  contactPerson: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  type: customerTypeEnum.optional(),
  level: customerLevelEnum.optional(),
  industry: z.string().max(50).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  source: customerSourceEnum.optional(),
  assignedTo: z.number().int().positive().optional().nullable(),
  creditLimit: z.number().min(0).optional().nullable(),
  remark: z.string().max(4000).optional().nullable(),
});
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  type: customerTypeEnum.optional(),
  level: customerLevelEnum.optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  isDeleted: z.coerce.boolean().optional().default(false),
});
export type CustomerListQueryInput = z.infer<typeof customerListQuerySchema>;

export const createFollowUpSchema = z.object({
  content: z.string().min(1),
  type: followUpTypeEnum.optional().default('text'),
  attachmentUrls: z.array(z.string()).optional(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
});
export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

export const updateFollowUpSchema = z.object({
  content: z.string().min(1).optional(),
  type: followUpTypeEnum.optional(),
  attachmentUrls: z.array(z.string()).optional().nullable(),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
});
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
