import {
  date,
  decimal,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import {
  approvalFlowStatusEnum,
  approvalFlowTypeEnum,
  approvalRecordStatusEnum,
} from './enums';
import { enterprises, users } from './auth';

/** PRD §9.8.1 / 11.5.2 · 审批流程定义，归属 Agent-Auth */
export const approvalFlows = pgTable('approval_flows', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: approvalFlowTypeEnum('type').notNull(),
  steps: jsonb('steps').notNull().$type<ApprovalStep[]>(),
  status: approvalFlowStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export interface ApprovalStep {
  step: number;
  role: string;
  userId?: number;
  condition?: {
    amount?: { gte?: number; lte?: number };
  };
}

/** PRD §9.8.1 / 11.5.2 · 审批记录/实例，归属 Agent-Auth */
export const approvalRecords = pgTable('approval_records', {
  id: serial('id').primaryKey(),
  flowId: integer('flow_id')
    .references(() => approvalFlows.id)
    .notNull(),
  businessType: varchar('business_type', { length: 50 }).notNull(),
  businessId: integer('business_id').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  remark: text('remark'),
  status: approvalRecordStatusEnum('status').default('pending').notNull(),
  currentStep: integer('current_step').default(1).notNull(),
  submittedBy: integer('submitted_by')
    .references(() => users.id)
    .notNull(),
  approvedBy: integer('approved_by').references(() => users.id),
  comment: text('comment'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** PRD §2.6.2 · 请假申请表 */
export const leaveRequests = pgTable('leave_requests', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 事假、病假、年假
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  days: decimal('days', { precision: 4, scale: 1 }).notNull(),
  reason: text('reason'),
  status: approvalRecordStatusEnum('status').default('pending').notNull(),
  approvalRecordId: integer('approval_record_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** PRD §2.6.2 · 报销申请表 */
export const expenseRequests = pgTable('expense_requests', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 差旅费、办公费、招待费等
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  attachments: jsonb('attachments').$type<string[]>(), // 凭证图片URL数组
  ocrData: jsonb('ocr_data'), // OCR识别结果
  status: approvalRecordStatusEnum('status').default('pending').notNull(),
  approvalRecordId: integer('approval_record_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** PRD §2.6.2 · 员工通讯录扩展表 */
export const employeeProfiles = pgTable('employee_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  department: varchar('department', { length: 50 }),
  position: varchar('position', { length: 50 }),
  employeeNo: varchar('employee_no', { length: 20 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  joinDate: date('join_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** 通知表 */
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  type: varchar('type', { length: 20 }).notNull(), // approval, system, reminder
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  priority: varchar('priority', { length: 20 }).default('normal').notNull(), // low, normal, high
  isRead: boolean('is_read').default(false).notNull(),
  sourceType: varchar('source_type', { length: 50 }),
  sourceId: integer('source_id'),
  actionUrl: text('action_url'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
