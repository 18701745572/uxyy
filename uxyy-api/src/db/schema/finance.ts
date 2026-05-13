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
  voucherStatusEnum,
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
  sourceType: varchar('source_type', { length: 50 }), // 来源：manual, sales_order, purchase_order等
  sourceId: integer('source_id'), // 来源单据ID
  status: voucherStatusEnum('status').default('draft').notNull(),
  // 审核相关
  submittedBy: integer('submitted_by').references(() => users.id),
  submittedAt: timestamp('submitted_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
  rejectReason: text('reject_reason'),
  // 过账相关
  postedBy: integer('posted_by').references(() => users.id),
  postedAt: timestamp('posted_at'),
  // 基础字段
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

// ==================== 业务类型科目映射表 ====================
export const accountMappingRules = pgTable('account_mapping_rules', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  businessType: varchar('business_type', { length: 50 }).notNull(), // 业务类型：sales_order, purchase_order等
  subType: varchar('sub_type', { length: 50 }), // 子类型：cash_sale, credit_sale等
  debitAccountId: integer('debit_account_id')
    .references(() => accounts.id),
  creditAccountId: integer('credit_account_id')
    .references(() => accounts.id),
  description: text('description'),
  priority: integer('priority').default(0), // 优先级，用于冲突解决
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== 凭证明细辅助核算 ====================
export const voucherItemAuxiliaries = pgTable('voucher_item_auxiliaries', {
  id: serial('id').primaryKey(),
  voucherItemId: integer('voucher_item_id')
    .references(() => voucherItems.id)
    .notNull(),
  auxiliaryType: varchar('auxiliary_type', { length: 20 }).notNull(), // customer, supplier, department, project, employee
  auxiliaryId: integer('auxiliary_id').notNull(), // 关联的具体ID
  auxiliaryName: varchar('auxiliary_name', { length: 100 }), // 冗余存储名称
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 凭证审核记录 ====================
export const voucherAudits = pgTable('voucher_audits', {
  id: serial('id').primaryKey(),
  voucherId: integer('voucher_id')
    .references(() => vouchers.id)
    .notNull(),
  action: varchar('action', { length: 20 }).notNull(), // submit, approve, reject, post, void
  fromStatus: varchar('from_status', { length: 20 }),
  toStatus: varchar('to_status', { length: 20 }).notNull(),
  comment: text('comment'),
  performedBy: integer('performed_by')
    .references(() => users.id)
    .notNull(),
  performedAt: timestamp('performed_at').defaultNow().notNull(),
});

// ==================== AI学习记录表 ====================
export const aiLearningRecords = pgTable('ai_learning_records', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  recordType: varchar('record_type', { length: 30 }).notNull(), // pattern, rule, preference
  category: varchar('category', { length: 50 }).notNull(), // 分类：account_mapping, counterparty, etc.
  key: varchar('key', { length: 200 }).notNull(), // 关键词/特征
  value: jsonb('value').notNull(), // 学习到的值
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // 置信度
  occurrenceCount: integer('occurrence_count').default(1), // 出现次数
  lastOccurredAt: timestamp('last_occurred_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== 异常检测预警表 ====================
export const financeAlerts = pgTable('finance_alerts', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // 预警类型
  severity: varchar('severity', { length: 10 }).notNull(), // high, medium, low
  sourceType: varchar('source_type', { length: 30 }), // voucher, invoice, statement
  sourceId: integer('source_id'), // 关联记录ID
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description').notNull(),
  suggestion: text('suggestion'), // 处理建议
  // 预警状态
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, resolved, ignored
  resolvedBy: integer('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  resolutionNote: text('resolution_note'),
  // 通知状态
  notifiedAt: timestamp('notified_at'),
  notificationCount: integer('notification_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 预警配置表 ====================
export const financeAlertConfigs = pgTable('finance_alert_configs', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  thresholdValue: decimal('threshold_value', { precision: 12, scale: 2 }), // 阈值
  notifyChannels: jsonb('notify_channels').default('[]'), // ["email", "sms", "app"]
  notifyTargets: jsonb('notify_targets').default('[]'), // 通知对象ID列表
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== 智能推荐记录表 ====================
export const aiRecommendations = pgTable('ai_recommendations', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  recommendationType: varchar('recommendation_type', { length: 30 }).notNull(), // account, template, action
  context: jsonb('context').notNull(), // 推荐上下文
  recommendation: jsonb('recommendation').notNull(), // 推荐内容
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // 置信度
  isAccepted: boolean('is_accepted'), // 是否被采纳
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 银行流水导入记录 ====================
export const bankStatements = pgTable('bank_statements', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  // 银行信息
  bankName: varchar('bank_name', { length: 50 }).notNull(), // 银行名称
  bankAccount: varchar('bank_account', { length: 50 }).notNull(), // 银行账号
  accountName: varchar('account_name', { length: 100 }), // 账户名称
  // 交易信息
  transactionDate: timestamp('transaction_date').notNull(), // 交易日期
  transactionTime: varchar('transaction_time', { length: 20 }), // 交易时间
  direction: varchar('direction', { length: 10 }).notNull(), // income / expense
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(), // 金额
  balance: decimal('balance', { precision: 12, scale: 2 }), // 余额
  // 交易对手
  counterpartyName: varchar('counterparty_name', { length: 100 }), // 对方户名
  counterpartyAccount: varchar('counterparty_account', { length: 50 }), // 对方账号
  counterpartyBank: varchar('counterparty_bank', { length: 50 }), // 对方银行
  // 交易详情
  transactionType: varchar('transaction_type', { length: 50 }), // 交易类型
  remark: text('remark'), // 备注/摘要
  purpose: varchar('purpose', { length: 200 }), // 用途
  referenceNo: varchar('reference_no', { length: 50 }), // 流水号/参考号
  // 智能处理
  matchStatus: varchar('match_status', { length: 20 }).default('unmatched').notNull(), // unmatched, matched, voucher_created
  matchedVoucherId: integer('matched_voucher_id').references(() => vouchers.id),
  suggestedAccountId: integer('suggested_account_id').references(() => accounts.id),
  confidence: decimal('confidence', { precision: 3, scale: 2 }), // 匹配置信度 0-1
  // 导入信息
  importBatchId: varchar('import_batch_id', { length: 50 }), // 批次号
  rawData: jsonb('raw_data'), // 原始数据
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== 凭证模板库 ====================
export const voucherTemplates = pgTable('voucher_templates', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  templateCode: varchar('template_code', { length: 20 }).notNull(), // 模板编码
  templateName: varchar('template_name', { length: 50 }).notNull(), // 模板名称
  description: text('description'), // 模板说明
  category: varchar('category', { length: 30 }).notNull(), // 模板分类
  isSystem: boolean('is_system').default(false).notNull(), // 是否系统预设
  isActive: boolean('is_active').default(true).notNull(),
  // 模板内容
  summary: text('summary'), // 默认摘要
  entries: jsonb('entries').notNull(), // 模板分录 [{accountId, direction, percentage, summary}]
  // 使用统计
  usageCount: integer('usage_count').default(0),
  lastUsedAt: timestamp('last_used_at'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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

// ==================== 新增关系定义 ====================

export const accountMappingRulesRelations = relations(accountMappingRules, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [accountMappingRules.enterpriseId],
    references: [enterprises.id],
  }),
  createdByUser: one(users, {
    fields: [accountMappingRules.createdBy],
    references: [users.id],
  }),
  debitAccount: one(accounts, {
    fields: [accountMappingRules.debitAccountId],
    references: [accounts.id],
  }),
  creditAccount: one(accounts, {
    fields: [accountMappingRules.creditAccountId],
    references: [accounts.id],
  }),
}));

export const voucherItemAuxiliariesRelations = relations(voucherItemAuxiliaries, ({ one }) => ({
  voucherItem: one(voucherItems, {
    fields: [voucherItemAuxiliaries.voucherItemId],
    references: [voucherItems.id],
  }),
}));

export const voucherAuditsRelations = relations(voucherAudits, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherAudits.voucherId],
    references: [vouchers.id],
  }),
  performedByUser: one(users, {
    fields: [voucherAudits.performedBy],
    references: [users.id],
  }),
}));

// 更新vouchersRelations以包含审核相关关系
export const vouchersRelationsExtended = relations(vouchers, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [vouchers.enterpriseId],
    references: [enterprises.id],
  }),
  createdByUser: one(users, {
    fields: [vouchers.createdBy],
    references: [users.id],
  }),
  submittedByUser: one(users, {
    fields: [vouchers.submittedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [vouchers.approvedBy],
    references: [users.id],
  }),
  postedByUser: one(users, {
    fields: [vouchers.postedBy],
    references: [users.id],
  }),
  items: many(voucherItems),
  audits: many(voucherAudits),
}));

// 银行流水关系
export const bankStatementsRelations = relations(bankStatements, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [bankStatements.enterpriseId],
    references: [enterprises.id],
  }),
  matchedVoucher: one(vouchers, {
    fields: [bankStatements.matchedVoucherId],
    references: [vouchers.id],
  }),
  suggestedAccount: one(accounts, {
    fields: [bankStatements.suggestedAccountId],
    references: [accounts.id],
  }),
}));

// 凭证模板关系
export const voucherTemplatesRelations = relations(voucherTemplates, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [voucherTemplates.enterpriseId],
    references: [enterprises.id],
  }),
}));

// AI学习记录关系
export const aiLearningRecordsRelations = relations(aiLearningRecords, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [aiLearningRecords.enterpriseId],
    references: [enterprises.id],
  }),
}));

// 异常预警关系
export const financeAlertsRelations = relations(financeAlerts, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [financeAlerts.enterpriseId],
    references: [enterprises.id],
  }),
  resolver: one(users, {
    fields: [financeAlerts.resolvedBy],
    references: [users.id],
  }),
}));

// 预警配置关系
export const financeAlertConfigsRelations = relations(financeAlertConfigs, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [financeAlertConfigs.enterpriseId],
    references: [enterprises.id],
  }),
}));

// 智能推荐关系
export const aiRecommendationsRelations = relations(aiRecommendations, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [aiRecommendations.enterpriseId],
    references: [enterprises.id],
  }),
}));

