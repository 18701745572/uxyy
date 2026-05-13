import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

export interface AccountMapping {
  id: number;
  businessType: string;
  subType?: string;
  debitAccountId: number;
  creditAccountId: number;
  debitAccountName: string;
  creditAccountName: string;
  description?: string;
  priority: number;
}

export interface ComplexVoucherEntry {
  accountId: number;
  accountName: string;
  accountCode: string;
  direction: 'debit' | 'credit';
  amount: string;
  summary: string;
  // 辅助核算
  auxiliaries?: {
    type: 'customer' | 'supplier' | 'department' | 'project' | 'employee';
    id: number;
    name: string;
  }[];
}

export interface ComplexVoucher {
  voucherNo: string;
  voucherDate: Date;
  summary: string;
  sourceType?: string;
  sourceId?: number;
  entries: ComplexVoucherEntry[];
  totalDebit: string;
  totalCredit: string;
}

@Injectable()
export class AccountMappingService {
  private readonly logger = new Logger(AccountMappingService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 获取企业的科目映射规则
   */
  async getMappingRules(
    enterpriseId: number,
    businessType?: string,
  ): Promise<AccountMapping[]> {
    const conditions = [eq(schema.accountMappingRules.enterpriseId, enterpriseId)];
    if (businessType) {
      conditions.push(eq(schema.accountMappingRules.businessType, businessType));
    }

    const rules = await this.db
      .select({
        rule: schema.accountMappingRules,
        debitAccount: schema.accounts,
        creditAccount: schema.accounts,
      })
      .from(schema.accountMappingRules)
      .leftJoin(
        schema.accounts,
        eq(schema.accountMappingRules.debitAccountId, schema.accounts.id),
      )
      .leftJoin(
        schema.accounts,
        eq(schema.accountMappingRules.creditAccountId, schema.accounts.id),
      )
      .where(and(...conditions))
      .orderBy(desc(schema.accountMappingRules.priority));

    return rules.map(({ rule, debitAccount, creditAccount }) => ({
      id: rule.id,
      businessType: rule.businessType,
      subType: rule.subType || undefined,
      debitAccountId: rule.debitAccountId!,
      creditAccountId: rule.creditAccountId!,
      debitAccountName: debitAccount?.name || '',
      creditAccountName: creditAccount?.name || '',
      description: rule.description || undefined,
      priority: rule.priority ?? 0,
    }));
  }

  /**
   * 创建或更新科目映射规则
   */
  async saveMappingRule(
    enterpriseId: number,
    data: {
      businessType: string;
      subType?: string;
      debitAccountId: number;
      creditAccountId: number;
      description?: string;
      priority?: number;
    },
    userId: number,
    ruleId?: number,
  ): Promise<typeof schema.accountMappingRules.$inferSelect> {
    const values = {
      enterpriseId,
      businessType: data.businessType,
      subType: data.subType,
      debitAccountId: data.debitAccountId,
      creditAccountId: data.creditAccountId,
      description: data.description,
      priority: data.priority || 0,
      isActive: true,
      createdBy: userId,
      updatedAt: new Date(),
    };

    if (ruleId) {
      const [updated] = await this.db
        .update(schema.accountMappingRules)
        .set(values)
        .where(eq(schema.accountMappingRules.id, ruleId))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(schema.accountMappingRules)
        .values(values)
        .returning();
      return created;
    }
  }

  /**
   * 根据业务类型查找最佳匹配规则
   */
  async findBestMapping(
    enterpriseId: number,
    businessType: string,
    subType?: string,
  ): Promise<AccountMapping | null> {
    const rules = await this.getMappingRules(enterpriseId, businessType);
    
    if (rules.length === 0) {
      return null;
    }

    // 优先匹配子类型
    if (subType) {
      const exactMatch = rules.find(r => r.subType === subType);
      if (exactMatch) {
        return exactMatch;
      }
    }

    // 返回优先级最高的通用规则
    return rules[0];
  }

  /**
   * 初始化默认科目映射规则
   * 适用于新创建的企业
   */
  async initializeDefaultMappings(
    enterpriseId: number,
    userId: number,
  ): Promise<void> {
    const defaultMappings = [
      // 销售相关
      { businessType: 'sales_order', subType: null, debitAccountCode: '1122', creditAccountCode: '6001', description: '赊销收入确认' },
      { businessType: 'sales_order', subType: 'cash', debitAccountCode: '1001', creditAccountCode: '6001', description: '现销收入确认' },
      { businessType: 'sales_outbound', subType: null, debitAccountCode: '6401', creditAccountCode: '1405', description: '销售成本结转' },
      
      // 采购相关
      { businessType: 'purchase_order', subType: null, debitAccountCode: '1402', creditAccountCode: '2202', description: '赊购确认' },
      { businessType: 'purchase_order', subType: 'cash', debitAccountCode: '1405', creditAccountCode: '1002', description: '现购确认' },
      { businessType: 'purchase_inbound', subType: null, debitAccountCode: '1405', creditAccountCode: '1402', description: '采购入库' },
      
      // 费用相关
      { businessType: 'expense_request', subType: null, debitAccountCode: '6602', creditAccountCode: '2241', description: '费用确认' },
      { businessType: 'expense_payment', subType: null, debitAccountCode: '2241', creditAccountCode: '1001', description: '费用支付' },
      
      // 收付款
      { businessType: 'payment_received', subType: null, debitAccountCode: '1002', creditAccountCode: '1122', description: '客户回款' },
      { businessType: 'payment_made', subType: null, debitAccountCode: '2202', creditAccountCode: '1002', description: '供应商付款' },
      
      // 发票
      { businessType: 'invoice_purchase', subType: null, debitAccountCode: '2221', creditAccountCode: '2202', description: '进项税额' },
      { businessType: 'invoice_sales', subType: null, debitAccountCode: '1122', creditAccountCode: '2221', description: '销项税额' },
    ];

    for (const mapping of defaultMappings) {
      // 查找科目ID
      const [debitAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, mapping.debitAccountCode),
          ),
        )
        .limit(1);

      const [creditAccount] = await this.db
        .select()
        .from(schema.accounts)
        .where(
          and(
            eq(schema.accounts.enterpriseId, enterpriseId),
            eq(schema.accounts.code, mapping.creditAccountCode),
          ),
        )
        .limit(1);

      if (debitAccount && creditAccount) {
        await this.saveMappingRule(
          enterpriseId,
          {
            businessType: mapping.businessType,
            subType: mapping.subType || undefined,
            debitAccountId: debitAccount.id,
            creditAccountId: creditAccount.id,
            description: mapping.description,
          },
          userId,
        );
      }
    }
  }

  /**
   * 获取企业完整科目表
   */
  async getEnterpriseAccounts(
    enterpriseId: number,
    category?: string,
  ): Promise<typeof schema.accounts.$inferSelect[]> {
    const conditions = [eq(schema.accounts.enterpriseId, enterpriseId)];
    if (category) {
      conditions.push(eq(schema.accounts.category, category));
    }

    return this.db
      .select()
      .from(schema.accounts)
      .where(and(...conditions))
      .orderBy(schema.accounts.code);
  }

  /**
   * 根据科目代码获取科目
   */
  async getAccountByCode(
    enterpriseId: number,
    code: string,
  ): Promise<typeof schema.accounts.$inferSelect | null> {
    const [account] = await this.db
      .select()
      .from(schema.accounts)
      .where(
        and(
          eq(schema.accounts.enterpriseId, enterpriseId),
          eq(schema.accounts.code, code),
        ),
      )
      .limit(1);
    return account || null;
  }
}
