import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { enterprises } from './auth';

export const backupConfigs = pgTable('backup_configs', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  autoBackup: boolean('auto_backup').default(true),
  backupFrequency: varchar('backup_frequency', { length: 20 }).default('daily'),
  backupTime: varchar('backup_time', { length: 10 }).default('02:00'),
  retentionDays: integer('retention_days').default(30),
  includeFiles: boolean('include_files').default(false),
  encryptionEnabled: boolean('encryption_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const backupRecords = pgTable('backup_records', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  backupType: varchar('backup_type', { length: 20 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  filePath: varchar('file_path', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  status: varchar('status', { length: 20 }).default('completed').notNull(),
  checksum: varchar('checksum', { length: 64 }),
  metadata: jsonb('metadata'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
