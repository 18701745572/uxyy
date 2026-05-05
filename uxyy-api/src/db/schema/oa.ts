import {
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
