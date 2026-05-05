import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core';
import { enterprises, users } from './auth';
import { aiTaskStatusEnum } from './enums';

export const aiTasks = pgTable(
  'ai_tasks',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id)
      .notNull(),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    clientKey: varchar('client_key', { length: 255 }),
    status: aiTaskStatusEnum('status').default('pending').notNull(),
    inputPayload: jsonb('input_payload'),
    outputPayload: jsonb('output_payload'),
    errorMessage: text('error_message'),
    attempts: integer('attempts').default(0),
    maxAttempts: integer('max_attempts').default(3),
    jobId: varchar('job_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('ai_tasks_enterprise_idx').on(t.enterpriseId),
    index('ai_tasks_status_idx').on(t.status),
    index('ai_tasks_type_idx').on(t.taskType),
    unique('ai_tasks_idempotent_key').on(
      t.enterpriseId,
      t.taskType,
      t.clientKey,
    ),
  ],
);
