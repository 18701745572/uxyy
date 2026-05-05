import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import type {
  CreateAccountSubjectDto,
  UpdateAccountSubjectDto,
} from './dto/account-subject.dto';
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import type { CreateVoucherDto } from './dto/voucher.dto';

// ==================== 工具函数 ====================

function requireEnterpriseId(enterpriseId: number | undefined): number {
  if (enterpriseId == null || Number.isNaN(enterpriseId)) {
    throw new ForbiddenException('当前会话未绑定企业，无法访问财务数据');
  }
  return enterpriseId;
}

function decimalToAmount(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toFixed(2);
  return '0.00';
}

function dateToIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
}

// ==================== 发票映射 ====================

function mapInvoiceRow(row: typeof schema.invoices.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    invoiceNo: row.invoiceNo,
    invoiceCode: row.invoiceCode ?? null,
    type: row.type,
    amount: decimalToAmount(row.amount),
    taxRate: decimalToAmount(row.taxRate ?? '0'),
    taxAmount: decimalToAmount(row.taxAmount ?? '0'),
    totalAmount: decimalToAmount(row.totalAmount),
    buyerName: row.buyerName ?? null,
    buyerTaxNo: row.buyerTaxNo ?? null,
    sellerName: row.sellerName ?? null,
    sellerTaxNo: row.sellerTaxNo ?? null,
    issueDate: dateToIso(row.issueDate),
    status: row.status,
    ocrData: row.ocrData ?? null,
    sourceType: row.sourceType ?? null,
    sourceId: row.sourceId ?? null,
    createdBy: row.createdBy ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ==================== 凭证映射 ====================

function mapVoucherRow(row: typeof schema.voucherEntries.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    voucherNo: row.voucherNo,
    sourceType: row.sourceType,
    sourceId: row.sourceId ?? null,
    entryDate: row.entryDate.toISOString(),
    debitAccount: row.debitAccount,
    creditAccount: row.creditAccount,
    amount: decimalToAmount(row.amount),
    summary: row.summary ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

// ==================== 科目映射 ====================

function mapSubjectRow(row: typeof schema.accountSubjects.$inferSelect) {
  return {
    id: row.id,
    enterpriseId: row.enterpriseId,
    code: row.code,
    name: row.name,
    category: row.category,
    parentId: row.parentId ?? null,
    balanceDirection: row.balanceDirection,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

// ==================== 默认科目表 ====================

const DEFAULT_ACCOUNT_SUBJECTS = [
  // 资产类
  {
    code: '1001',
    name: '库存现金',
    category: 'asset',
    balanceDirection: 'debit' as const,
  },
  {
    code: '1002',
    name: '银行存款',
    category: 'asset',
    balanceDirection: 'debit' as const,
  },
  {
    code: '1122',
    name: '应收账款',
    category: 'asset',
    balanceDirection: 'debit' as const,
  },
  {
    code: '1405',
    name: '库存商品',
    category: 'asset',
    balanceDirection: 'debit' as const,
  },
  // 负债类
  {
    code: '2202',
    name: '应付账款',
    category: 'liability',
    balanceDirection: 'credit' as const,
  },
  {
    code: '2221',
    name: '应交税费',
    category: 'liability',
    balanceDirection: 'credit' as const,
  },
  // 权益类
  {
    code: '4001',
    name: '实收资本',
    category: 'equity',
    balanceDirection: 'credit' as const,
  },
  {
    code: '4103',
    name: '本年利润',
    category: 'equity',
    balanceDirection: 'credit' as const,
  },
  {
    code: '4104',
    name: '利润分配',
    category: 'equity',
    balanceDirection: 'credit' as const,
  },
  // 收入类
  {
    code: '6001',
    name: '主营业务收入',
    category: 'income',
    balanceDirection: 'credit' as const,
  },
  {
    code: '6051',
    name: '其他业务收入',
    category: 'income',
    balanceDirection: 'credit' as const,
  },
  // 费用类
  {
    code: '6401',
    name: '主营业务成本',
    category: 'expense',
    balanceDirection: 'debit' as const,
  },
  {
    code: '6601',
    name: '销售费用',
    category: 'expense',
    balanceDirection: 'debit' as const,
  },
  {
    code: '6602',
    name: '管理费用',
    category: 'expense',
    balanceDirection: 'debit' as const,
  },
  {
    code: '6603',
    name: '财务费用',
    category: 'expense',
    balanceDirection: 'debit' as const,
  },
];

// ==================== 凭证号生成 ====================

function generateVoucherNo(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `V${y}${m}${d}${seq}`;
}

// ==================== Service ====================

@Injectable()
export class FinanceService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  // ==================== 发票 ====================

  /** OCR 识别占位（Agent-AI 就绪后改为调用 AI 模块） */
  ocrInvoice(enterpriseId: number | undefined) {
    requireEnterpriseId(enterpriseId);
    return {
      invoiceNo: '4400123111',
      invoiceCode: '044001900211',
      type: 'special' as const,
      amount: '10000.00',
      taxRate: '13.00',
      taxAmount: '1300.00',
      totalAmount: '11300.00',
      buyerName: '某某商贸有限公司',
      buyerTaxNo: '91440100MA5xxxxxx',
      sellerName: '某某供应商有限公司',
      sellerTaxNo: '91440100MA5xxxxxx',
      issueDate: '2024-01-10',
      ocrConfidence: 0.98,
    };
  }

  async createInvoice(enterpriseId: number | undefined, dto: CreateInvoiceDto) {
    const eid = requireEnterpriseId(enterpriseId);

    // 检查发票号是否重复
    const [existing] = await this.db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, eid),
          eq(schema.invoices.invoiceNo, dto.invoiceNo),
        ),
      )
      .limit(1);
    if (existing) {
      throw new BadRequestException('发票号已存在');
    }

    const [inserted] = await this.db
      .insert(schema.invoices)
      .values({
        enterpriseId: eid,
        invoiceNo: dto.invoiceNo,
        invoiceCode: dto.invoiceCode ?? null,
        type: dto.type,
        amount: dto.amount,
        taxRate: dto.taxRate ?? '0',
        taxAmount: dto.taxAmount ?? '0',
        totalAmount: dto.totalAmount,
        buyerName: dto.buyerName ?? null,
        buyerTaxNo: dto.buyerTaxNo ?? null,
        sellerName: dto.sellerName ?? null,
        sellerTaxNo: dto.sellerTaxNo ?? null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        sourceType: dto.sourceType ?? null,
        sourceId: dto.sourceId ?? null,
        createdBy: null,
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建发票失败');
    return mapInvoiceRow(inserted);
  }

  async findInvoicePage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.invoices.enterpriseId, eid),
    ];
    if (params.status) {
      conditions.push(
        eq(
          schema.invoices.status,
          params.status as typeof schema.invoices.$inferSelect.status,
        ),
      );
    }
    if (params.startDate) {
      conditions.push(
        gte(schema.invoices.createdAt, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(lte(schema.invoices.createdAt, new Date(params.endDate)));
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.invoices)
      .where(and(...conditions));

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.invoices)
      .where(and(...conditions))
      .orderBy(desc(schema.invoices.createdAt))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapInvoiceRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findOneInvoice(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, id))
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('发票不存在');
    }
    return mapInvoiceRow(row);
  }

  async updateInvoice(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateInvoiceDto,
  ) {
    const existing = await this.findOneInvoice(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    if (existing.status !== 'unverified') {
      throw new BadRequestException('仅未验证状态的发票可修改');
    }

    const patch: Record<string, unknown> = {};
    if (dto.invoiceNo !== undefined) patch.invoiceNo = dto.invoiceNo;
    if (dto.invoiceCode !== undefined) patch.invoiceCode = dto.invoiceCode;
    if (dto.type !== undefined) patch.type = dto.type;
    if (dto.amount !== undefined) patch.amount = dto.amount;
    if (dto.taxRate !== undefined) patch.taxRate = dto.taxRate;
    if (dto.taxAmount !== undefined) patch.taxAmount = dto.taxAmount;
    if (dto.totalAmount !== undefined) patch.totalAmount = dto.totalAmount;
    if (dto.buyerName !== undefined) patch.buyerName = dto.buyerName;
    if (dto.buyerTaxNo !== undefined) patch.buyerTaxNo = dto.buyerTaxNo;
    if (dto.sellerName !== undefined) patch.sellerName = dto.sellerName;
    if (dto.sellerTaxNo !== undefined) patch.sellerTaxNo = dto.sellerTaxNo;
    if (dto.issueDate !== undefined)
      patch.issueDate = dto.issueDate ? new Date(dto.issueDate) : null;
    if (dto.sourceType !== undefined) patch.sourceType = dto.sourceType;
    if (dto.sourceId !== undefined) patch.sourceId = dto.sourceId;

    const [updated] = await this.db
      .update(schema.invoices)
      .set(patch)
      .where(
        and(eq(schema.invoices.id, id), eq(schema.invoices.enterpriseId, eid)),
      )
      .returning();

    if (!updated) throw new NotFoundException('发票不存在');
    return mapInvoiceRow(updated);
  }

  /** 验证发票 → status=verified */
  async verifyInvoice(id: number, enterpriseId: number | undefined) {
    const existing = await this.findOneInvoice(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    if (existing.status !== 'unverified') {
      throw new BadRequestException('仅未验证状态的发票可验证');
    }

    const [updated] = await this.db
      .update(schema.invoices)
      .set({ status: 'verified' })
      .where(
        and(eq(schema.invoices.id, id), eq(schema.invoices.enterpriseId, eid)),
      )
      .returning();

    if (!updated) throw new NotFoundException('发票不存在');
    return mapInvoiceRow(updated);
  }

  /** 入账 → status=entered + 自动生成凭证 */
  async enterInvoice(id: number, enterpriseId: number | undefined) {
    const existing = await this.findOneInvoice(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    if (existing.status !== 'verified') {
      throw new BadRequestException('仅已验证状态的发票可入账');
    }

    // 更新状态
    const [updated] = await this.db
      .update(schema.invoices)
      .set({ status: 'entered' })
      .where(
        and(eq(schema.invoices.id, id), eq(schema.invoices.enterpriseId, eid)),
      )
      .returning();

    if (!updated) throw new NotFoundException('发票不存在');

    // 自动生成凭证：根据发票类型匹配会计科目
    const voucherNo = generateVoucherNo();
    let debitAccount: string;
    let creditAccount: string;
    // 对用户而言：销售发票（公司作为卖方）→ 应收账款/银行存款 + 主营业务收入
    // 采购发票（公司作为买方）→ 库存商品/管理费用 + 应付账款/银行存款
    if (
      updated.type === 'special' ||
      updated.type === 'normal' ||
      updated.type === 'electronic'
    ) {
      if (updated.sourceType === 'purchase_order') {
        debitAccount = '库存商品';
        creditAccount = '银行存款';
      } else {
        debitAccount = '银行存款';
        creditAccount = '主营业务收入';
      }
    } else {
      debitAccount = '银行存款';
      creditAccount = '主营业务收入';
    }

    const summary = `发票入账：${updated.invoiceNo}${updated.buyerName ? ` 购方：${updated.buyerName}` : ''}${updated.sellerName ? ` 销方：${updated.sellerName}` : ''}`;

    const [voucher] = await this.db
      .insert(schema.voucherEntries)
      .values({
        enterpriseId: eid,
        voucherNo,
        sourceType: 'invoice',
        sourceId: updated.id,
        entryDate: new Date(),
        debitAccount,
        creditAccount,
        amount: updated.totalAmount,
        summary,
        createdBy: 0, // 系统自动生成
      })
      .returning();

    return {
      invoice: mapInvoiceRow(updated),
      voucher: voucher ? mapVoucherRow(voucher) : null,
      voucherNo,
    };
  }

  // ==================== 凭证 ====================

  async createVoucher(enterpriseId: number | undefined, dto: CreateVoucherDto) {
    const eid = requireEnterpriseId(enterpriseId);

    if (dto.debitAccount === dto.creditAccount) {
      throw new BadRequestException('借方和贷方科目不能相同');
    }

    const [inserted] = await this.db
      .insert(schema.voucherEntries)
      .values({
        enterpriseId: eid,
        voucherNo: dto.voucherNo,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId ?? null,
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        debitAccount: dto.debitAccount,
        creditAccount: dto.creditAccount,
        amount: dto.amount,
        summary: dto.summary ?? null,
        createdBy: 0,
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建凭证失败');
    return mapVoucherRow(inserted);
  }

  async findVoucherPage(params: {
    enterpriseId?: number;
    page: number;
    pageSize: number;
    startDate?: string;
    endDate?: string;
    sourceType?: string;
  }) {
    const eid = requireEnterpriseId(params.enterpriseId);
    const offset = (params.page - 1) * params.pageSize;

    const conditions: ReturnType<typeof eq>[] = [
      eq(schema.voucherEntries.enterpriseId, eid),
    ];
    if (params.sourceType) {
      conditions.push(eq(schema.voucherEntries.sourceType, params.sourceType));
    }
    if (params.startDate) {
      conditions.push(
        gte(schema.voucherEntries.entryDate, new Date(params.startDate)),
      );
    }
    if (params.endDate) {
      conditions.push(
        lte(schema.voucherEntries.entryDate, new Date(params.endDate)),
      );
    }

    const [totalRows] = await this.db
      .select({ c: count() })
      .from(schema.voucherEntries)
      .where(and(...conditions));

    const total = Number(totalRows?.c ?? 0);

    const rows = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(and(...conditions))
      .orderBy(desc(schema.voucherEntries.entryDate))
      .limit(params.pageSize)
      .offset(offset);

    return {
      items: rows.map(mapVoucherRow),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async findOneVoucher(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(eq(schema.voucherEntries.id, id))
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('凭证不存在');
    }
    return mapVoucherRow(row);
  }

  // ==================== 会计科目 ====================

  async createAccountSubject(
    enterpriseId: number | undefined,
    dto: CreateAccountSubjectDto,
  ) {
    const eid = requireEnterpriseId(enterpriseId);

    const [inserted] = await this.db
      .insert(schema.accountSubjects)
      .values({
        enterpriseId: eid,
        code: dto.code,
        name: dto.name,
        category: dto.category,
        parentId: dto.parentId ?? null,
        balanceDirection: dto.balanceDirection ?? 'debit',
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建科目失败');
    return mapSubjectRow(inserted);
  }

  async findAccountSubjects(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const rows = await this.db
      .select()
      .from(schema.accountSubjects)
      .where(
        and(
          eq(schema.accountSubjects.enterpriseId, eid),
          eq(schema.accountSubjects.isActive, true),
        ),
      )
      .orderBy(asc(schema.accountSubjects.code));

    return rows.map(mapSubjectRow);
  }

  async findOneAccountSubject(id: number, enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.accountSubjects)
      .where(eq(schema.accountSubjects.id, id))
      .limit(1);

    if (!row || row.enterpriseId !== eid) {
      throw new NotFoundException('科目不存在');
    }
    return mapSubjectRow(row);
  }

  async updateAccountSubject(
    id: number,
    enterpriseId: number | undefined,
    dto: UpdateAccountSubjectDto,
  ) {
    await this.findOneAccountSubject(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    const patch: Record<string, unknown> = {};
    if (dto.code !== undefined) patch.code = dto.code;
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.parentId !== undefined) patch.parentId = dto.parentId;
    if (dto.balanceDirection !== undefined)
      patch.balanceDirection = dto.balanceDirection;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;

    const [updated] = await this.db
      .update(schema.accountSubjects)
      .set(patch)
      .where(
        and(
          eq(schema.accountSubjects.id, id),
          eq(schema.accountSubjects.enterpriseId, eid),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('科目不存在');
    return mapSubjectRow(updated);
  }

  /** 为新企业初始化默认科目表 */
  async seedDefaultSubjects(enterpriseId: number) {
    const rows = DEFAULT_ACCOUNT_SUBJECTS.map((s) => ({
      enterpriseId,
      code: s.code,
      name: s.name,
      category: s.category,
      balanceDirection: s.balanceDirection,
    }));

    const inserted = await this.db
      .insert(schema.accountSubjects)
      .values(rows)
      .returning();

    return inserted.map(mapSubjectRow);
  }

  // ==================== 经营概览报表 ====================

  async getDashboard(
    enterpriseId: number | undefined,
    period?: string,
    date?: string,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const reportPeriod = date ?? new Date().toISOString().slice(0, 7);

    // 期间范围
    const [year, month] = reportPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 销售汇总（从凭证中按 income 类科目汇总）
    const salesRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
        cnt: count(),
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          eq(schema.voucherEntries.creditAccount, '主营业务收入'),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
        ),
      );

    const salesAmount = salesRows[0]?.total ?? '0.00';
    const salesOrderCount = Number(salesRows[0]?.cnt ?? 0);

    // 采购汇总（从凭证中按 expense 类科目汇总）
    const purchaseRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
        cnt: count(),
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          eq(schema.voucherEntries.debitAccount, '主营业务成本'),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
        ),
      );

    const purchaseAmount = purchaseRows[0]?.total ?? '0.00';
    const purchaseOrderCount = Number(purchaseRows[0]?.cnt ?? 0);

    // 毛利
    const grossProfit = (
      parseFloat(salesAmount) - parseFloat(purchaseAmount)
    ).toFixed(2);
    const grossProfitRate =
      parseFloat(salesAmount) > 0
        ? ((parseFloat(grossProfit) / parseFloat(salesAmount)) * 100).toFixed(
            2,
          ) + '%'
        : '0.00%';

    // 应收（未入账的销售类发票）
    const receivableRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.invoices.totalAmount}), '0')`,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, eid),
          eq(schema.invoices.status, 'verified'),
        ),
      );
    const pendingReceivable = receivableRows[0]?.total ?? '0.00';

    // 应付（未入账的采购类发票）
    const payableRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.invoices.totalAmount}), '0')`,
      })
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, eid),
          eq(schema.invoices.status, 'verified'),
          eq(schema.invoices.sourceType, 'purchase_order'),
        ),
      );
    const pendingPayable = payableRows[0]?.total ?? '0.00';

    return {
      period: reportPeriod,
      salesAmount,
      salesOrderCount,
      purchaseAmount,
      purchaseOrderCount,
      grossProfit,
      grossProfitRate,
      pendingReceivable,
      pendingPayable,
      lowStockProducts: [],
      topSalesProducts: [],
    };
  }

  // ==================== 资产负债表 ====================

  async getBalanceSheet(enterpriseId: number | undefined, asOfDate?: string) {
    const eid = requireEnterpriseId(enterpriseId);
    const endDate = asOfDate ? new Date(asOfDate) : new Date();

    // 查询科目及其余额汇总
    const rows = await this.db
      .select({
        code: schema.accountSubjects.code,
        name: schema.accountSubjects.name,
        category: schema.accountSubjects.category,
        balanceDirection: schema.accountSubjects.balanceDirection,
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.accountSubjects)
      .leftJoin(
        schema.voucherEntries,
        and(
          eq(
            schema.accountSubjects.enterpriseId,
            schema.voucherEntries.enterpriseId,
          ),
          lte(schema.voucherEntries.entryDate, endDate),
        ),
      )
      .where(eq(schema.accountSubjects.enterpriseId, eid))
      .groupBy(
        schema.accountSubjects.code,
        schema.accountSubjects.name,
        schema.accountSubjects.category,
        schema.accountSubjects.balanceDirection,
      )
      .orderBy(asc(schema.accountSubjects.code));

    const assets = rows
      .filter((r) => r.category === 'asset')
      .map((r) => ({ code: r.code, name: r.name, amount: r.total }));
    const liabilities = rows
      .filter((r) => r.category === 'liability')
      .map((r) => ({ code: r.code, name: r.name, amount: r.total }));
    const equity = rows
      .filter((r) => r.category === 'equity')
      .map((r) => ({ code: r.code, name: r.name, amount: r.total }));

    const sumAmounts = (items: { amount: string }[]) =>
      items.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0).toFixed(2);

    return {
      period: asOfDate ?? new Date().toISOString().slice(0, 10),
      assets,
      totalAssets: sumAmounts(assets),
      liabilities,
      totalLiabilities: sumAmounts(liabilities),
      equity,
      totalEquity: sumAmounts(equity),
    };
  }

  // ==================== 利润表 ====================

  async getIncomeStatement(enterpriseId: number | undefined, period?: string) {
    const eid = requireEnterpriseId(enterpriseId);
    const reportPeriod = period ?? new Date().toISOString().slice(0, 7);
    const [year, month] = reportPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 收入凭证汇总
    const incomeRows = await this.db
      .select({
        code: schema.voucherEntries.creditAccount,
        name: schema.voucherEntries.creditAccount,
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
          eq(schema.voucherEntries.creditAccount, '主营业务收入'),
        ),
      )
      .groupBy(schema.voucherEntries.creditAccount);

    const revenue = incomeRows.map((r) => ({
      code: r.code,
      name: r.name,
      amount: r.total,
    }));
    const totalRevenue = revenue
      .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
      .toFixed(2);

    // 成本凭证汇总
    const costRows = await this.db
      .select({
        code: schema.voucherEntries.debitAccount,
        name: schema.voucherEntries.debitAccount,
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
          eq(schema.voucherEntries.debitAccount, '主营业务成本'),
        ),
      )
      .groupBy(schema.voucherEntries.debitAccount);

    const costs = costRows.map((r) => ({
      code: r.code,
      name: r.name,
      amount: r.total,
    }));
    const totalCosts = costs
      .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
      .toFixed(2);

    // 费用凭证汇总
    const expenseRows = await this.db
      .select({
        code: schema.voucherEntries.debitAccount,
        name: schema.voucherEntries.debitAccount,
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
        ),
      )
      .groupBy(schema.voucherEntries.debitAccount);

    const expenseAccounts = ['销售费用', '管理费用', '财务费用'];
    const expenses = expenseRows
      .filter((r) => expenseAccounts.includes(r.code))
      .map((r) => ({ code: r.code, name: r.name, amount: r.total }));
    const totalExpenses = expenses
      .reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0)
      .toFixed(2);

    const netProfit = (
      parseFloat(totalRevenue) -
      parseFloat(totalCosts) -
      parseFloat(totalExpenses)
    ).toFixed(2);

    return {
      period: reportPeriod,
      revenue,
      totalRevenue,
      costs,
      totalCosts,
      expenses,
      totalExpenses,
      netProfit,
    };
  }

  // ==================== 现金流量表 ====================

  async getCashFlow(enterpriseId: number | undefined, period?: string) {
    const eid = requireEnterpriseId(enterpriseId);
    const reportPeriod = period ?? new Date().toISOString().slice(0, 7);
    const [year, month] = reportPeriod.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 经营活动现金流：涉及银行存款/库存现金的凭证
    const operatingRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
          eq(schema.voucherEntries.debitAccount, '银行存款'),
          eq(schema.voucherEntries.creditAccount, '主营业务收入'),
        ),
      );

    const operatingInflow = operatingRows[0]?.total ?? '0.00';

    const operatingOutflowRows = await this.db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.voucherEntries.amount}), '0')`,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
          eq(schema.voucherEntries.creditAccount, '银行存款'),
          eq(schema.voucherEntries.debitAccount, '库存商品'),
        ),
      );

    const operatingOutflow = operatingOutflowRows[0]?.total ?? '0.00';

    const netOperatingCashFlow = (
      parseFloat(operatingInflow) - parseFloat(operatingOutflow)
    ).toFixed(2);

    return {
      period: reportPeriod,
      operatingActivities: [
        { code: 'CFO-I', name: '经营活动现金流入', amount: operatingInflow },
        {
          code: 'CFO-O',
          name: '经营活动现金流出',
          amount: '-' + operatingOutflow,
        },
      ],
      netOperatingCashFlow,
      investingActivities: [],
      netInvestingCashFlow: '0.00',
      financingActivities: [],
      netFinancingCashFlow: '0.00',
      netCashFlow: netOperatingCashFlow,
      beginningCash: '0.00',
      endingCash: netOperatingCashFlow,
    };
  }

  // ==================== 应收应付 ====================

  async getArAp(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    // 应收账款：已验证但未入账的非采购发票
    const receivableInvoices = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.enterpriseId, eid),
          eq(schema.invoices.status, 'verified'),
        ),
      )
      .orderBy(asc(schema.invoices.issueDate));

    const now = new Date();
    const receivables = receivableInvoices
      .filter((inv) => inv.sourceType !== 'purchase_order')
      .map((inv) => {
        const issueDate = inv.issueDate ?? inv.createdAt;
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        return {
          id: inv.id,
          name: inv.buyerName ?? '未知',
          invoiceNo: inv.invoiceNo,
          amount: decimalToAmount(inv.totalAmount),
          paidAmount: '0.00',
          balance: decimalToAmount(inv.totalAmount),
          issueDate: dateToIso(inv.issueDate),
          daysOverdue,
        };
      });

    // 应付账款：已验证的采购类发票
    const payables = receivableInvoices
      .filter((inv) => inv.sourceType === 'purchase_order')
      .map((inv) => {
        const issueDate = inv.issueDate ?? inv.createdAt;
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        return {
          id: inv.id,
          name: inv.sellerName ?? '未知',
          invoiceNo: inv.invoiceNo,
          amount: decimalToAmount(inv.totalAmount),
          paidAmount: '0.00',
          balance: decimalToAmount(inv.totalAmount),
          issueDate: dateToIso(inv.issueDate),
          daysOverdue,
        };
      });

    const sumBalance = (items: { balance: string }[]) =>
      items
        .reduce((sum, i) => sum + parseFloat(i.balance || '0'), 0)
        .toFixed(2);

    return {
      receivables,
      totalReceivables: sumBalance(receivables),
      payables,
      totalPayables: sumBalance(payables),
    };
  }
}
