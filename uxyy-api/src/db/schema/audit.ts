import { index, integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { enterprises, users } from './auth';

/** PRD · 基础能力层：HTTP 变更类操作审计（异步落库，敏感接口不落 body） */
export const operationAuditLogs = pgTable(
  'operation_audit_logs',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id').references(() => enterprises.id),
    userId: integer('user_id').references(() => users.id),
    method: varchar('method', { length: 10 }).notNull(),
    path: varchar('path', { length: 500 }).notNull(),
    ip: varchar('ip', { length: 45 }),
    userAgent: text('user_agent'),
    requestBody: text('request_body'),
    statusCode: integer('status_code'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('op_audit_enterprise_created_idx').on(t.enterpriseId, t.createdAt),
    index('op_audit_user_created_idx').on(t.userId, t.createdAt),
  ],
);
