import { z } from 'zod';
import { paginationSchema } from './pagination';

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

export const salesOrderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  customerId: z.coerce.number().optional(),
});
export type SalesOrderQueryParams = z.infer<typeof salesOrderQuerySchema>;

export const purchaseOrderQuerySchema = paginationSchema.extend({
  status: orderStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  supplierId: z.coerce.number().optional(),
});
export type PurchaseOrderQueryParams = z.infer<
  typeof purchaseOrderQuerySchema
>;

export const inventoryLogQuerySchema = paginationSchema.extend({
  productId: z.coerce.number().optional(),
  type: inventoryLogTypeSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sourceType: inventoryLogSourceTypeSchema.optional(),
});
export type InventoryLogQueryParams = z.infer<typeof inventoryLogQuerySchema>;

export const inventoryQuerySchema = paginationSchema.extend({
  categoryId: z.coerce.number().optional(),
  keyword: z.string().optional(),
  lowStock: z.coerce.boolean().optional(),
});
export type InventoryQueryParams = z.infer<typeof inventoryQuerySchema>;
