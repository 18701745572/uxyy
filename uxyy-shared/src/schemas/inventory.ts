import { z } from 'zod';
import { paginationSchema } from './pagination.js';

export const orderStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'completed',
  'cancelled',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const inventoryLogTypeSchema = z.enum(['in', 'out', 'adjust', 'check']);
export type InventoryLogType = z.infer<typeof inventoryLogTypeSchema>;

export const inventoryLogSourceTypeSchema = z.enum([
  'sales_order',
  'purchase_order',
  'adjust',
  'stocktaking',
]);
export type InventoryLogSourceType = z.infer<
  typeof inventoryLogSourceTypeSchema
>;

export const productStatusSchema = z.enum(['active', 'inactive']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

// Product schemas
export const productSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  spec: z.string().optional(),
  unit: z.string(),
  unitPrice: z.number(),
  costPrice: z.number().optional(),
  minStock: z.number().optional(),
  maxStock: z.number().optional(),
  currentStock: z.number().optional(),
  status: productStatusSchema,
  categoryId: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProductDto = z.infer<typeof productSchema>;

export const productListQuerySchema = paginationSchema.extend({
  categoryId: z.coerce.number().optional(),
  keyword: z.string().optional(),
});
export type ProductListQueryDto = z.infer<typeof productListQuerySchema>;

export const productListResponseSchema = z.object({
  list: z.array(productSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type ProductListResponseDto = z.infer<typeof productListResponseSchema>;

export const createProductSchema = z.object({
  code: z.string(),
  name: z.string(),
  spec: z.string().optional(),
  unit: z.string().optional(),
  unitPrice: z.number(),
  costPrice: z.number().optional(),
  minStock: z.number().optional(),
  maxStock: z.number().optional(),
  categoryId: z.number().optional(),
  status: z.string().optional(),
});
export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductDto = z.infer<typeof updateProductSchema>;

export const productResponseSchema = productSchema;
export type ProductResponseDto = z.infer<typeof productResponseSchema>;

// Purchase Order schemas
export const purchaseOrderItemSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productName: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
  receivedQty: z.number().optional(),
});
export type PurchaseOrderItemDto = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  id: z.number(),
  orderNo: z.string(),
  supplierId: z.number(),
  supplierName: z.string().optional(),
  totalAmount: z.number(),
  status: orderStatusSchema,
  remark: z.string().optional(),
  items: z.array(purchaseOrderItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PurchaseOrderDto = z.infer<typeof purchaseOrderSchema>;

export const purchaseOrderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  supplierId: z.coerce.number().optional(),
});
export type PurchaseOrderQueryDto = z.infer<typeof purchaseOrderQuerySchema>;

export const purchaseOrderListResponseSchema = z.object({
  list: z.array(purchaseOrderSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type PurchaseOrderListResponseDto = z.infer<typeof purchaseOrderListResponseSchema>;

export const createPurchaseOrderItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.number(),
  remark: z.string().optional(),
  items: z.array(createPurchaseOrderItemSchema),
});
export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>;

export const updatePurchaseOrderSchema = z.object({
  remark: z.string().optional(),
});
export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>;

export const purchaseOrderResponseSchema = purchaseOrderSchema;
export type PurchaseOrderResponseDto = z.infer<typeof purchaseOrderResponseSchema>;

// Sales Order schemas
export const salesOrderItemSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productName: z.string().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
  deliveredQty: z.number().optional(),
});
export type SalesOrderItemDto = z.infer<typeof salesOrderItemSchema>;

