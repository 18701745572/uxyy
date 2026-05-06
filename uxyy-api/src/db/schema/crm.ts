import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { enterprises, users } from './auth';

export const customerTypeEnum = ['personal', 'enterprise'] as const;
export const customerLevelEnum = ['VIP', 'regular', 'potential'] as const;
export const customerSourceEnum = ['manual', 'import', 'wechat'] as const;
export const followUpTypeEnum = ['text', 'image', 'voice', 'file'] as const;

/** 商机状态枚举 */
export const opportunityStatusEnum = [
  'potential',
  'intention',
  'quotation',
  'deal',
  'after_sales',
  'lost',
] as const;

/** 客户分类类型枚举 */
export const customerCategoryTypeEnum = [
  'status',
  'industry',
  'region',
  'custom',
] as const;

/** PRD 11.5.2 · customers 归属 Agent-CRM */
export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    contactPerson: varchar('contact_person', { length: 50 }),
    address: text('address'),
    type: varchar('type', { length: 20 }).default('enterprise'),
    level: varchar('level', { length: 20 }).default('regular'),
    industry: varchar('industry', { length: 50 }),
    tags: text('tags').array(),
    source: varchar('source', { length: 20 }).default('manual'),
    assignedTo: integer('assigned_to').references(() => users.id),
    creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }),
    remark: text('remark'),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('customers_enterprise_id_idx').on(t.enterpriseId),
    index('customers_name_phone_idx').on(t.name, t.phone),
    index('customers_assigned_to_idx').on(t.assignedTo),
  ],
);

/** PRD 2.3.2 · 跟进记录 — Agent-CRM 私有表 */
export const followUpRecords = pgTable(
  'follow_up_records',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    content: text('content').notNull(),
    type: varchar('type', { length: 20 }).default('text'),
    attachmentUrls: text('attachment_urls').array(),
    nextFollowUpAt: timestamp('next_follow_up_at'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('follow_up_customer_id_idx').on(t.customerId),
    index('follow_up_enterprise_id_idx').on(t.enterpriseId),
    index('follow_up_created_at_idx').on(t.createdAt),
  ],
);

/** PRD 2.3.2 · 商机管理 — Agent-CRM */
export const opportunities = pgTable(
  'opportunities',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).default('potential').notNull(),
    estimatedAmount: numeric('estimated_amount', { precision: 12, scale: 2 }),
    actualAmount: numeric('actual_amount', { precision: 12, scale: 2 }),
    expectedCloseAt: timestamp('expected_close_at'),
    actualCloseAt: timestamp('actual_close_at'),
    assignedTo: integer('assigned_to').references(() => users.id),
    probability: integer('probability').default(0),
    remark: text('remark'),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('opportunities_enterprise_id_idx').on(t.enterpriseId),
    index('opportunities_customer_id_idx').on(t.customerId),
    index('opportunities_status_idx').on(t.status),
    index('opportunities_assigned_to_idx').on(t.assignedTo),
    index('opportunities_created_at_idx').on(t.createdAt),
  ],
);

/** PRD 2.3.1 · 客户分类 — Agent-CRM */
export const customerCategories = pgTable(
  'customer_categories',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 20 }).default('custom').notNull(),
    description: text('description'),
    color: varchar('color', { length: 20 }).default('#1890ff'),
    sortOrder: integer('sort_order').default(0),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('customer_categories_enterprise_id_idx').on(t.enterpriseId),
    index('customer_categories_type_idx').on(t.type),
  ],
);

/** 客户与分类关联表 */
export const customerCategoryRelations = pgTable(
  'customer_category_relations',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    categoryId: integer('category_id')
      .references(() => customerCategories.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('customer_cat_rel_customer_id_idx').on(t.customerId),
    index('customer_cat_rel_category_id_idx').on(t.categoryId),
  ],
);
