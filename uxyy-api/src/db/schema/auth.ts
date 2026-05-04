import {
  boolean,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { enterpriseStatusEnum, userStatusEnum } from './enums';

/** PRD §8.2 / 11.5.2 · Agent-Auth 拥表 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  phone: varchar('phone', { length: 20 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 50 }),
  avatar: varchar('avatar', { length: 255 }),
  status: userStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** PRD §8.2 / 11.5.2 */
export const enterprises = pgTable('enterprises', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id')
    .references(() => users.id)
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  industry: varchar('industry', { length: 50 }),
  status: enterpriseStatusEnum('status').default('active').notNull(),
  maxUsers: integer('max_users').default(3),
  maxOrdersPerMonth: integer('max_orders_per_month').default(500),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** PRD §8.2 / 11.5.2 · 成员关系与 enterprise 内角色别名（与 `roles` 表可后续由 Auth 统一） */
export const userEnterprises = pgTable('user_enterprises', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  isDefault: boolean('is_default').default(false),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

/**
 * PRD 11.5.2 角色目录表（初版仅结构；与 `user_enterprises.role` 的字符串约定可后续对齐为 FK 或种子数据）
 */
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
