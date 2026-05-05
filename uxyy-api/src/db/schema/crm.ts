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
