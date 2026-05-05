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

export const orderStatusEnum = pgEnum('order_status', [
  'draft',
  'pending',
  'approved',
  'completed',
  'cancelled',
]);
