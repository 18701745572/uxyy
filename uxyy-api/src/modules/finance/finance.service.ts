import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { count, desc, eq, and, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问财务数据');
  }
  return enterpriseId;
}

export interface CreateInvoiceDto {
  type: 'in' | 'out';
  amount: number;
  title: string;
  taxNo?: string;
  address?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  remark?: string;
}

export interface CreateVoucherDto {
  voucherDate: string;
  entries: Array<{
    subjectId: number;
    debit?: number;
    credit?: number;
    summary?: string;
  }>;
  remark?: string;
}

@Injectable()
export class FinanceService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ========== 发票管理 ==========
  async findInvoicesPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    type?: 'in' | 'out';
    startDate?: string;
    endDate?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.invoices.enterpriseId, eid);
    if (params.type) {
      whereClause = and(whereClause, eq(schema.invoices.type, params.type))!;
    }
    if (params.startDate) {
      whereClause = and(whereClause, gte(schema.invoices.createdAt, new Date(params.startDate)))!;
    }
    if (params.endDate) {
      whereClause = and(whereClause, lte(schema.invoices.createdAt, new Date(params.endDate)))!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.invoices)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.invoices)
      .where(whereClause)
      .orderBy(desc(schema.invoices.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: Number(r.amount),
        title: r.title,
        taxNo: r.taxNo,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createInvoice(enterpriseId: number | undefined, dto: CreateInvoiceDto) {
    const eid = requireEnterpriseId(enterpriseId);

    const [invoice] = await this.db
      .insert(schema.invoices)
      .values({
        enterpriseId: eid,
        type: dto.type,
        amount: String(dto.amount),
        title: dto.title,
        taxNo: dto.taxNo ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        bankName: dto.bankName ?? null,
        bankAccount: dto.bankAccount ?? null,
        remark: dto.remark ?? null,
      })
      .returning();

    return invoice;
  }

  // ========== 会计科目 ==========
  async getAccountSubjects(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const rows = await this.db
      .select()
      .from(schema.accountSubjects)
      .where(eq(schema.accountSubjects.enterpriseId, eid))
      .orderBy(schema.accountSubjects.code);

    return rows;
  }

  // ========== 凭证管理 ==========
  async findVouchersPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    let whereClause = eq(schema.vouchers.enterpriseId, eid);
    if (params.startDate) {
      whereClause = and(whereClause, gte(schema.vouchers.voucherDate, new Date(params.startDate)))!;
    }
    if (params.endDate) {
      whereClause = and(whereClause, lte(schema.vouchers.voucherDate, new Date(params.endDate)))!;
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.vouchers)
      .where(whereClause);

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.vouchers)
      .where(whereClause)
      .orderBy(desc(schema.vouchers.voucherDate))
      .limit(params.pageSize)
      .offset(offset);

    return {
      list: rows.map((r) => ({
        id: r.id,
        voucherNo: r.voucherNo,
        voucherDate: r.voucherDate.toISOString(),
        totalDebit: Number(r.totalDebit),
        totalCredit: Number(r.totalCredit),
        remark: r.remark,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createVoucher(enterpriseId: number | undefined, dto: CreateVoucherDto) {
    const eid = requireEnterpriseId(enterpriseId);

    // 生成凭证号
    const voucherNo = `V${Date.now()}`;
    const totalDebit = dto.entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = dto.entries.reduce((sum, e) => sum + (e.credit || 0), 0);

    const [voucher] = await this.db
      .insert(schema.vouchers)
      .values({
        enterpriseId: eid,
        voucherNo,
        voucherDate: new Date(dto.voucherDate),
        totalDebit: String(totalDebit),
        totalCredit: String(totalCredit),
        remark: dto.remark ?? null,
      })
      .returning();

    return voucher;
  }

  // ========== 财务报表 ==========
  async getBalanceSheet(enterpriseId: number | undefined, date: string) {
    const eid = requireEnterpriseId(enterpriseId);

    // 简化实现，返回模拟数据
    return {
      date,
      assets: [
        { subject: '现金', amount: 100000 },
        { subject: '银行存款', amount: 500000 },
        { subject: '应收账款', amount: 200000 },
      ],
      liabilities: [
        { subject: '应付账款', amount: 150000 },
        { subject: '应付工资', amount: 50000 },
      ],
      equity: [
        { subject: '实收资本', amount: 600000 },
      ],
    };
  }

  async getIncomeStatement(enterpriseId: number | undefined, startDate: string, endDate: string) {
    const eid = requireEnterpriseId(enterpriseId);

    // 简化实现，返回模拟数据
    return {
      startDate,
      endDate,
      revenue: 1000000,
      cost: 600000,
      grossProfit: 400000,
      expenses: 200000,
      netProfit: 200000,
    };
  }

  async getCashFlow(enterpriseId: number | undefined, startDate: string, endDate: string) {
    const eid = requireEnterpriseId(enterpriseId);

    // 简化实现，返回模拟数据
    return {
      startDate,
      endDate,
      operatingInflow: 800000,
      operatingOutflow: 500000,
      investingInflow: 0,
      investingOutflow: 100000,
      financingInflow: 200000,
      financingOutflow: 0,
      netIncrease: 400000,
    };
  }

  // ========== 应收应付 ==========
  async getReceivables(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 简化实现，返回模拟数据
    return {
      total: 200000,
      list: [
        { customerId: 1, customerName: '客户A', amount: 100000, dueDate: '2026-06-01' },
        { customerId: 2, customerName: '客户B', amount: 100000, dueDate: '2026-06-15' },
      ],
    };
  }

  async getPayables(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 简化实现，返回模拟数据
    return {
      total: 150000,
      list: [
        { supplierId: 1, supplierName: '供应商A', amount: 80000, dueDate: '2026-06-01' },
        { supplierId: 2, supplierName: '供应商B', amount: 70000, dueDate: '2026-06-10' },
      ],
    };
  }
}
