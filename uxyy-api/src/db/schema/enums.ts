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
