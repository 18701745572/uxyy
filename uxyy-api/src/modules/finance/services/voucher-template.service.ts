import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, like } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import { ComplexVoucher, ComplexVoucherEntry } from './account-mapping.service';

// 模板条目
export interface TemplateEntry {
  accountId: number;
  accountCode: string;
  accountName: string;
  direction: 'debit' | 'credit';
  percentage: number; // 金额占比（相对于总金额）
  fixedAmount?: string; // 固定金额（与百分比互斥）
  summary: string; // 摘要模板，支持变量 {date}, {month}, {remark}
}

// 凭证模板
export interface VoucherTemplate {
  id?: number;
  templateCode: string;
  templateName: string;
  description?: string;
  category: string;
  isSystem: boolean;
  summary: string;
  entries: TemplateEntry[];
}

// 使用模板创建凭证的参数
export interface UseTemplateParams {
  templateId: number;
  totalAmount: string;
  voucherDate: Date;
  remark?: string;
  customEntries?: Partial<TemplateEntry>[];
}

@Injectable()
export class VoucherTemplateService {
  private readonly logger = new Logger(VoucherTemplateService.name);

  // 系统预设模板
  private readonly systemTemplates: VoucherTemplate[] = [
    // 1. 工资计提
    {
      templateCode: 'SALARY-ACCRUE',
      templateName: '工资计提',
      description: '月末计提当月工资',
      category: '薪酬',
      isSystem: true,
      summary: '{month}月工资计提',
      entries: [
        { accountId: 0, accountCode: '660207', accountName: '管理费用-工资', direction: 'debit', percentage: 100, summary: '管理人员工资' },
        { accountId: 0, accountCode: '221101', accountName: '应付职工薪酬-工资', direction: 'credit', percentage: 100, summary: '计提工资' },
      ],
    },

    // 2. 发放工资
    {
      templateCode: 'SALARY-PAY',
      templateName: '发放工资',
      description: '实际发放工资（含社保公积金代扣）',
      category: '薪酬',
      isSystem: true,
      summary: '{month}月工资发放',
      entries: [
        { accountId: 0, accountCode: '221101', accountName: '应付职工薪酬-工资', direction: 'debit', percentage: 100, summary: '发放工资' },
        { accountId: 0, accountCode: '221102', accountName: '应付职工薪酬-社保', direction: 'credit', percentage: 10, summary: '代扣社保' },
        { accountId: 0, accountCode: '221103', accountName: '应付职工薪酬-公积金', direction: 'credit', percentage: 12, summary: '代扣公积金' },
        { accountId: 0, accountCode: '222108', accountName: '应交税费-个人所得税', direction: 'credit', percentage: 5, summary: '代扣个税' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 73, summary: '实发工资' },
      ],
    },

    // 3. 计提社保（企业承担部分）
    {
      templateCode: 'SOCIAL-ACCRUE',
      templateName: '计提社保（企业承担）',
      description: '计提企业承担的社会保险',
      category: '薪酬',
      isSystem: true,
      summary: '{month}月社保计提',
      entries: [
        { accountId: 0, accountCode: '660208', accountName: '管理费用-社保', direction: 'debit', percentage: 100, summary: '企业承担社保' },
        { accountId: 0, accountCode: '221102', accountName: '应付职工薪酬-社保', direction: 'credit', percentage: 100, summary: '计提社保' },
      ],
    },

    // 4. 缴纳增值税
    {
      templateCode: 'TAX-VAT',
      templateName: '缴纳增值税',
      description: '缴纳当月增值税',
      category: '税费',
      isSystem: true,
      summary: '{month}月增值税缴纳',
      entries: [
        { accountId: 0, accountCode: '222101', accountName: '应交税费-应交增值税', direction: 'debit', percentage: 100, summary: '缴纳增值税' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 100, summary: '税款缴纳' },
      ],
    },

    // 5. 缴纳企业所得税
    {
      templateCode: 'TAX-INCOME',
      templateName: '缴纳企业所得税',
      description: '预缴或汇算清缴企业所得税',
      category: '税费',
      isSystem: true,
      summary: '{month}月企业所得税缴纳',
      entries: [
        { accountId: 0, accountCode: '222103', accountName: '应交税费-企业所得税', direction: 'debit', percentage: 100, summary: '缴纳企业所得税' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 100, summary: '税款缴纳' },
      ],
    },

    // 6. 固定资产折旧
    {
      templateCode: 'DEPRECIATION',
      templateName: '固定资产折旧',
      description: '计提固定资产折旧',
      category: '折旧摊销',
      isSystem: true,
      summary: '{month}月固定资产折旧',
      entries: [
        { accountId: 0, accountCode: '660209', accountName: '管理费用-折旧费', direction: 'debit', percentage: 100, summary: '固定资产折旧' },
        { accountId: 0, accountCode: '1602', accountName: '累计折旧', direction: 'credit', percentage: 100, summary: '本月折旧' },
      ],
    },

    // 7. 无形资产摊销
    {
      templateCode: 'AMORTIZATION',
      templateName: '无形资产摊销',
      description: '计提无形资产摊销',
      category: '折旧摊销',
      isSystem: true,
      summary: '{month}月无形资产摊销',
      entries: [
        { accountId: 0, accountCode: '660210', accountName: '管理费用-摊销费', direction: 'debit', percentage: 100, summary: '无形资产摊销' },
        { accountId: 0, accountCode: '1702', accountName: '累计摊销', direction: 'credit', percentage: 100, summary: '本月摊销' },
      ],
    },

    // 8. 结转销售成本
    {
      templateCode: 'COGS',
      templateName: '结转销售成本',
      description: '月末结转主营业务成本',
      category: '成本结转',
      isSystem: true,
      summary: '{month}月销售成本结转',
      entries: [
        { accountId: 0, accountCode: '6401', accountName: '主营业务成本', direction: 'debit', percentage: 100, summary: '结转销售成本' },
        { accountId: 0, accountCode: '1405', accountName: '库存商品', direction: 'credit', percentage: 100, summary: '库存减少' },
      ],
    },

    // 9. 收入确认（一般企业）
    {
      templateCode: 'REVENUE',
      templateName: '收入确认',
      description: '确认主营业务收入（赊销）',
      category: '收入',
      isSystem: true,
      summary: '{month}月收入确认',
      entries: [
        { accountId: 0, accountCode: '1122', accountName: '应收账款', direction: 'debit', percentage: 113, summary: '销售收入' },
        { accountId: 0, accountCode: '6001', accountName: '主营业务收入', direction: 'credit', percentage: 100, summary: '销售收入' },
        { accountId: 0, accountCode: '22210105', accountName: '应交税费-销项税额', direction: 'credit', percentage: 13, summary: '销项税额' },
      ],
    },

    // 10. 提取备用金
    {
      templateCode: 'PETTY-CASH',
      templateName: '提取备用金',
      description: '从银行提取现金作为备用金',
      category: '资金划转',
      isSystem: true,
      summary: '提取备用金',
      entries: [
        { accountId: 0, accountCode: '1001', accountName: '库存现金', direction: 'debit', percentage: 100, summary: '提取备用金' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 100, summary: '提取备用金' },
      ],
    },

    // 11. 存现
    {
      templateCode: 'CASH-DEPOSIT',
      templateName: '现金存入银行',
      description: '将现金存入银行账户',
      category: '资金划转',
      isSystem: true,
      summary: '现金存入银行',
      entries: [
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'debit', percentage: 100, summary: '现金存入' },
        { accountId: 0, accountCode: '1001', accountName: '库存现金', direction: 'credit', percentage: 100, summary: '现金存入' },
      ],
    },

