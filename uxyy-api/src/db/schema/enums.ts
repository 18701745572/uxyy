import { pgEnum } from 'drizzle-orm/pg-core';

/** 与 PRD §8.2 一致；业务域枚举在各自 migration 中演进 */
export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'banned',
]);

export const enterpriseStatusEnum = pgEnum('enterprise_status', [
  'active',
  'suspended',
  'deleted',
]);

export const approvalFlowTypeEnum = pgEnum('approval_flow_type', [
  'purchase',
  'sales',
  'reimbursement',
  'leave',
]);

export const approvalFlowStatusEnum = pgEnum('approval_flow_status', [
  'active',
  'inactive',
]);

export const approvalRecordStatusEnum = pgEnum('approval_record_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'pending',
  'approved',
  'completed',
  'cancelled',
]);

/** 发票类型 — PRD §8.2 */
export const invoiceTypeEnum = pgEnum('invoice_type', [
  'special',
  'normal',
  'electronic',
]);

/** 发票状态 — PRD §8.2 */
export const invoiceStatusEnum = pgEnum('invoice_status', [
  'unverified',
  'verified',
  'entered',
  'void',
]);

/** 科目余额方向 */
export const balanceDirectionEnum = pgEnum('balance_direction', [
  'debit',
  'credit',
]);
