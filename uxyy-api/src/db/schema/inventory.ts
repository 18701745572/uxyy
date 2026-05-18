import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

import { enterprises, users } from './auth';
import { customers, memberLevels } from './crm';
import { orderStatusEnum } from './enums';

// ==================== 商品分类 ====================
export const productCategories = pgTable(
  'product_categories',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 50 }).notNull(),
    parentId: integer('parent_id').references((): any => productCategories.id),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('product_categories_enterprise_idx').on(t.enterpriseId)],
);

// ==================== 商品会员价格表 ====================
export const productMemberPrices = pgTable(
  'product_member_prices',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    levelId: integer('level_id')
      .references(() => memberLevels.id)
      .notNull(),
    price: decimal('price', { precision: 12, scale: 2 }).notNull(),
    discountRate: decimal('discount_rate', { precision: 5, scale: 2 }).default(
      '100',
    ), // 折扣率
    isEnabled: boolean('is_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('product_member_prices_enterprise_idx').on(t.enterpriseId),
    index('product_member_prices_product_idx').on(t.productId),
    index('product_member_prices_level_idx').on(t.levelId),
    uniqueIndex('product_member_prices_product_level_uk').on(
      t.productId,
      t.levelId,
    ),
  ],
);

// ==================== 商品管理 ====================
export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    categoryId: integer('category_id').references(() => productCategories.id),
    code: varchar('code', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    spec: varchar('spec', { length: 100 }),
    unit: varchar('unit', { length: 20 }).default('件'),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }),
    minStock: decimal('min_stock', { precision: 12, scale: 2 }).default('0'),
    maxStock: decimal('max_stock', { precision: 12, scale: 2 }),
    status: varchar('status', { length: 20 }).default('active'),
    retailExt: jsonb('retail_ext'),
    autoPartsExt: jsonb('auto_parts_ext'),
    foodExt: jsonb('food_ext'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('products_enterprise_idx').on(t.enterpriseId),
    index('products_code_idx').on(t.enterpriseId, t.code),
    index('products_category_idx').on(t.categoryId),
  ],
);

// ==================== 供应商 ====================
export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    contactName: varchar('contact_name', { length: 50 }),
    phone: varchar('phone', { length: 20 }),
    address: text('address'),
    status: varchar('status', { length: 20 }).default('active'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('suppliers_enterprise_idx').on(t.enterpriseId)],
);

// ==================== 销售订单 ====================
export const salesOrders = pgTable(
  'sales_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    discountAmount: decimal('discount_amount', {
      precision: 12,
      scale: 2,
    }).default('0'),
    payableAmount: decimal('payable_amount', {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: orderStatusEnum('status').default('draft').notNull(),
    deliveryType: varchar('delivery_type', { length: 20 }).default('self'),
    remark: text('remark'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('sales_orders_enterprise_idx').on(t.enterpriseId),
    index('sales_orders_customer_idx').on(t.customerId),
    index('sales_orders_status_idx').on(t.enterpriseId, t.status),
    index('sales_orders_created_idx').on(t.enterpriseId, t.createdAt),
  ],
);

export const salesOrderItems = pgTable(
  'sales_order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => salesOrders.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    deliveredQty: decimal('delivered_qty', { precision: 12, scale: 2 }).default(
      '0',
    ),
  },
  (t) => [
    index('sales_order_items_order_idx').on(t.orderId),
    index('sales_order_items_product_idx').on(t.productId),
  ],
);

// ==================== 采购订单 ====================
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    supplierId: integer('supplier_id')
      .references(() => suppliers.id)
      .notNull(),
    orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
    totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum('status').default('draft').notNull(),
    remark: text('remark'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('purchase_orders_enterprise_idx').on(t.enterpriseId),
    index('purchase_orders_supplier_idx').on(t.supplierId),
    index('purchase_orders_status_idx').on(t.enterpriseId, t.status),
  ],
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => purchaseOrders.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    receivedQty: decimal('received_qty', { precision: 12, scale: 2 }).default(
      '0',
    ),
  },
  (t) => [
    index('purchase_order_items_order_idx').on(t.orderId),
    index('purchase_order_items_product_idx').on(t.productId),
  ],
);