// Supplier schemas
export const supplierSchema = z.object({
  id: z.number(),
  enterpriseId: z.number(),
  name: z.string(),
  contactName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SupplierDto = z.infer<typeof supplierSchema>;

export const supplierListQuerySchema = paginationSchema;
export type SupplierListQueryDto = z.infer<typeof supplierListQuerySchema>;

export const supplierListResponseSchema = z.object({
  items: z.array(supplierSchema),
  total: z.number(),
});
export type SupplierListResponseDto = z.infer<typeof supplierListResponseSchema>;

export const createSupplierSchema = z.object({
  name: z.string(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.string().optional(),
});
export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierDto = z.infer<typeof updateSupplierSchema>;

export const supplierResponseSchema = supplierSchema;
export type SupplierResponseDto = z.infer<typeof supplierResponseSchema>;

// Stocktaking schemas
export const stocktakingStatusSchema = z.enum(['draft', 'confirmed']);
export type StocktakingStatus = z.infer<typeof stocktakingStatusSchema>;

export const stocktakingItemSchema = z.object({
  id: z.number(),
  stocktakingId: z.number(),
  productId: z.number(),
  productName: z.string().optional(),
  systemQty: z.number(),
  actualQty: z.number(),
  difference: z.number(),
  remark: z.string().optional(),
});
export type StocktakingItemDto = z.infer<typeof stocktakingItemSchema>;

export const stocktakingSchema = z.object({
  id: z.number(),
  stocktakingNo: z.string(),
  warehouseId: z.number(),
  status: stocktakingStatusSchema,
  remark: z.string().optional(),
  items: z.array(stocktakingItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StocktakingDto = z.infer<typeof stocktakingSchema>;

export const stocktakingListQuerySchema = paginationSchema.extend({
  status: stocktakingStatusSchema.optional(),
});
export type StocktakingListQueryDto = z.infer<typeof stocktakingListQuerySchema>;

export const stocktakingListResponseSchema = z.object({
  list: z.array(stocktakingSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type StocktakingListResponseDto = z.infer<typeof stocktakingListResponseSchema>;

export const createStocktakingSchema = z.object({
  warehouseId: z.number().optional(),
  productIds: z.array(z.number()).optional(),
  remark: z.string().optional(),
});
export type CreateStocktakingDto = z.infer<typeof createStocktakingSchema>;

export const updateStocktakingItemSchema = z.object({
  actualQty: z.number(),
  remark: z.string().optional(),
});
export type UpdateStocktakingItemDto = z.infer<typeof updateStocktakingItemSchema>;

export const salesOrderSchema = z.object({
  id: z.number(),
  orderNo: z.string(),
  customerId: z.number(),
  customerName: z.string().optional(),
  totalAmount: z.number(),
  status: orderStatusSchema,
  remark: z.string().optional(),
  items: z.array(salesOrderItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SalesOrderDto = z.infer<typeof salesOrderSchema>;

export const salesOrderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().optional(),
});
export type SalesOrderQueryDto = z.infer<typeof salesOrderQuerySchema>;

export const salesOrderListResponseSchema = z.object({
  list: z.array(salesOrderSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type SalesOrderListResponseDto = z.infer<typeof salesOrderListResponseSchema>;

export const createSalesOrderItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const createSalesOrderSchema = z.object({
  customerId: z.number(),
  remark: z.string().optional(),
  items: z.array(createSalesOrderItemSchema),
});
export type CreateSalesOrderDto = z.infer<typeof createSalesOrderSchema>;

export const updateSalesOrderSchema = z.object({
  remark: z.string().optional(),
});
export type UpdateSalesOrderDto = z.infer<typeof updateSalesOrderSchema>;

export const salesOrderResponseSchema = salesOrderSchema;
export type SalesOrderResponseDto = z.infer<typeof salesOrderResponseSchema>;

// Inventory Log schemas
export const inventoryLogSchema = z.object({
  id: z.number(),
  productId: z.number(),
  productName: z.string().optional(),
  type: inventoryLogTypeSchema,
  quantity: z.number(),
  beforeQty: z.number(),
  afterQty: z.number(),
  sourceType: inventoryLogSourceTypeSchema,
  sourceId: z.number().optional(),
  remark: z.string().optional(),
  createdAt: z.string(),
});

export const inventoryLogQuerySchema = paginationSchema.extend({
  productId: z.coerce.number().optional(),
  type: inventoryLogTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sourceType: inventoryLogSourceTypeSchema.optional(),
});
export type InventoryLogQueryParams = z.infer<typeof inventoryLogQuerySchema>;