    // 12. 借款入账
    {
      templateCode: 'LOAN',
      templateName: '银行借款入账',
      description: '取得银行短期借款',
      category: '融资',
      isSystem: true,
      summary: '银行借款入账',
      entries: [
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'debit', percentage: 100, summary: '借款入账' },
        { accountId: 0, accountCode: '2001', accountName: '短期借款', direction: 'credit', percentage: 100, summary: '银行借款' },
      ],
    },

    // 13. 归还借款
    {
      templateCode: 'LOAN-REPAY',
      templateName: '归还银行借款',
      description: '归还银行借款本金及利息',
      category: '融资',
      isSystem: true,
      summary: '归还银行借款',
      entries: [
        { accountId: 0, accountCode: '2001', accountName: '短期借款', direction: 'debit', percentage: 95, summary: '归还本金' },
        { accountId: 0, accountCode: '660211', accountName: '财务费用-利息', direction: 'debit', percentage: 5, summary: '支付利息' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 100, summary: '归还借款' },
      ],
    },

    // 14. 股东投资
    {
      templateCode: 'INVESTMENT',
      templateName: '股东投资',
      description: '收到股东投资款',
      category: '投资',
      isSystem: true,
      summary: '收到股东投资',
      entries: [
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'debit', percentage: 100, summary: '股东投资款' },
        { accountId: 0, accountCode: '4001', accountName: '实收资本', direction: 'credit', percentage: 100, summary: '实收资本' },
      ],
    },

    // 15. 利润分配
    {
      templateCode: 'DIVIDEND',
      templateName: '利润分配',
      description: '向股东分配利润',
      category: '利润分配',
      isSystem: true,
      summary: '利润分配',
      entries: [
        { accountId: 0, accountCode: '4103', accountName: '利润分配', direction: 'debit', percentage: 100, summary: '利润分配' },
        { accountId: 0, accountCode: '4104', accountName: '应付股利', direction: 'credit', percentage: 100, summary: '应付股利' },
      ],
    },

    // 16. 支付股利
    {
      templateCode: 'DIVIDEND-PAY',
      templateName: '支付股利',
      description: '实际支付股东股利',
      category: '利润分配',
      isSystem: true,
      summary: '支付股利',
      entries: [
        { accountId: 0, accountCode: '4104', accountName: '应付股利', direction: 'debit', percentage: 100, summary: '支付股利' },
        { accountId: 0, accountCode: '1002', accountName: '银行存款', direction: 'credit', percentage: 100, summary: '支付股利' },
      ],
    },
  ];

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 初始化企业模板库
   * 将系统预设模板复制到企业
   */
  async initializeEnterpriseTemplates(
    enterpriseId: number,
    userId: number,
  ): Promise<void> {
    // 检查是否已初始化
    const [existing] = await this.db
      .select({ id: schema.voucherTemplates.id })
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
          eq(schema.voucherTemplates.isSystem, true),
        ),
      )
      .limit(1);

    if (existing) {
      return; // 已初始化
    }

    // 复制系统模板
    for (const template of this.systemTemplates) {
      await this.createTemplate(enterpriseId, userId, template);
    }

    this.logger.log(`企业${enterpriseId}模板库初始化完成`);
  }

  /**
   * 获取模板列表
   */
  async getTemplates(
    enterpriseId: number,
    options?: {
      category?: string;
      isSystem?: boolean;
      keyword?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ list: VoucherTemplate[]; total: number }> {
    const { category, isSystem, keyword, page = 1, pageSize = 20 } = options || {};

    const conditions = [eq(schema.voucherTemplates.enterpriseId, enterpriseId)];

    if (category) {
      conditions.push(eq(schema.voucherTemplates.category, category));
    }
    if (isSystem !== undefined) {
      conditions.push(eq(schema.voucherTemplates.isSystem, isSystem));
    }
    if (keyword) {
      // 使用 like 进行模糊匹配
      conditions.push(
        like(schema.voucherTemplates.templateName, `%${keyword}%`),
      );
    }

    const [countResult] = await this.db
      .select({ count: schema.voucherTemplates.id })
      .from(schema.voucherTemplates)
      .where(and(...conditions));

    const templates = await this.db
      .select()
      .from(schema.voucherTemplates)
      .where(and(...conditions))
      .orderBy(desc(schema.voucherTemplates.isSystem), desc(schema.voucherTemplates.usageCount))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      list: templates.map(t => ({
        id: t.id,
        templateCode: t.templateCode,
        templateName: t.templateName,
        description: t.description || undefined,
        category: t.category,
        isSystem: t.isSystem,
        summary: t.summary || '',
        entries: t.entries as TemplateEntry[],
      })),
      total: countResult?.count || 0,
    };
  }

  /**
   * 获取单个模板
   */
  async getTemplate(
    templateId: number,
    enterpriseId: number,
  ): Promise<VoucherTemplate | null> {
    const [template] = await this.db
      .select()
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.id, templateId),
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!template) {
      return null;
    }

    return {
      id: template.id,
      templateCode: template.templateCode,
      templateName: template.templateName,
      description: template.description || undefined,
      category: template.category,
      isSystem: template.isSystem,
      summary: template.summary || '',
      entries: template.entries as TemplateEntry[],
    };
  }

  /**
   * 创建模板
   */
  async createTemplate(
    enterpriseId: number,
    userId: number,
    data: VoucherTemplate,
  ): Promise<VoucherTemplate> {
    // 检查编码是否重复
    const [existing] = await this.db
      .select({ id: schema.voucherTemplates.id })
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
          eq(schema.voucherTemplates.templateCode, data.templateCode),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error(`模板编码${data.templateCode}已存在`);
    }

    // 解析科目代码为ID
    const resolvedEntries = await this.resolveAccountIds(data.entries, enterpriseId);

    const [template] = await this.db
      .insert(schema.voucherTemplates)
      .values({
        enterpriseId,
        templateCode: data.templateCode,
        templateName: data.templateName,
        description: data.description,
        category: data.category,
        isSystem: data.isSystem,
        isActive: true,
        summary: data.summary,
        entries: resolvedEntries,
        createdBy: userId,
      })
      .returning();

    return {
      id: template.id,
      templateCode: template.templateCode,
      templateName: template.templateName,
      description: template.description || undefined,
      category: template.category,
      isSystem: template.isSystem,
      summary: template.summary || '',
      entries: template.entries as TemplateEntry[],
    };
  }

  /**
   * 更新模板
   */
  async updateTemplate(
    templateId: number,
    enterpriseId: number,
    userId: number,
    data: Partial<VoucherTemplate>,
  ): Promise<VoucherTemplate> {
    const [existing] = await this.db
      .select()
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.id, templateId),
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('模板不存在');
    }

    // 系统模板不允许修改
    if (existing.isSystem && data.entries) {
      throw new Error('系统预设模板不允许修改分录');
    }

    // 解析科目
    let entries = existing.entries as TemplateEntry[];
    if (data.entries) {
      entries = await this.resolveAccountIds(data.entries, enterpriseId);
    }

    const [updated] = await this.db
      .update(schema.voucherTemplates)
      .set({
        templateName: data.templateName || existing.templateName,
        description: data.description || existing.description,
        category: data.category || existing.category,
        summary: data.summary || existing.summary,
        entries,
        updatedAt: new Date(),
      })
      .where(eq(schema.voucherTemplates.id, templateId))
      .returning();

    return {
      id: updated.id,
      templateCode: updated.templateCode,
      templateName: updated.templateName,
      description: updated.description || undefined,
      category: updated.category,
      isSystem: updated.isSystem,
      summary: updated.summary || '',
      entries: updated.entries as TemplateEntry[],
    };
  }

  /**
   * 删除模板
   */
  async deleteTemplate(
    templateId: number,
    enterpriseId: number,
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.id, templateId),
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('模板不存在');
    }

    if (existing.isSystem) {
      throw new Error('系统预设模板不能删除');
    }

    await this.db
      .delete(schema.voucherTemplates)
      .where(eq(schema.voucherTemplates.id, templateId));
  }

  /**
   * 使用模板创建凭证数据
   */
  async useTemplate(
    templateId: number,
    enterpriseId: number,
    params: UseTemplateParams,
  ): Promise<ComplexVoucher> {
    const template = await this.getTemplate(templateId, enterpriseId);
    if (!template) {
      throw new Error('模板不存在');
    }

    const totalAmount = parseFloat(params.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error('金额无效');
    }

    const voucherDate = params.voucherDate || new Date();
    const month = voucherDate.getMonth() + 1;

    // 替换摘要变量
    const replaceVariables = (text: string) => {
      return text
        .replace(/\{date\}/g, voucherDate.toISOString().split('T')[0])
        .replace(/\{month\}/g, `${month}`)
        .replace(/\{remark\}/g, params.remark || '');
    };

    // 生成分录
    const entries: ComplexVoucherEntry[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of template.entries) {
      // 计算金额
      let amount: number;
      if (entry.fixedAmount) {
        amount = parseFloat(entry.fixedAmount);
      } else {
        amount = totalAmount * (entry.percentage / 100);
      }

      // 应用自定义覆盖
      const customEntry = params.customEntries?.find(
        (e, idx) => idx === template.entries.indexOf(entry),
      );
      if (customEntry?.fixedAmount) {
        amount = parseFloat(customEntry.fixedAmount);
      }

      // 解析科目
      const [account] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, entry.accountCode),
          ),
        )
        .limit(1);

      if (!account) {
        throw new Error(`科目不存在: ${entry.accountCode} ${entry.accountName}`);
      }

      entries.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.code,
        direction: entry.direction,
        amount: amount.toFixed(2),
        summary: replaceVariables(customEntry?.summary || entry.summary),
      });

      if (entry.direction === 'debit') {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    }

    // 更新使用统计
    await this.db
      .update(schema.voucherTemplates)
      .set({
        usageCount: template.id ? (await this.getUsageCount(template.id)) + 1 : 1,
        lastUsedAt: new Date(),
      })
      .where(eq(schema.voucherTemplates.id, templateId));

    return {
      voucherNo: '',
      voucherDate,
      summary: replaceVariables(template.summary),
      entries,
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
    };
  }

  /**
   * 复制模板
   */
  async cloneTemplate(
    templateId: number,
    enterpriseId: number,
    userId: number,
    newCode: string,
    newName: string,
  ): Promise<VoucherTemplate> {
    const template = await this.getTemplate(templateId, enterpriseId);
    if (!template) {
      throw new Error('模板不存在');
    }

    return this.createTemplate(enterpriseId, userId, {
      templateCode: newCode,
      templateName: newName,
      description: template.description,
      category: template.category,
      isSystem: false,
      summary: template.summary,
      entries: template.entries,
    });
  }

  /**
   * 获取模板分类列表
   */
  async getCategories(enterpriseId: number): Promise<string[]> {
    const result = await this.db
      .select({ category: schema.voucherTemplates.category })
      .from(schema.voucherTemplates)
      .where(
        and(
          eq(schema.voucherTemplates.enterpriseId, enterpriseId),
          eq(schema.voucherTemplates.isActive, true),
        ),
      )
      .groupBy(schema.voucherTemplates.category);

    return result.map(r => r.category);
  }

  /**
   * 解析科目代码
   */
  private async resolveAccountIds(
    entries: TemplateEntry[],
    enterpriseId: number,
  ): Promise<TemplateEntry[]> {
    // 这里只是返回原始数据，实际ID在创建凭证时再解析
    return entries;
  }

  /**
   * 获取模板使用次数
   */
  private async getUsageCount(templateId: number): Promise<number> {
    const [template] = await this.db
      .select({ count: schema.voucherTemplates.usageCount })
      .from(schema.voucherTemplates)
      .where(eq(schema.voucherTemplates.id, templateId))
      .limit(1);

    return template?.count || 0;
  }

  /**
   * 导入自定义模板
   */
  async importTemplate(
    enterpriseId: number,
    userId: number,
    data: Omit<VoucherTemplate, 'id'>,
  ): Promise<VoucherTemplate> {
    // 生成唯一编码
    const timestamp = Date.now().toString(36).toUpperCase();
    const code = `${data.templateCode}-${timestamp}`;

    return this.createTemplate(enterpriseId, userId, {
      ...data,
      templateCode: code,
      isSystem: false,
    });
  }
}
