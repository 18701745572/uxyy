import type { SQL } from 'drizzle-orm';
import { and, eq, gt, isNotNull, lte } from 'drizzle-orm';
import * as schema from '../../../db/schema';

/** 默认：距效期剩余天数 ≤ 该值则进入「临期」预警（与批次查询默认一致，可被请求参数覆盖） */
export const DEFAULT_EXPIRY_WARNING_DAYS = 30;

/** ≤ 该剩余天数标记为 critical（便于前端标红） */
export const EXPIRY_CRITICAL_DAYS = 7;

export type ExpirySeverity = 'expired' | 'critical' | 'warning';

export function classifyExpirySeverity(daysUntilExpiry: number): ExpirySeverity {
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= EXPIRY_CRITICAL_DAYS) return 'critical';
  return 'warning';
}

export function ceilDaysUntil(expiresAt: Date, from: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil(
    (expiresAt.getTime() - from.getTime()) / msPerDay,
  );
}

function expiryWindowEnd(warningDays: number): Date {
  const warnEnd = new Date();
  warnEnd.setDate(
    warnEnd.getDate() + Math.max(1, Math.min(warningDays, 730)),
  );
  return warnEnd;
}

/** 结存>0、有效日期非空、效期 ≤ 当前+窗口（含已过期） */
export function inventoryExpiryRowPredicates(warningDays: number): SQL[] {
  const warnEnd = expiryWindowEnd(warningDays);
  return [
    gt(schema.inventory.quantity, '0'),
    isNotNull(schema.inventory.expiryDate),
    lte(schema.inventory.expiryDate, warnEnd),
  ];
}

export function inventoryExpiryAlertWhere(
  enterpriseId: number,
  warningDays: number,
): SQL {
  return and(
    eq(schema.inventory.enterpriseId, enterpriseId),
    ...inventoryExpiryRowPredicates(warningDays),
  )!;
}

export function batchExpiryRowPredicates(warningDays: number): SQL[] {
  const warnEnd = expiryWindowEnd(warningDays);
  return [
    gt(schema.productBatches.quantity, '0'),
    isNotNull(schema.productBatches.expiryDate),
    lte(schema.productBatches.expiryDate, warnEnd),
  ];
}

export function batchExpiryAlertWhere(
  enterpriseId: number,
  warningDays: number,
): SQL {
  return and(
    eq(schema.productBatches.enterpriseId, enterpriseId),
    ...batchExpiryRowPredicates(warningDays),
  )!;
}
