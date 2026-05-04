import {
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

import { enterprises } from './auth';

/** PRD 11.5.2 · products 归属 Agent-Inventory */
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    code: varchar('code', { length: 50 }),
    category: varchar('category', { length: 50 }),
    unit: varchar('unit', { length: 20 }).default('件'),
    price: numeric('price', { precision: 12, scale: 2 }).default('0'),
    cost: numeric('cost', { precision: 12, scale: 2 }).default('0'),
    stock: integer('stock').default(0),
    minStock: integer('min_stock').default(0),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('products_enterprise_id_idx').on(t.enterpriseId),
    index('products_category_idx').on(t.category),
  ],
);

/** 采购订单表 */
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    supplierId: integer('supplier_id'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default(
      '0',
    ),
    status: varchar('status', { length: 20 }).default('pending'),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('purchase_orders_enterprise_id_idx').on(t.enterpriseId)],
);

/** 销售订单表 */
export const salesOrders = pgTable(
  'sales_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    orderNo: varchar('order_no', { length: 50 }).notNull(),
    customerId: integer('customer_id'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default(
      '0',
    ),
    status: varchar('status', { length: 20 }).default('pending'),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('sales_orders_enterprise_id_idx').on(t.enterpriseId)],
);

/** 库存流水表 */
export const inventoryLogs = pgTable(
  'inventory_logs',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id').notNull(),
    type: varchar('type', { length: 20 }).notNull(), // in/out
    quantity: integer('quantity').notNull(),
    beforeStock: integer('before_stock').notNull(),
    afterStock: integer('after_stock').notNull(),
    orderId: integer('order_id'),
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('inventory_logs_enterprise_id_idx').on(t.enterpriseId)],
);
