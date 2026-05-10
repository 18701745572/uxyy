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

/** PRD §8.2 / 11.5.2 · 创建企业时的主账号用户 id（与成员「老板」角色的规范码 boss 语义相关，但并非 role 枚举本身） */
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

/** PRD §8.2 / 11.5.2 · 成员在企业内的角色；仅存五种规范码（库表 CHECK 校验），请勿写入 owner/admin 等别名 */
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

/** 租户成员邀请：未注册可走受限注册并入会；已注册走接受邀请并入会（PRD §9.26 / 链路统一） */
export const enterpriseInvitations = pgTable('enterprise_invitations', {
  id: serial('id').primaryKey(),
  enterpriseId: integer('enterprise_id')
    .references(() => enterprises.id)
    .notNull(),
  inviteePhone: varchar('invitee_phone', { length: 20 }).notNull(),
  presetRole: varchar('preset_role', { length: 20 }).notNull(),
  inviterUserId: integer('inviter_user_id')
    .references(() => users.id)
    .notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  acceptedUserId: integer('accepted_user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