// ==================== 库存管理 ====================
export const inventory = pgTable(
  'inventory',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    warehouseId: integer('warehouse_id').default(1),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    batchNo: varchar('batch_no', { length: 50 }),
    expiryDate: timestamp('expiry_date'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('inventory_product_enterprise_uk').on(
      t.enterpriseId,
      t.productId,
    ),
    index('inventory_product_idx').on(t.productId),
    index('inventory_enterprise_idx').on(t.enterpriseId),
  ],
);

// ==================== 库存流水 ====================
export const inventoryLogs = pgTable(
  'inventory_logs',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    type: varchar('type', { length: 20 }).notNull(),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    beforeQty: decimal('before_qty', { precision: 12, scale: 2 }).notNull(),
    afterQty: decimal('after_qty', { precision: 12, scale: 2 }).notNull(),
    sourceType: varchar('source_type', { length: 20 }),
    sourceId: integer('source_id'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('inventory_logs_product_idx').on(t.enterpriseId, t.productId),
    index('inventory_logs_created_idx').on(t.enterpriseId, t.createdAt),
    index('inventory_logs_source_idx').on(t.sourceType, t.sourceId),
  ],
);

// ==================== 盘点单 ====================
export const stocktakingOrders = pgTable(
  'stocktaking_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    warehouseId: integer('warehouse_id').default(1),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    remark: text('remark'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    confirmedBy: integer('confirmed_by').references(() => users.id),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('stocktaking_orders_enterprise_idx').on(t.enterpriseId),
    index('stocktaking_orders_status_idx').on(t.enterpriseId, t.status),
  ],
);

export const stocktakingItems = pgTable(
  'stocktaking_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => stocktakingOrders.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    bookQty: decimal('book_qty', { precision: 12, scale: 2 }).notNull(),
    actualQty: decimal('actual_qty', { precision: 12, scale: 2 }),
    diffQty: decimal('diff_qty', { precision: 12, scale: 2 }),
    remark: text('remark'),
  },
  (t) => [
    index('stocktaking_items_order_idx').on(t.orderId),
    index('stocktaking_items_product_idx').on(t.productId),
  ],
);

// ==================== 销售出库单 ====================
export const salesOutboundOrders = pgTable(
  'sales_outbound_orders',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    orderId: integer('order_id')
      .references(() => salesOrders.id)
      .notNull(),
    orderNo: varchar('order_no', { length: 50 }).notNull().unique(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    customerName: varchar('customer_name', { length: 100 }).notNull(),
    warehouseId: integer('warehouse_id').default(1),
    status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, confirmed
    remark: text('remark'),
    createdBy: integer('created_by')
      .references(() => users.id)
      .notNull(),
    confirmedBy: integer('confirmed_by').references(() => users.id),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('sales_outbound_orders_enterprise_idx').on(t.enterpriseId),
    index('sales_outbound_orders_order_idx').on(t.orderId),
    index('sales_outbound_orders_status_idx').on(t.enterpriseId, t.status),
  ],
);

export const salesOutboundItems = pgTable(
  'sales_outbound_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => salesOutboundOrders.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    productName: varchar('product_name', { length: 100 }).notNull(),
    productCode: varchar('product_code', { length: 50 }).notNull(),
    unit: varchar('unit', { length: 20 }).default('件'),
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    batchNo: varchar('batch_no', { length: 50 }),
  },
  (t) => [
    index('sales_outbound_items_order_idx').on(t.orderId),
    index('sales_outbound_items_product_idx').on(t.productId),
  ],
);

