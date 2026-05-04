import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { enterprises } from './auth';

/** PRD 11.5.2 · invoices 归属 Agent-Finance */
export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    type: varchar('type', { length: 10 }).notNull(), // in/out
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    taxNo: varchar('tax_no', { length: 50 }),
    address: varchar('address', { length: 255 }),
    phone: varchar('phone', { length: 20 }),
    bankName: varchar('bank_name', { length: 100 }),
    bankAccount: varchar('bank_account', { length: 50 }),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('invoices_enterprise_id_idx').on(t.enterpriseId)],
);

/** 会计科目表 */
export const accountSubjects = pgTable(
  'account_subjects',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    code: varchar('code', { length: 20 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // asset/liability/equity/income/expense
    parentId: integer('parent_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('account_subjects_enterprise_id_idx').on(t.enterpriseId),
    index('account_subjects_code_idx').on(t.code),
  ],
);

/** 凭证表 */
export const vouchers = pgTable(
  'vouchers',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    voucherNo: varchar('voucher_no', { length: 50 }).notNull(),
    voucherDate: timestamp('voucher_date').notNull(),
    totalDebit: numeric('total_debit', { precision: 14, scale: 2 }).default('0'),
    totalCredit: numeric('total_credit', { precision: 14, scale: 2 }).default('0'),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('vouchers_enterprise_id_idx').on(t.enterpriseId)],
);

/** 凭证分录表 */
export const voucherEntries = pgTable(
  'voucher_entries',
  {
    id: serial('id').primaryKey(),
    voucherId: integer('voucher_id').notNull(),
    subjectId: integer('subject_id').notNull(),
    debit: numeric('debit', { precision: 12, scale: 2 }).default('0'),
    credit: numeric('credit', { precision: 12, scale: 2 }).default('0'),
    summary: text('summary'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('voucher_entries_voucher_id_idx').on(t.voucherId)],
);
