import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import * as XLSX from 'xlsx';
import * as schema from '../../db/schema';
import { DRIZZLE_DB } from '../database/database.constants';
import type { AppDrizzleDb } from '../database/database.module';
import type {
  CreateAccountSubjectDto,
  UpdateAccountSubjectDto,
} from './dto/account-subject.dto';
import type { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import type { CreateVoucherDto } from './dto/voucher.dto';
import { AiLlmService } from '../ai/ai.llm';

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

function parseAmountSafe(s: string): number {
  const n = parseFloat(s ?? '0');
  return Number.isFinite(n) ? n : 0;
}

/** 凭证科目与子目前缀汇总到父科目名（支持「父科目名-子目」） */
function sumMatchingSubjectName(
  subjectName: string,
  amountsByAccount: Map<string, number>,
): number {
  let sum = 0;
  for (const [acc, amt] of amountsByAccount) {
    if (acc === subjectName || acc.startsWith(`${subjectName}-`)) {
      sum += amt;
    }
  }
  return sum;
}

function isInvestingAccountName(name: string): boolean {
  return /固定资产|无形资产|长期股权投资/.test(name);
}

function isFinancingAccountName(name: string): boolean {
  return /实收资本|资本公积|短期借款|长期借款/.test(name);
}

const CASH_ACCOUNT_NAMES = ['库存现金', '银行存款'] as const;

function isCashAccountName(name: string): boolean {
  return CASH_ACCOUNT_NAMES.some((n) => name === n || name.startsWith(`${n}-`));
}

/** 现金类科目在 asOf 日止的累计余额（借−贷） */
async function cashBalanceAtDate(
  db: AppDrizzleDb,
  eid: number,
  endDate: Date,
): Promise<number> {
  const { debit, credit } = await voucherDebitCreditMaps(db, eid, {
    endDate,
  });
  let sum = 0;
  for (const n of CASH_ACCOUNT_NAMES) {
    sum += sumMatchingSubjectName(n, debit) - sumMatchingSubjectName(n, credit);
  }
  return sum;
}

/** 与利润表一致：累计收入 − 成本 − 费用（截至 endDate） */
async function cumulativeNetProfitUpTo(
  db: AppDrizzleDb,
  eid: number,
  endDate: Date,
): Promise<number> {
  const { debit, credit } = await voucherDebitCreditMaps(db, eid, {
    endDate,
  });
  const subjectRows = await db
    .select({
      code: schema.accountSubjects.code,
      name: schema.accountSubjects.name,
      category: schema.accountSubjects.category,
    })
    .from(schema.accountSubjects)
    .where(
      and(
        eq(schema.accountSubjects.enterpriseId, eid),
        eq(schema.accountSubjects.isActive, true),
      ),
    );

  let revenue = 0;
  let costs = 0;
  let expenses = 0;
  for (const s of subjectRows) {
    if (s.category === 'income') {
      revenue +=
        sumMatchingSubjectName(s.name, credit) -
        sumMatchingSubjectName(s.name, debit);
    } else if (s.category === 'expense') {
      const isCost = s.code === '6401' || s.name === '主营业务成本';
      const net =
        sumMatchingSubjectName(s.name, debit) -
        sumMatchingSubjectName(s.name, credit);
      if (isCost) costs += net;
      else expenses += net;
    }
  }
  return revenue - costs - expenses;
}

/** 解析会计期间 YYYY-MM，非法时回退当月 */
function parseYearMonth(period?: string): {
  reportPeriod: string;
  year: number;
  month: number;
  startDate: Date;
  endDate: Date;
} {
  let reportPeriod = period?.trim() ?? '';
  if (!/^\d{4}-\d{2}$/.test(reportPeriod)) {
    reportPeriod = new Date().toISOString().slice(0, 7);
  }
  const [y, m] = reportPeriod.split('-').map(Number);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return {
    reportPeriod: `${year}-${String(month).padStart(2, '0')}`,
    year,
    month,
    startDate,
    endDate,
  };
}

async function voucherDebitCreditMaps(
  db: AppDrizzleDb,
  eid: number,
  range: { endDate: Date; startDate?: Date },
): Promise<{ debit: Map<string, number>; credit: Map<string, number> }> {
  const dateCond =
    range.startDate != null
      ? and(
          gte(schema.voucherEntries.entryDate, range.startDate),
          lte(schema.voucherEntries.entryDate, range.endDate),
        )
      : lte(schema.voucherEntries.entryDate, range.endDate);

  const [debitRows, creditRows] = await Promise.all([
    db
      .select({
        account: schema.voucherEntries.debitAccount,
        total: sql<string>`COALESCE(SUM(CAST(${schema.voucherEntries.amount} AS DECIMAL)), 0)::text`,
      })
      .from(schema.voucherEntries)
      .where(and(eq(schema.voucherEntries.enterpriseId, eid), dateCond))
      .groupBy(schema.voucherEntries.debitAccount),
    db
      .select({
        account: schema.voucherEntries.creditAccount,
        total: sql<string>`COALESCE(SUM(CAST(${schema.voucherEntries.amount} AS DECIMAL)), 0)::text`,
      })
      .from(schema.voucherEntries)
      .where(and(eq(schema.voucherEntries.enterpriseId, eid), dateCond))
      .groupBy(schema.voucherEntries.creditAccount),
  ]);

  const debit = new Map<string, number>();
  for (const r of debitRows) {
    debit.set(r.account, parseAmountSafe(r.total));
  }
  const credit = new Map<string, number>();
  for (const r of creditRows) {
    credit.set(r.account, parseAmountSafe(r.total));
  }
  return { debit, credit };
}

async function resolveAccountSubjectName(
  db: AppDrizzleDb,
  eid: number,
  code: string,
  fallback: string,
): Promise<string> {
  const [row] = await db
    .select({ name: schema.accountSubjects.name })
    .from(schema.accountSubjects)
    .where(
      and(
        eq(schema.accountSubjects.enterpriseId, eid),
        eq(schema.accountSubjects.code, code),
      ),
    )
    .limit(1);
  return row?.name ?? fallback;
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
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly aiLlm: AiLlmService,
  ) {}

  // ==================== 发票 ====================

  /** OCR 发票识别 - 使用 Qwen-VL 多模态模型 */
  async crInvoice(
    enterpriseId: number | undefined,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<{
    invoiceNo: string;
    invoiceCode: string | null;
    type: 'special' | 'normal' | 'electronic';
    amount: string;
    taxRate: string;
    taxAmount: string;
    totalAmount: string;
    buyerName: string | null;
    buyerTaxNo: string | null;
    sellerName: string | null;
    sellerTaxNo: string | null;
    issueDate: string | null;
    ocrConfidence: number;
  }> {
    requireEnterpriseId(enterpriseId);

    // 将文件转为 base64
    const base64Image = file.buffer.toString('base64');
    const mimeType = file.mimetype || 'image/jpeg';
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    // OCR 识别 Prompt
    const sysPrompt = `你是专业的发票识别 AI。请仔细识别发票图片，提取所有可见字段并以 JSON 格式输出，不要输出任何其他内容。

输出格式要求：
{
  "invoiceType": "发票类型（增值税专用发票/增值税普通发票/电子普通发票/专用发票等）",
  "invoiceCode": "发票代码（10位或12位数字）",
  "invoiceNumber": "发票号码（8位数字）",
  "invoiceDate": "开票日期（格式：YYYY-MM-DD）",
  
  "buyerName": "购买方名称",
  "buyerTaxId": "购买方纳税人识别号/统一社会信用代码",
  
  "sellerName": "销售方名称",
  "sellerTaxId": "销售方纳税人识别号/统一社会信用代码",
  
  "amount": "不含税金额合计数值",
  "taxRate": "税率（如：13%、6%、免税等）",
  "taxAmount": "税额合计数值",
  "totalAmount": "价税合计（小写）数值",
  
  "confidence": 0.95
}`;

    try {
      const response = await this.aiLlm.chatWithImage(
        sysPrompt,
        '请识别这张发票的所有信息，以 JSON 格式返回',
        imageUrl,
        { temperature: 0.1 },
      );

      // 解析 JSON 响应
      let result: Record<string, unknown>;
      try {
        // 尝试提取 JSON 部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          result = JSON.parse(response);
        }
      } catch {
        throw new BadRequestException('OCR 识别结果解析失败，请重试或手动录入');
      }

      // 映射发票类型
      const typeStr = String(result.invoiceType || '').toLowerCase();
      let type: 'special' | 'normal' | 'electronic' = 'normal';
      if (typeStr.includes('专用')) {
        type = 'special';
      } else if (typeStr.includes('电子')) {
        type = 'electronic';
      }

      // 提取金额数值
      const extractAmount = (val: unknown): string => {
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'string') {
          const num = parseFloat(val.replace(/[¥,]/g, ''));
          return Number.isFinite(num) ? num.toFixed(2) : '0.00';
        }
        return '0.00';
      };

      // 提取税率
      const extractTaxRate = (val: unknown): string => {
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'string') {
          const cleaned = val.replace(/[%]/g, '');
          const num = parseFloat(cleaned);
          return Number.isFinite(num) ? num.toFixed(2) : '0.00';
        }
        return '0.00';
      };

      // 格式化日期
      const formatDate = (val: unknown): string | null => {
        if (!val) return null;
        const str = String(val);
        // 尝试匹配 YYYY-MM-DD
        if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(str)) {
          return str.replace(/\//g, '-').slice(0, 10);
        }
        // 尝试匹配 YYYY年MM月DD日
        const cnMatch = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (cnMatch) {
          return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
        }
        return str;
      };

      const confidence =
        typeof result.confidence === 'number'
          ? result.confidence
          : typeof result.confidence === 'string'
            ? parseFloat(result.confidence)
            : 0.85;

      return {
        invoiceNo: String(result.invoiceNumber || '').trim() || '',
        invoiceCode: String(result.invoiceCode || '').trim() || null,
        type,
        amount: extractAmount(result.amount),
        taxRate: extractTaxRate(result.taxRate),
        taxAmount: extractAmount(result.taxAmount),
        totalAmount: extractAmount(result.totalAmount),
        buyerName: String(result.buyerName || '').trim() || null,
        buyerTaxNo: String(result.buyerTaxId || '').trim() || null,
        sellerName: String(result.sellerName || '').trim() || null,
        sellerTaxNo: String(result.sellerTaxId || '').trim() || null,
        issueDate: formatDate(result.invoiceDate),
        ocrConfidence: Number.isFinite(confidence) ? confidence : 0.85,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'OCR 识别失败: ' +
          (error instanceof Error ? error.message : '未知错误'),
      );
    }
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

  /** 入账 → status=entered + 按科目表名称自动生成 1～2 条单行凭证（价税分离时两条） */
  async enterInvoice(id: number, enterpriseId: number | undefined) {
    const existing = await this.findOneInvoice(id, enterpriseId);
    const eid = requireEnterpriseId(enterpriseId);

    if (existing.status !== 'verified') {
      throw new BadRequestException('仅已验证状态的发票可入账');
    }

    const dup = await this.findVoucherBySource(eid, 'invoice', id);
    if (dup) {
      const inv = await this.findOneInvoice(id, enterpriseId);
      return {
        invoice: inv,
        voucher: dup,
        vouchers: [dup],
        voucherNo: dup.voucherNo,
      };
    }

    const uid =
      existing.createdBy != null && Number.isFinite(Number(existing.createdBy))
        ? Number(existing.createdBy)
        : 1;

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.invoices)
        .set({ status: 'entered' })
        .where(
          and(
            eq(schema.invoices.id, id),
            eq(schema.invoices.enterpriseId, eid),
          ),
        )
        .returning();

      if (!updated) throw new NotFoundException('发票不存在');

      const voucherNo = generateVoucherNo();
      const entryDate = new Date();
      const taxAmt = parseAmountSafe(decimalToAmount(updated.taxAmount));
      const amtNet = parseAmountSafe(decimalToAmount(updated.amount));
      const totalAmt = parseAmountSafe(decimalToAmount(updated.totalAmount));
      const netExclTax = amtNet > 0 ? amtNet : Math.max(0, totalAmt - taxAmt);

      const isPurchase = updated.sourceType === 'purchase_order';

      const ar = await resolveAccountSubjectName(tx, eid, '1122', '应收账款');
      const ap = await resolveAccountSubjectName(tx, eid, '2202', '应付账款');
      const revenue = await resolveAccountSubjectName(tx, eid, '6001', '主营业务收入');
      const inventory = await resolveAccountSubjectName(tx, eid, '1405', '库存商品');
      const taxAcc = await resolveAccountSubjectName(tx, eid, '2221', '应交税费');

      const baseSummary = `发票入账：${updated.invoiceNo}${updated.buyerName ? ` 购方：${updated.buyerName}` : ''}${updated.sellerName ? ` 销方：${updated.sellerName}` : ''}`;

      const rows: (typeof schema.voucherEntries.$inferInsert)[] = [];

      if (isPurchase) {
        if (taxAmt > 0.001 && netExclTax > 0.001) {
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: inventory,
            creditAccount: ap,
            amount: netExclTax.toFixed(2),
            summary: `${baseSummary} · 价款`,
            createdBy: uid,
          });
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: taxAcc,
            creditAccount: ap,
            amount: taxAmt.toFixed(2),
            summary: `${baseSummary} · 进项税额`,
            createdBy: uid,
          });
        } else {
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: inventory,
            creditAccount: ap,
            amount: totalAmt.toFixed(2),
            summary: baseSummary,
            createdBy: uid,
          });
        }
      } else {
        if (taxAmt > 0.001 && netExclTax > 0.001) {
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: ar,
            creditAccount: revenue,
            amount: netExclTax.toFixed(2),
            summary: `${baseSummary} · 价款`,
            createdBy: uid,
          });
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: ar,
            creditAccount: taxAcc,
            amount: taxAmt.toFixed(2),
            summary: `${baseSummary} · 销项税额`,
            createdBy: uid,
          });
        } else {
          rows.push({
            enterpriseId: eid,
            voucherNo,
            sourceType: 'invoice',
            sourceId: updated.id,
            entryDate,
            debitAccount: ar,
            creditAccount: revenue,
            amount: totalAmt.toFixed(2),
            summary: baseSummary,
            createdBy: uid,
          });
        }
      }

      const inserted: (typeof schema.voucherEntries.$inferSelect)[] = [];
      for (const r of rows) {
        const [v] = await tx.insert(schema.voucherEntries).values(r).returning();
        if (v) inserted.push(v);
      }

      return {
        invoice: mapInvoiceRow(updated),
        voucher: inserted[0] ? mapVoucherRow(inserted[0]) : null,
        vouchers: inserted.map(mapVoucherRow),
        voucherNo,
      };
    });
  }

  // ==================== 凭证 ====================

  async createVoucher(
    enterpriseId: number | undefined,
    dto: CreateVoucherDto,
    opts?: { createdByUserId?: number },
  ) {
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
        createdBy: opts?.createdByUserId ?? 0,
      })
      .returning();

    if (!inserted) throw new NotFoundException('创建凭证失败');
    return mapVoucherRow(inserted);
  }

  /** 按业务来源查找凭证（用于 AI 任务写入幂等） */
  async findVoucherBySource(
    enterpriseId: number | undefined,
    sourceType: string,
    sourceId: number,
  ) {
    const eid = requireEnterpriseId(enterpriseId);
    const [row] = await this.db
      .select()
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          eq(schema.voucherEntries.sourceType, sourceType),
          eq(schema.voucherEntries.sourceId, sourceId),
        ),
      )
      .limit(1);
    return row ? mapVoucherRow(row) : null;
  }

  /** 生成新凭证号（与发票入账等逻辑一致） */
  nextVoucherNo(): string {
    return generateVoucherNo();
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
    const endRaw = asOfDate
      ? new Date(`${asOfDate}T23:59:59.999Z`)
      : new Date();

    const { debit, credit } = await voucherDebitCreditMaps(this.db, eid, {
      endDate: endRaw,
    });

    const subjectRows = await this.db
      .select({
        code: schema.accountSubjects.code,
        name: schema.accountSubjects.name,
        category: schema.accountSubjects.category,
        balanceDirection: schema.accountSubjects.balanceDirection,
      })
      .from(schema.accountSubjects)
      .where(
        and(
          eq(schema.accountSubjects.enterpriseId, eid),
          eq(schema.accountSubjects.isActive, true),
        ),
      )
      .orderBy(asc(schema.accountSubjects.code));

    const itemFor = (
      cat: typeof schema.accountSubjects.$inferSelect.category,
    ) => {
      return subjectRows
        .filter((s) => s.category === cat)
        .map((s) => {
          const d = sumMatchingSubjectName(s.name, debit);
          const c = sumMatchingSubjectName(s.name, credit);
          const raw = s.balanceDirection === 'debit' ? d - c : c - d;
          return {
            code: s.code,
            name: s.name,
            amount: raw.toFixed(2),
          };
        })
        .filter((x) => parseFloat(x.amount) !== 0);
    };

    const assets = itemFor('asset');
    const liabilities = itemFor('liability');
    let equity = itemFor('equity');

    const cum = await cumulativeNetProfitUpTo(this.db, eid, endRaw);
    const hasRetainSubject = subjectRows.some(
      (s) =>
        s.category === 'equity' &&
        (/未分配利润|本年利润/.test(s.name) ||
          s.code === '4103' ||
          s.code === '4104'),
    );
    if (!hasRetainSubject && Math.abs(cum) >= 0.01) {
      equity = [
        ...equity,
        {
          code: '4104',
          name: '未分配利润（损益累计）',
          amount: cum.toFixed(2),
        },
      ];
    }

    const sumAmounts = (items: { amount: string }[]) =>
      items.reduce((sum, i) => sum + parseAmountSafe(i.amount), 0).toFixed(2);

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
    const { reportPeriod, startDate, endDate } = parseYearMonth(period);

    const { debit, credit } = await voucherDebitCreditMaps(this.db, eid, {
      startDate,
      endDate,
    });

    const subjectRows = await this.db
      .select({
        code: schema.accountSubjects.code,
        name: schema.accountSubjects.name,
        category: schema.accountSubjects.category,
      })
      .from(schema.accountSubjects)
      .where(
        and(
          eq(schema.accountSubjects.enterpriseId, eid),
          eq(schema.accountSubjects.isActive, true),
        ),
      )
      .orderBy(asc(schema.accountSubjects.code));

    function isPrincipalCost(subject: {
      code: string;
      name: string;
      category: string;
    }) {
      return (
        subject.category === 'expense' &&
        (subject.code === '6401' || subject.name === '主营业务成本')
      );
    }

    const revenueLines: { code: string; name: string; amount: string }[] = [];
    for (const s of subjectRows) {
      if (s.category !== 'income') continue;
      const amt =
        sumMatchingSubjectName(s.name, credit) -
        sumMatchingSubjectName(s.name, debit);
      if (amt !== 0) {
        revenueLines.push({
          code: s.code,
          name: s.name,
          amount: amt.toFixed(2),
        });
      }
    }
    const totalRevenue = revenueLines
      .reduce((sum, i) => sum + parseAmountSafe(i.amount), 0)
      .toFixed(2);

    const costLines: { code: string; name: string; amount: string }[] = [];
    for (const s of subjectRows) {
      if (!isPrincipalCost(s)) continue;
      const amt =
        sumMatchingSubjectName(s.name, debit) -
        sumMatchingSubjectName(s.name, credit);
      if (amt !== 0) {
        costLines.push({
          code: s.code,
          name: s.name,
          amount: amt.toFixed(2),
        });
      }
    }
    const totalCosts = costLines
      .reduce((sum, i) => sum + parseAmountSafe(i.amount), 0)
      .toFixed(2);

    const expenseLines: { code: string; name: string; amount: string }[] = [];
    for (const s of subjectRows) {
      if (s.category !== 'expense' || isPrincipalCost(s)) continue;
      const amt =
        sumMatchingSubjectName(s.name, debit) -
        sumMatchingSubjectName(s.name, credit);
      if (amt !== 0) {
        expenseLines.push({
          code: s.code,
          name: s.name,
          amount: amt.toFixed(2),
        });
      }
    }
    const totalExpenses = expenseLines
      .reduce((sum, i) => sum + parseAmountSafe(i.amount), 0)
      .toFixed(2);

    const netProfit = (
      parseFloat(totalRevenue) -
      parseFloat(totalCosts) -
      parseFloat(totalExpenses)
    ).toFixed(2);

    return {
      period: reportPeriod,
      revenue: revenueLines,
      totalRevenue,
      costs: costLines,
      totalCosts,
      expenses: expenseLines,
      totalExpenses,
      netProfit,
    };
  }

  // ==================== 现金流量表 ====================

  async getCashFlow(enterpriseId: number | undefined, period?: string) {
    const eid = requireEnterpriseId(enterpriseId);
    const { reportPeriod, startDate, endDate } = parseYearMonth(period);

    const prevEnd = new Date(startDate.getTime() - 1);
    const beginningVal = await cashBalanceAtDate(this.db, eid, prevEnd);
    const endingVal = await cashBalanceAtDate(this.db, eid, endDate);

    const debitCash = or(
      eq(schema.voucherEntries.debitAccount, '库存现金'),
      eq(schema.voucherEntries.debitAccount, '银行存款'),
      like(schema.voucherEntries.debitAccount, '库存现金%'),
      like(schema.voucherEntries.debitAccount, '银行存款%'),
    );
    const creditCash = or(
      eq(schema.voucherEntries.creditAccount, '库存现金'),
      eq(schema.voucherEntries.creditAccount, '银行存款'),
      like(schema.voucherEntries.creditAccount, '库存现金%'),
      like(schema.voucherEntries.creditAccount, '银行存款%'),
    );
    const touchesCash = or(debitCash, creditCash);

    const cfRows = await this.db
      .select({
        debitAccount: schema.voucherEntries.debitAccount,
        creditAccount: schema.voucherEntries.creditAccount,
        amount: schema.voucherEntries.amount,
      })
      .from(schema.voucherEntries)
      .where(
        and(
          eq(schema.voucherEntries.enterpriseId, eid),
          gte(schema.voucherEntries.entryDate, startDate),
          lte(schema.voucherEntries.entryDate, endDate),
          touchesCash,
        ),
      );

    let opIn = 0;
    let opOut = 0;
    let invIn = 0;
    let invOut = 0;
    let finIn = 0;
    let finOut = 0;

    for (const r of cfRows) {
      const a = parseAmountSafe(decimalToAmount(r.amount));
      if (isCashAccountName(r.debitAccount)) {
        const c = r.creditAccount;
        if (isInvestingAccountName(c)) invIn += a;
        else if (isFinancingAccountName(c)) finIn += a;
        else opIn += a;
      }
      if (isCashAccountName(r.creditAccount)) {
        const d = r.debitAccount;
        if (isInvestingAccountName(d)) invOut += a;
        else if (isFinancingAccountName(d)) finOut += a;
        else opOut += a;
      }
    }

    const netOperatingCashFlow = (opIn - opOut).toFixed(2);
    const netInvestingCashFlow = (invIn - invOut).toFixed(2);
    const netFinancingCashFlow = (finIn - finOut).toFixed(2);
    const netFromClassification = (
      parseFloat(netOperatingCashFlow) +
      parseFloat(netInvestingCashFlow) +
      parseFloat(netFinancingCashFlow)
    ).toFixed(2);
    const netFromBalance = (endingVal - beginningVal).toFixed(2);
    const netCashFlow =
      Math.abs(
        parseFloat(netFromClassification) - parseFloat(netFromBalance),
      ) < 0.02
        ? netFromClassification
        : netFromBalance;

    const operatingActivities: {
      code: string;
      name: string;
      amount: string;
    }[] = [
      {
        code: 'CFO-IN',
        name: '经营活动现金流入',
        amount: opIn.toFixed(2),
      },
      {
        code: 'CFO-OUT',
        name: '经营活动现金流出',
        amount: (-opOut).toFixed(2),
      },
    ];

    const investingActivities: {
      code: string;
      name: string;
      amount: string;
    }[] = [];
    if (invIn > 0)
      investingActivities.push({
        code: 'CFI-IN',
        name: '投资活动现金流入',
        amount: invIn.toFixed(2),
      });
    if (invOut > 0)
      investingActivities.push({
        code: 'CFI-OUT',
        name: '投资活动现金流出',
        amount: (-invOut).toFixed(2),
      });

    const financingActivities: {
      code: string;
      name: string;
      amount: string;
    }[] = [];
    if (finIn > 0)
      financingActivities.push({
        code: 'CFF-IN',
        name: '筹资活动现金流入',
        amount: finIn.toFixed(2),
      });
    if (finOut > 0)
      financingActivities.push({
        code: 'CFF-OUT',
        name: '筹资活动现金流出',
        amount: (-finOut).toFixed(2),
      });

    return {
      period: reportPeriod,
      operatingActivities,
      netOperatingCashFlow,
      investingActivities,
      netInvestingCashFlow,
      financingActivities,
      netFinancingCashFlow,
      netCashFlow,
      beginningCash: beginningVal.toFixed(2),
      endingCash: endingVal.toFixed(2),
    };
  }

  // ==================== 应收应付 ====================

  async getArAp(enterpriseId: number | undefined) {
    const eid = requireEnterpriseId(enterpriseId);

    const AR_ORDER_SOURCE = new Set(['sales_order', 'sales_order_cash']);

    const [paymentByOrderRows, allInvoices] = await Promise.all([
      this.db
        .select({
          orderId: schema.paymentRecords.orderId,
          total: sql<string>`COALESCE(SUM(CAST(${schema.paymentRecords.amount} AS DECIMAL)), 0)::text`,
        })
        .from(schema.paymentRecords)
        .where(eq(schema.paymentRecords.enterpriseId, eid))
        .groupBy(schema.paymentRecords.orderId),
      this.db
        .select()
        .from(schema.invoices)
        .where(
          and(
            eq(schema.invoices.enterpriseId, eid),
            eq(schema.invoices.status, 'verified'),
          ),
        )
        .orderBy(asc(schema.invoices.issueDate)),
    ]);

    const paidByOrder = new Map<number, number>();
    for (const row of paymentByOrderRows) {
      if (row.orderId != null) {
        paidByOrder.set(row.orderId, parseAmountSafe(row.total));
      }
    }

    const isPayableInvoice = (inv: (typeof allInvoices)[0]) =>
      inv.sourceType === 'purchase_order' ||
      inv.sourceType === 'invoice_purchase';

    const receivableInvoices = allInvoices.filter((inv) => !isPayableInvoice(inv));

    const invoicesByOrderId = new Map<number, typeof allInvoices>();
    for (const inv of receivableInvoices) {
      if (
        inv.sourceId != null &&
        inv.sourceType != null &&
        AR_ORDER_SOURCE.has(inv.sourceType)
      ) {
        const list = invoicesByOrderId.get(inv.sourceId) ?? [];
        list.push(inv);
        invoicesByOrderId.set(inv.sourceId, list);
      }
    }

    const paidByInvoiceId = new Map<number, number>();
    for (const [orderId, list] of invoicesByOrderId) {
      const sorted = [...list].sort((a, b) => {
        const ta = a.issueDate?.getTime() ?? a.createdAt.getTime();
        const tb = b.issueDate?.getTime() ?? b.createdAt.getTime();
        return ta - tb;
      });
      let pool = paidByOrder.get(orderId) ?? 0;
      for (const inv of sorted) {
        const total = parseAmountSafe(decimalToAmount(inv.totalAmount));
        const take = Math.min(Math.max(total, 0), Math.max(pool, 0));
        paidByInvoiceId.set(inv.id, take);
        pool -= take;
      }
    }

    const now = new Date();
    const mapArApRow = (
      inv: (typeof allInvoices)[0],
      name: string,
      paid: number,
    ) => {
      const issueDate = inv.issueDate ?? inv.createdAt;
      const daysOverdue = Math.max(
        0,
        Math.floor(
          (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const amountNum = parseAmountSafe(decimalToAmount(inv.totalAmount));
      const paidClamped = Math.min(Math.max(paid, 0), amountNum);
      const balanceNum = Math.max(amountNum - paidClamped, 0);
      return {
        id: inv.id,
        name,
        invoiceNo: inv.invoiceNo,
        amount: amountNum.toFixed(2),
        paidAmount: paidClamped.toFixed(2),
        balance: balanceNum.toFixed(2),
        issueDate: dateToIso(inv.issueDate),
        daysOverdue,
      };
    };

    const receivables = receivableInvoices.map((inv) => {
      const paid = paidByInvoiceId.get(inv.id) ?? 0;
      return mapArApRow(inv, inv.buyerName ?? '未知', paid);
    });

    const payables = allInvoices.filter(isPayableInvoice).map((inv) =>
      mapArApRow(inv, inv.sellerName ?? '未知', 0),
    );

    const sumBalance = (items: { balance: string }[]) =>
      items.reduce((sum, i) => sum + parseAmountSafe(i.balance), 0).toFixed(2);

    return {
      receivables,
      totalReceivables: sumBalance(receivables),
      payables,
      totalPayables: sumBalance(payables),
    };
  }

  // Import invoices from spreadsheet
  async importInvoicesFromSpreadsheet(
    enterpriseId: number | undefined,
    buffer: Buffer,
    mode: 'skip' | 'force',
  ): Promise<{
    created: number;
    skipped: number;
    failures: Array<{ row: number; reason: string }>;
  }> {
    const eid = requireEnterpriseId(enterpriseId);
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('无法解析表格文件，请使用 xlsx/xls/csv');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('表格为空');
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      blankrows: false,
    });

    const HEADER_MAP: Record<string, string> = {
      发票号码: 'invoiceNo',
      发票号: 'invoiceNo',
      invoiceNo: 'invoiceNo',
      发票代码: 'invoiceCode',
      invoiceCode: 'invoiceCode',
      发票类型: 'type',
      type: 'type',
      金额: 'amount',
      amount: 'amount',
      税率: 'taxRate',
      taxRate: 'taxRate',
      税额: 'taxAmount',
      taxAmount: 'taxAmount',
      价税合计: 'totalAmount',
      totalAmount: 'totalAmount',
      购方名称: 'buyerName',
      buyerName: 'buyerName',
      购买方名称: 'buyerName',
      购方税号: 'buyerTaxNo',
      buyerTaxNo: 'buyerTaxNo',
      购买方税号: 'buyerTaxNo',
      销方名称: 'sellerName',
      sellerName: 'sellerName',
      销售方名称: 'sellerName',
      销方税号: 'sellerTaxNo',
      sellerTaxNo: 'sellerTaxNo',
      销售方税号: 'sellerTaxNo',
      开票日期: 'issueDate',
      issueDate: 'issueDate',
      状态: 'status',
      status: 'status',
      录入时间: '_ignore',
      createdAt: '_ignore',
    };

    const typeMap: Record<string, string> = {
      专用发票: 'special',
      普通发票: 'normal',
      电子发票: 'electronic',
    };

    const statusMap: Record<string, string> = {
      未核验: 'unverified',
      已核验: 'verified',
      已入账: 'entered',
      已作废: 'void',
    };

    let created = 0;
    let skipped = 0;
    const failures: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const raw = rawRows[i];
      const rowData: Record<string, string | number> = {};

      for (const [header, val] of Object.entries(raw)) {
        const key = HEADER_MAP[String(header).trim()];
        if (!key || key === '_ignore') continue;

        if (key === 'amount' || key === 'taxRate' || key === 'taxAmount' || key === 'totalAmount') {
          const n = Number(val);
          if (Number.isFinite(n) && n >= 0) rowData[key] = n;
          continue;
        }

        const str = val instanceof Date ? val.toISOString().slice(0, 10) : String(val).trim();
        if (!str) continue;

        rowData[key] = str;
      }

      const invoiceNo = String(rowData['invoiceNo'] || '');

      if (!invoiceNo) {
        failures.push({ row: rowIndex, reason: '发票号码必填' });
        continue;
      }

      // Check for duplicate invoiceNo
      if (mode === 'skip') {
        const existing = await this.db
          .select({ id: schema.invoices.id })
          .from(schema.invoices)
          .where(
            and(
              eq(schema.invoices.enterpriseId, eid),
              eq(schema.invoices.invoiceNo, invoiceNo),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
      }

      const rawType = String(rowData['type'] || 'normal');
      const type = typeMap[rawType] || rawType || 'normal';
      const amount = Number(rowData['amount'] || 0);
      const taxRate = Number(rowData['taxRate'] || 0);
      const taxAmount = Number(rowData['taxAmount'] || 0);
      const totalAmount = Number(rowData['totalAmount'] || amount + taxAmount);
      const rawStatus = String(rowData['status'] || 'unverified');
      const status = statusMap[rawStatus] || rawStatus || 'unverified';
      const buyerName = String(rowData['buyerName'] || '');
      const buyerTaxNo = String(rowData['buyerTaxNo'] || '');
      const sellerName = String(rowData['sellerName'] || '');
      const sellerTaxNo = String(rowData['sellerTaxNo'] || '');
      const issueDate = String(rowData['issueDate'] || '');

      try {
        const [invoice] = await this.db
          .insert(schema.invoices)
          .values({
            enterpriseId: eid,
            invoiceNo,
            invoiceCode: String(rowData['invoiceCode'] || '') || null,
            type: type as any,
            amount: amount.toFixed(2),
            taxRate: taxRate > 0 ? taxRate.toFixed(2) : null,
            taxAmount: taxAmount > 0 ? taxAmount.toFixed(2) : null,
            totalAmount: totalAmount.toFixed(2),
            buyerName: buyerName || null,
            buyerTaxNo: buyerTaxNo || null,
            sellerName: sellerName || null,
            sellerTaxNo: sellerTaxNo || null,
            issueDate: issueDate ? new Date(issueDate) : null,
            status: status as any,
            sourceType: 'manual',
          })
          .returning();

        if (invoice) {
          created++;
        }
      } catch (err) {
        failures.push({
          row: rowIndex,
          reason: err instanceof Error ? err.message : '创建失败',
        });
      }
    }

    return { created, skipped, failures };
  }

  // Import vouchers from spreadsheet
  async importVouchersFromSpreadsheet(
    enterpriseId: number | undefined,
    buffer: Buffer,
    mode: 'skip' | 'force',
    userId: number,
  ): Promise<{
    created: number;
    skipped: number;
    failures: Array<{ row: number; reason: string }>;
  }> {
    const eid = requireEnterpriseId(enterpriseId);
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('无法解析表格文件，请使用 xlsx/xls/csv');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('表格为空');
    }
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      blankrows: false,
    });

    const HEADER_MAP: Record<string, string> = {
      凭证号: 'voucherNo',
      voucherNo: 'voucherNo',
      来源类型: 'sourceType',
      sourceType: 'sourceType',
      日期: 'entryDate',
      entryDate: 'entryDate',
      借方科目: 'debitAccount',
      debitAccount: 'debitAccount',
      贷方科目: 'creditAccount',
      creditAccount: 'creditAccount',
      金额: 'amount',
      amount: 'amount',
      摘要: 'summary',
      summary: 'summary',
      创建时间: '_ignore',
      createdAt: '_ignore',
    };

    let created = 0;
    let skipped = 0;
    const failures: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
      const rowIndex = i + 2;
      const raw = rawRows[i];
      const rowData: Record<string, string | number> = {};

      for (const [header, val] of Object.entries(raw)) {
        const key = HEADER_MAP[String(header).trim()];
        if (!key || key === '_ignore') continue;

        if (key === 'amount') {
          const n = Number(val);
          if (Number.isFinite(n) && n > 0) rowData[key] = n;
          continue;
        }

        const str = val instanceof Date ? val.toISOString().slice(0, 10) : String(val).trim();
        if (!str) continue;

        rowData[key] = str;
      }

      const voucherNo = String(rowData['voucherNo'] || '');
      const debitAccount = String(rowData['debitAccount'] || '');
      const creditAccount = String(rowData['creditAccount'] || '');
      const amount = Number(rowData['amount'] || 0);

      if (!voucherNo) {
        failures.push({ row: rowIndex, reason: '凭证号必填' });
        continue;
      }

      if (!debitAccount) {
        failures.push({ row: rowIndex, reason: '借方科目必填' });
        continue;
      }

      if (!creditAccount) {
        failures.push({ row: rowIndex, reason: '贷方科目必填' });
        continue;
      }

      if (debitAccount === creditAccount) {
        failures.push({ row: rowIndex, reason: '借方和贷方科目不能相同' });
        continue;
      }

      if (amount <= 0) {
        failures.push({ row: rowIndex, reason: '金额必须大于0' });
        continue;
      }

      // Check for duplicate voucherNo
      if (mode === 'skip') {
        const existing = await this.db
          .select({ id: schema.voucherEntries.id })
          .from(schema.voucherEntries)
          .where(
            and(
              eq(schema.voucherEntries.enterpriseId, eid),
              eq(schema.voucherEntries.voucherNo, voucherNo),
            ),
          )
          .limit(1);
        if (existing.length > 0) {
          skipped++;
          continue;
        }
      }

      const entryDate = String(rowData['entryDate'] || '');
      const summary = String(rowData['summary'] || '');
      const sourceType = String(rowData['sourceType'] || 'manual');

      try {
        const [voucher] = await this.db
          .insert(schema.voucherEntries)
          .values({
            enterpriseId: eid,
            voucherNo,
            sourceType: sourceType as any,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            debitAccount,
            creditAccount,
            amount: amount.toFixed(2),
            summary: summary || null,
            createdBy: userId,
          })
          .returning();

        if (voucher) {
          created++;
        }
      } catch (err) {
        failures.push({
          row: rowIndex,
          reason: err instanceof Error ? err.message : '创建失败',
        });
      }
    }

    return { created, skipped, failures };
  }
}
