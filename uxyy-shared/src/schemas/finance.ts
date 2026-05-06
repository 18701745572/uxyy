import { z } from 'zod';
import { paginationSchema } from './pagination.js';

// Invoice schemas
export const invoiceStatusSchema = z.enum(['unverified', 'verified', 'entered', 'void']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceTypeSchema = z.enum(['special', 'normal', 'electronic']);
export type InvoiceType = z.infer<typeof invoiceTypeSchema>;

export const invoiceSchema = z.object({
  id: z.number(),
  invoiceNo: z.string(),
  invoiceCode: z.string().optional(),
  type: invoiceTypeSchema,
  amount: z.string(),
  taxRate: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string(),
  buyerName: z.string().optional(),
  buyerTaxNo: z.string().optional(),
  sellerName: z.string().optional(),
  sellerTaxNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  status: invoiceStatusSchema,
  remark: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type InvoiceDto = z.infer<typeof invoiceSchema>;

export const invoiceListQuerySchema = paginationSchema.extend({
  status: invoiceStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type InvoiceListQueryDto = z.infer<typeof invoiceListQuerySchema>;

export const invoiceListResponseSchema = z.object({
  list: z.array(invoiceSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type InvoiceListResponseDto = z.infer<typeof invoiceListResponseSchema>;

export const createInvoiceSchema = z.object({
  invoiceNo: z.string(),
  invoiceCode: z.string().optional(),
  type: invoiceTypeSchema,
  amount: z.string(),
  taxRate: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string(),
  buyerName: z.string().optional(),
  buyerTaxNo: z.string().optional(),
  sellerName: z.string().optional(),
  sellerTaxNo: z.string().optional(),
  invoiceDate: z.string().optional(),
  remark: z.string().optional(),
});
export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = createInvoiceSchema.partial();
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>;

export const invoiceResponseSchema = invoiceSchema;
export type InvoiceResponseDto = z.infer<typeof invoiceResponseSchema>;

/** 与 Nest `POST /finance/invoices/ocr` → OcrInvoiceResponseDto 对齐 */
export const ocrInvoiceResultSchema = z.object({
  invoiceNo: z.string(),
  invoiceCode: z.string().nullable().optional(),
  type: invoiceTypeSchema,
  amount: z.string(),
  taxRate: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string(),
  buyerName: z.string().nullable().optional(),
  buyerTaxNo: z.string().nullable().optional(),
  sellerName: z.string().nullable().optional(),
  sellerTaxNo: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  ocrConfidence: z.number(),
});
export type InvoiceOcrResult = z.infer<typeof ocrInvoiceResultSchema>;

// Voucher schemas
export const voucherStatusSchema = z.enum(['draft', 'posted']);
export type VoucherStatus = z.infer<typeof voucherStatusSchema>;

export const voucherEntrySchema = z.object({
  id: z.number(),
  subjectId: z.number(),
  subjectName: z.string().optional(),
  summary: z.string(),
  debit: z.string().optional(),
  credit: z.string().optional(),
});
export type VoucherEntryDto = z.infer<typeof voucherEntrySchema>;

export const voucherSchema = z.object({
  id: z.number(),
  voucherNo: z.string(),
  voucherDate: z.string(),
  totalDebit: z.string(),
  totalCredit: z.string(),
  status: voucherStatusSchema,
  entries: z.array(voucherEntrySchema),
  remark: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VoucherDto = z.infer<typeof voucherSchema>;

export const voucherListQuerySchema = paginationSchema.extend({
  status: voucherStatusSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type VoucherListQueryDto = z.infer<typeof voucherListQuerySchema>;

export const voucherListResponseSchema = z.object({
  list: z.array(voucherSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type VoucherListResponseDto = z.infer<typeof voucherListResponseSchema>;

export const createVoucherEntrySchema = z.object({
  subjectId: z.number(),
  summary: z.string(),
  debit: z.string().optional(),
  credit: z.string().optional(),
});

export const createVoucherSchema = z.object({
  voucherDate: z.string(),
  entries: z.array(createVoucherEntrySchema),
  remark: z.string().optional(),
});
export type CreateVoucherDto = z.infer<typeof createVoucherSchema>;

export const updateVoucherSchema = z.object({
  remark: z.string().optional(),
});
export type UpdateVoucherDto = z.infer<typeof updateVoucherSchema>;

export const voucherResponseSchema = voucherSchema;
export type VoucherResponseDto = z.infer<typeof voucherResponseSchema>;

// Account Subject schemas
export const accountSubjectTypeSchema = z.enum(['asset', 'liability', 'equity', 'income', 'expense']);
export type AccountSubjectType = z.infer<typeof accountSubjectTypeSchema>;

export const accountSubjectSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  type: accountSubjectTypeSchema,
  parentId: z.number().optional(),
  balance: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AccountSubjectDto = z.infer<typeof accountSubjectSchema>;

export const createAccountSubjectSchema = z.object({
  code: z.string(),
  name: z.string(),
  type: accountSubjectTypeSchema,
  parentId: z.number().optional(),
});
export type CreateAccountSubjectDto = z.infer<typeof createAccountSubjectSchema>;

export const updateAccountSubjectSchema = createAccountSubjectSchema.partial();
export type UpdateAccountSubjectDto = z.infer<typeof updateAccountSubjectSchema>;