// ==================== 回款记录 ====================
export const paymentRecords = pgTable(
  'payment_records',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    customerId: integer('customer_id')
      .references(() => customers.id)
      .notNull(),
    orderId: integer('order_id').references(() => salesOrders.id),
    orderNo: varchar('order_no', { length: 50 }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // cash, bank, alipay, wechat
    paymentDate: timestamp('payment_date').defaultNow().notNull(),
    referenceNo: varchar('reference_no', { length: 50 }), // 银行流水号/支付单号
    remark: text('remark'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('payment_records_enterprise_idx').on(t.enterpriseId),
    index('payment_records_customer_idx').on(t.customerId),
    index('payment_records_order_idx').on(t.orderId),
    index('payment_records_date_idx').on(t.paymentDate),
  ],
);

// ==================== 供应商付款记录 ====================
export const supplierPayments = pgTable(
  'supplier_payments',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    supplierId: integer('supplier_id')
      .references(() => suppliers.id)
      .notNull(),
    orderId: integer('order_id').references(() => purchaseOrders.id),
    orderNo: varchar('order_no', { length: 50 }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar('payment_method', { length: 20 }).notNull(), // cash, bank, alipay, wechat
    paymentDate: timestamp('payment_date').defaultNow().notNull(),
    referenceNo: varchar('reference_no', { length: 50 }), // 银行流水号/支付单号
    remark: text('remark'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('supplier_payments_enterprise_idx').on(t.enterpriseId),
    index('supplier_payments_supplier_idx').on(t.supplierId),
    index('supplier_payments_order_idx').on(t.orderId),
    index('supplier_payments_date_idx').on(t.paymentDate),
  ],
);

// ==================== 批次管理 ====================
export const productBatches = pgTable(
  'product_batches',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    batchNo: varchar('batch_no', { length: 50 }).notNull(), // 批次号
    productionDate: timestamp('production_date'), // 生产日期
    expiryDate: timestamp('expiry_date'), // 有效期至
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(), // 当前库存数量
    initialQuantity: decimal('initial_quantity', {
      precision: 12,
      scale: 2,
    }).notNull(), // 初始入库数量
    costPrice: decimal('cost_price', { precision: 12, scale: 2 }), // 成本价
    supplierId: integer('supplier_id').references(() => suppliers.id), // 供应商
    warehouseId: integer('warehouse_id').default(1), // 仓库
    sourceType: varchar('source_type', { length: 20 }), // 来源：purchase, transfer
    sourceId: integer('source_id'), // 来源ID
    status: varchar('status', { length: 20 }).default('active').notNull(), // active, locked, expired
    remark: text('remark'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('product_batches_enterprise_idx').on(t.enterpriseId),
    index('product_batches_product_idx').on(t.productId),
    index('product_batches_batch_no_idx').on(t.batchNo),
    index('product_batches_expiry_idx').on(t.expiryDate),
    index('product_batches_status_idx').on(t.status),
  ],
);

// ==================== 批次流水 ====================
export const batchLogs = pgTable(
  'batch_logs',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    batchId: integer('batch_id')
      .references(() => productBatches.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    type: varchar('type', { length: 20 }).notNull(), // in, out
    quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
    beforeQty: decimal('before_qty', { precision: 12, scale: 2 }).notNull(),
    afterQty: decimal('after_qty', { precision: 12, scale: 2 }).notNull(),
    sourceType: varchar('source_type', { length: 20 }), // sales_order, purchase_order, stocktaking
    sourceId: integer('source_id'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('batch_logs_batch_idx').on(t.batchId),
    index('batch_logs_product_idx').on(t.productId),
    index('batch_logs_created_idx').on(t.createdAt),
  ],
);

// ==================== 关系定义 ====================
export const productsRelations = relations(products, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [products.enterpriseId],
    references: [enterprises.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  inventory: many(inventory),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    parent: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
    }),
    children: many(productCategories),
  }),
);

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [salesOrders.enterpriseId],
    references: [enterprises.id],
  }),
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  createdByUser: one(users, {
    fields: [salesOrders.createdBy],
    references: [users.id],
  }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(
  salesOrderItems,
  ({ one }) => ({
    order: one(salesOrders, {
      fields: [salesOrderItems.orderId],
      references: [salesOrders.id],
    }),
    product: one(products, {
      fields: [salesOrderItems.productId],
      references: [products.id],
    }),
  }),
);

export const purchaseOrdersRelations = relations(
  purchaseOrders,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [purchaseOrders.enterpriseId],
      references: [enterprises.id],
    }),
    supplier: one(suppliers, {
      fields: [purchaseOrders.supplierId],
      references: [suppliers.id],
    }),
    createdByUser: one(users, {
      fields: [purchaseOrders.createdBy],
      references: [users.id],
    }),
    items: many(purchaseOrderItems),
  }),
);

