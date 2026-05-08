import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  timestamp,
  text,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { enterprises } from './auth';
import { users } from './auth';
import {
  invoiceTypeEnum,
  invoiceStatusEnum,
  balanceDirectionEnum,
} from './enums';

// ==================== 发票管理 ====================
// PRD §8.2 lines 1050-1071

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  invoiceNo: varchar('invoice_no', { length: 50 }).notNull(),
  invoiceCode: varchar('invoice_code', { length: 20 }),
  type: invoiceTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  buyerName: varchar('buyer_name', { length: 100 }),
  buyerTaxNo: varchar('buyer_tax_no', { length: 30 }),
  sellerName: varchar('seller_name', { length: 100 }),
  sellerTaxNo: varchar('seller_tax_no', { length: 30 }),
  issueDate: timestamp('issue_date'),
  status: invoiceStatusEnum('status').default('unverified').notNull(),
  ocrData: jsonb('ocr_data'),
  sourceType: varchar('source_type', { length: 20 }),
  sourceId: integer('source_id'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 财务凭证 ====================
// PRD §8.2 lines 1074-1087

export const voucherEntries = pgTable('voucher_entries', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  voucherNo: varchar('voucher_no', { length: 50 }).notNull(),
  sourceType: varchar('source_type', { length: 20 }).notNull(),
  sourceId: integer('source_id'),
  entryDate: timestamp('entry_date').defaultNow().notNull(),
  debitAccount: varchar('debit_account', { length: 50 }).notNull(),
  creditAccount: varchar('credit_account', { length: 50 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  summary: text('summary'),
  createdBy: integer('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 会计科目 ====================
// 自引用树形结构，企业级科目表

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(), // asset, liability, equity, revenue, expense
  parentId: integer('parent_id'),
  balanceDirection: varchar('balance_direction', { length: 10 }).default('debit'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [accounts.enterpriseId],
    references: [enterprises.id],
  }),
}));

// ==================== 财务凭证 ====================
export const vouchers = pgTable('vouchers', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  voucherNo: varchar('voucher_no', { length: 50 }).notNull(),
  voucherDate: timestamp('voucher_date').defaultNow().notNull(),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  summary: text('summary'),
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [vouchers.enterpriseId],
    references: [enterprises.id],
  }),
  createdByUser: one(users, {
    fields: [vouchers.createdBy],
    references: [users.id],
  }),
  items: many(voucherItems),
}));

// ==================== 凭证明细 ====================
export const voucherItems = pgTable('voucher_items', {
  id: serial('id').primaryKey(),
  voucherId: integer('voucher_id')
    .references(() => vouchers.id)
    .notNull(),
  accountId: integer('account_id')
    .references(() => accounts.id)
    .notNull(),
  debitAmount: decimal('debit_amount', { precision: 12, scale: 2 }).default('0'),
  creditAmount: decimal('credit_amount', { precision: 12, scale: 2 }).default('0'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const voucherItemsRelations = relations(voucherItems, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherItems.voucherId],
    references: [vouchers.id],
  }),
  account: one(accounts, {
    fields: [voucherItems.accountId],
    references: [accounts.id],
  }),
}));

// ==================== 会计科目表(旧版兼容) ====================
export const accountSubjects = pgTable('account_subjects', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  category: varchar('category', { length: 20 }).notNull(),
  parentId: integer('parent_id').references((): any => accountSubjects.id),
  balanceDirection: balanceDirectionEnum('balance_direction')
    .default('debit')
    .notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 关系定义 ====================

export const invoicesRelations = relations(invoices, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [invoices.enterpriseId],
    references: [enterprises.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
}));

export const voucherEntriesRelations = relations(voucherEntries, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [voucherEntries.enterpriseId],
    references: [enterprises.id],
  }),
  createdByUser: one(users, {
    fields: [voucherEntries.createdBy],
    references: [users.id],
  }),
}));

export const accountSubjectsRelations = relations(
  accountSubjects,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [accountSubjects.enterpriseId],
      references: [enterprises.id],
    }),
    parent: one(accountSubjects, {
      fields: [accountSubjects.parentId],
      references: [accountSubjects.id],
    }),
    children: many(accountSubjects),
  }),
);
