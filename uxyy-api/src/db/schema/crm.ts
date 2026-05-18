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

/** 报价单状态枚举 */
export const quotationStatusEnum = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
] as const;

/** PRD 2.3.3 · 报价单管理 — Agent-CRM */
export const quotations = pgTable(
  'quotations',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    opportunityId: integer('opportunity_id'),
    quotationNo: varchar('quotation_no', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', {
      precision: 12,
      scale: 2,
    }).default('0'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }).default('0'),
    payableAmount: numeric('payable_amount', {
      precision: 12,
      scale: 2,
    }).notNull(),
    validUntil: timestamp('valid_until'),
    remark: text('remark'),
    pdfUrl: text('pdf_url'),
    createdBy: integer('created_by').references(() => users.id),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('quotations_enterprise_id_idx').on(t.enterpriseId),
    index('quotations_customer_id_idx').on(t.customerId),
    index('quotations_opportunity_id_idx').on(t.opportunityId),
    index('quotations_status_idx').on(t.status),
    index('quotations_quotation_no_idx').on(t.quotationNo),
  ],
);

/** 报价单明细 */
export const quotationItems = pgTable(
  'quotation_items',
  {
    id: serial('id').primaryKey(),
    quotationId: integer('quotation_id')
      .references(() => quotations.id)
      .notNull(),
    productId: integer('product_id'),
    productName: varchar('product_name', { length: 200 }).notNull(),
    specification: varchar('specification', { length: 200 }),
    quantity: numeric('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default(
      '100',
    ),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    remark: text('remark'),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('quotation_items_quotation_id_idx').on(t.quotationId),
    index('quotation_items_product_id_idx').on(t.productId),
  ],
);

/** 会员等级枚举 */
export const memberLevelEnum = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
] as const;

/** PRD 2.3.1 · 会员等级配置 — Agent-CRM */
export const memberLevels = pgTable(
  'member_levels',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    code: varchar('code', { length: 20 }).notNull(), // bronze, silver, gold, etc.
    minPoints: integer('min_points').default(0).notNull(),
    maxPoints: integer('max_points'),
    discountRate: numeric('discount_rate', { precision: 5, scale: 2 }).default(
      '100',
    ), // 折扣率，100为原价
    description: text('description'),
    benefits: text('benefits').array(), // 会员权益列表
    color: varchar('color', { length: 20 }).default('#1890ff'),
    sortOrder: integer('sort_order').default(0),
    isDefault: boolean('is_default').default(false), // 是否默认等级
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('member_levels_enterprise_id_idx').on(t.enterpriseId),
    index('member_levels_code_idx').on(t.enterpriseId, t.code),
  ],
);

/** PRD 2.3.1 · 客户会员信息 — Agent-CRM */
export const customerMembers = pgTable(
  'customer_members',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull()
      .unique(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    memberNo: varchar('member_no', { length: 50 }), // 会员卡号
    levelId: integer('level_id').references(() => memberLevels.id),
    totalPoints: integer('total_points').default(0).notNull(), // 累计积分
    availablePoints: integer('available_points').default(0).notNull(), // 可用积分
    usedPoints: integer('used_points').default(0).notNull(), // 已用积分
    balance: numeric('balance', { precision: 12, scale: 2 })
      .default('0')
      .notNull(), // 余额
    totalConsumption: numeric('total_consumption', { precision: 12, scale: 2 })
      .default('0')
      .notNull(), // 累计消费
    orderCount: integer('order_count').default(0).notNull(), // 订单数量
    joinDate: timestamp('join_date').defaultNow().notNull(), // 入会日期
    expireDate: timestamp('expire_date'), // 会员到期日
    lastConsumptionAt: timestamp('last_consumption_at'), // 最后消费时间
    remark: text('remark'),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('customer_members_customer_id_idx').on(t.customerId),
    index('customer_members_enterprise_id_idx').on(t.enterpriseId),
    index('customer_members_member_no_idx').on(t.memberNo),
    index('customer_members_level_id_idx').on(t.levelId),
  ],
);

/** 积分变动类型枚举 */
export const pointsChangeTypeEnum = [
  'earn',
  'redeem',
  'adjust',
  'expire',
] as const;

/** PRD 2.3.1 · 积分变动记录 — Agent-CRM */
export const pointsRecords = pgTable(
  'points_records',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    type: varchar('type', { length: 20 }).notNull(), // earn, redeem, adjust, expire
    points: integer('points').notNull(), // 变动积分（正数为增加，负数为减少）
    beforePoints: integer('before_points').notNull(), // 变动前积分
    afterPoints: integer('after_points').notNull(), // 变动后积分
    sourceType: varchar('source_type', { length: 50 }), // 来源类型：order, manual, activity
    sourceId: integer('source_id'), // 来源ID
    description: text('description'), // 变动说明
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('points_records_customer_id_idx').on(t.customerId),
    index('points_records_enterprise_id_idx').on(t.enterpriseId),
    index('points_records_type_idx').on(t.type),
    index('points_records_created_at_idx').on(t.createdAt),
  ],
);