export const purchaseOrderItemsRelations = relations(
  purchaseOrderItems,
  ({ one }) => ({
    order: one(purchaseOrders, {
      fields: [purchaseOrderItems.orderId],
      references: [purchaseOrders.id],
    }),
    product: one(products, {
      fields: [purchaseOrderItems.productId],
      references: [products.id],
    }),
  }),
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [inventory.enterpriseId],
    references: [enterprises.id],
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [inventoryLogs.enterpriseId],
    references: [enterprises.id],
  }),
  product: one(products, {
    fields: [inventoryLogs.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [inventoryLogs.createdBy],
    references: [users.id],
  }),
}));

export const stocktakingOrdersRelations = relations(
  stocktakingOrders,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [stocktakingOrders.enterpriseId],
      references: [enterprises.id],
    }),
    createdByUser: one(users, {
      fields: [stocktakingOrders.createdBy],
      references: [users.id],
    }),
    confirmedByUser: one(users, {
      fields: [stocktakingOrders.confirmedBy],
      references: [users.id],
    }),
    items: many(stocktakingItems),
  }),
);

export const stocktakingItemsRelations = relations(
  stocktakingItems,
  ({ one }) => ({
    order: one(stocktakingOrders, {
      fields: [stocktakingItems.orderId],
      references: [stocktakingOrders.id],
    }),
    product: one(products, {
      fields: [stocktakingItems.productId],
      references: [products.id],
    }),
  }),
);

// ==================== 仓库管理 ====================
export const warehouses = pgTable(
  'warehouses',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }),
    address: text('address'),
    managerId: integer('manager_id').references(() => users.id),
    phone: varchar('phone', { length: 20 }),
    isDefault: boolean('is_default').default(false),
    status: varchar('status', { length: 20 }).default('active'),
    remark: text('remark'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('warehouses_enterprise_idx').on(t.enterpriseId),
    index('warehouses_status_idx').on(t.status),
  ],
);

export const warehousesRelations = relations(warehouses, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [warehouses.enterpriseId],
    references: [enterprises.id],
  }),
  manager: one(users, {
    fields: [warehouses.managerId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [warehouses.createdBy],
    references: [users.id],
  }),
}));

// ==================== 库存预警 ====================
export const stockAlerts = pgTable(
  'stock_alerts',
  {
    id: serial('id').primaryKey(),
    enterpriseId: integer('enterprise_id')
      .references(() => enterprises.id)
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id)
      .notNull(),
    type: varchar('type', { length: 20 }).notNull(), // low, high, expiry_warn, expiry_expired
    currentStock: decimal('current_stock', {
      precision: 12,
      scale: 2,
    }).notNull(),
    threshold: decimal('threshold', { precision: 12, scale: 2 }).notNull(),
    status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, read, resolved
    remark: text('remark'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('stock_alerts_enterprise_idx').on(t.enterpriseId),
    index('stock_alerts_product_idx').on(t.productId),
    index('stock_alerts_type_idx').on(t.type),
    index('stock_alerts_status_idx').on(t.status),
    index('stock_alerts_created_idx').on(t.createdAt),
  ],
);

export const stockAlertsRelations = relations(stockAlerts, ({ one }) => ({
  enterprise: one(enterprises, {
    fields: [stockAlerts.enterpriseId],
    references: [enterprises.id],
  }),
  product: one(products, {
    fields: [stockAlerts.productId],
    references: [products.id],
  }),
}));
