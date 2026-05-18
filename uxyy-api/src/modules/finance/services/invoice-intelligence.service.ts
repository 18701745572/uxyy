import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../../db/schema';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';

// 费用分类结果
export interface ExpenseClassification {
  category: string; // 费用大类
  subCategory: string; // 费用小类
  accountCode: string; // 建议科目代码
  accountName: string; // 建议科目名称
  confidence: number; // 置信度 0-1
  reason: string; // 分类理由
  keywords: string[]; // 匹配到的关键词
}

// 发票分析结果
export interface InvoiceAnalysis {
  invoiceId: number;
  invoiceNo: string;
  expenseType: ExpenseClassification;
  isEntertainment: boolean; // 是否为招待费（税务敏感）
  isFixedAsset: boolean; // 是否为固定资产
  isOfficeExpense: boolean; // 是否为办公费
  warnings: string[]; // 风险提示
  suggestions: string[]; // 处理建议
}

// 分类规则
interface ClassificationRule {
  category: string;
  subCategory: string;
  accountCode: string;
  keywords: string[];
  negativeKeywords?: string[]; // 排除关键词
  minAmount?: number; // 金额下限
  maxAmount?: number; // 金额上限
  priority: number; // 优先级
}

@Injectable()
export class InvoiceIntelligenceService {
  private readonly logger = new Logger(InvoiceIntelligenceService.name);

  // 预设分类规则库
  private readonly classificationRules: ClassificationRule[] = [
    // 办公费类
    {
      category: '管理费用',
      subCategory: '办公费',
      accountCode: '660201',
      keywords: [
        '办公',
        '文具',
        '打印纸',
        '墨盒',
        '硒鼓',
        '笔',
        '笔记本',
        '文件夹',
        '档案袋',
        '订书机',
        '计算器',
        '白板',
      ],
      maxAmount: 5000,
      priority: 100,
    },
    {
      category: '管理费用',
      subCategory: '邮电费',
      accountCode: '660202',
      keywords: [
        '快递',
        '顺丰',
        '中通',
        '圆通',
        '韵达',
        'EMS',
        '邮政',
        '信封',
        '邮票',
        '话费',
        '宽带',
        '网络费',
      ],
      priority: 100,
    },

    // 差旅费类
    {
      category: '管理费用',
      subCategory: '差旅费-交通',
      accountCode: '66020301',
      keywords: [
        '机票',
        '火车票',
        '高铁',
        '动车',
        '汽车票',
        '出租车',
        '滴滴',
        '地铁',
        '公交',
        '加油',
        '高速费',
        '停车费',
      ],
      priority: 90,
    },
    {
      category: '管理费用',
      subCategory: '差旅费-住宿',
      accountCode: '66020302',
      keywords: [
        '酒店',
        '宾馆',
        '旅馆',
        '住宿',
        '客房',
        '如家',
        '汉庭',
        '全季',
        '亚朵',
      ],
      priority: 90,
    },
    {
      category: '管理费用',
      subCategory: '差旅费-伙食',
      accountCode: '66020303',
      keywords: ['出差', '差旅', '误餐', '出差补贴'],
      priority: 80,
    },

    // 业务招待费（税务敏感）
    {
      category: '管理费用',
      subCategory: '业务招待费',
      accountCode: '660204',
      keywords: [
        '餐饮',
        '餐厅',
        '饭店',
        '酒楼',
        '茶馆',
        '咖啡厅',
        'KTV',
        '娱乐',
        '礼品',
        '烟酒',
        '海参',
        '燕窝',
        '茶叶',
      ],
      negativeKeywords: ['员工', '食堂', '加班', '工作餐'],
      priority: 95,
    },

    // 车辆费用
    {
      category: '管理费用',
      subCategory: '车辆费-油费',
      accountCode: '66020501',
      keywords: [
        '汽油',
        '柴油',
        '加油',
        '油卡',
        '中国石化',
        '中国石油',
        '壳牌',
      ],
      priority: 90,
    },
    {
      category: '管理费用',
      subCategory: '车辆费-维修',
      accountCode: '66020502',
      keywords: ['汽车维修', '保养', '轮胎', '配件', '4S店', '修理'],
      priority: 85,
    },
    {
      category: '管理费用',
      subCategory: '车辆费-保险',
      accountCode: '66020503',
      keywords: ['车险', '交强险', '商业险', '车辆保险'],
      priority: 85,
    },

    // 市场推广费
    {
      category: '销售费用',
      subCategory: '广告费',
      accountCode: '660101',
      keywords: [
        '广告',
        '推广',
        '宣传',
        ' billboard',
        '百度推广',
        '腾讯广告',
        '字节跳动',
        '抖音',
        '微信广告',
      ],
      priority: 90,
    },
    {
      category: '销售费用',
      subCategory: '业务宣传费',
      accountCode: '660102',
      keywords: [
        '印刷',
        '画册',
        '宣传册',
        '易拉宝',
        '展架',
        '名片',
        '传单',
        '海报',
        '展会',
        '展台',
      ],
      priority: 85,
    },

    // 咨询费
    {
      category: '管理费用',
      subCategory: '咨询费',
      accountCode: '660206',
      keywords: [
        '咨询',
        '审计',
        '法律',
        '律师',
        '会计',
        '税务',
        '评估',
        '认证',
        'ISO',
        '培训',
        '顾问',
      ],
      minAmount: 1000,
      priority: 80,
    },

    // 租赁费
    {
      category: '管理费用',
      subCategory: '租赁费-房租',
      accountCode: '66020701',
      keywords: ['房租', '租金', '办公室', '写字楼', '厂房', '仓库', '场地'],
      minAmount: 5000,
      priority: 95,
    },
    {
      category: '管理费用',
      subCategory: '租赁费-设备',
      accountCode: '66020702',
      keywords: ['设备租赁', '机器租赁', '汽车租赁', '租车'],
      priority: 80,
    },

    // 水电费
    {
      category: '管理费用',
      subCategory: '水电费',
      accountCode: '660208',
      keywords: ['水费', '电费', '燃气费', '物业费', '取暖费'],
      priority: 90,
    },

    // 修理费
    {
      category: '管理费用',
      subCategory: '修理费',
      accountCode: '660209',
      keywords: ['维修', '修理', '安装', '调试', '保养', '维护'],
      priority: 75,
    },

    // 固定资产
    {
      category: '固定资产',
      subCategory: '电子设备',
      accountCode: '1601',
      keywords: [
        '电脑',
        '笔记本',
        '台式机',
        '服务器',
        '打印机',
        '复印机',
        '投影仪',
        '空调',
        '电视',
        '手机',
        '平板',
      ],
      minAmount: 5000,
      priority: 110,
    },
    {
      category: '固定资产',
      subCategory: '办公家具',
      accountCode: '1602',
      keywords: [
        '办公桌',
        '办公椅',
        '文件柜',
        '沙发',
        '茶几',
        '会议桌',
        '书柜',
      ],
      minAmount: 5000,
      priority: 110,
    },
    {
      category: '固定资产',
      subCategory: '运输设备',
      accountCode: '1603',
      keywords: ['汽车', '货车', '面包车', '商务车', '摩托车'],
      minAmount: 10000,
      priority: 110,
    },

    // 员工福利
    {
      category: '应付职工薪酬',
      subCategory: '职工福利',
      accountCode: '221101',
      keywords: [
        '员工',
        '职工',
        '食堂',
        '餐费',
        '体检',
        '团建',
        '旅游',
        '节日',
        '福利',
      ],
      priority: 85,
    },

    // 社保公积金
    {
      category: '应付职工薪酬',
      subCategory: '社会保险',
      accountCode: '221102',
      keywords: [
        '社保',
        '养老保险',
        '医疗保险',
        '失业保险',
        '工伤保险',
        '生育保险',
        '五险一金',
      ],
      priority: 100,
    },
    {
      category: '应付职工薪酬',
      subCategory: '住房公积金',
      accountCode: '221103',
      keywords: ['公积金', '住房公积金', '住房补贴'],
      priority: 100,
    },

    // 税费
    {
      category: '应交税费',
      subCategory: '印花税',
      accountCode: '222104',
      keywords: ['印花税', '税务', '完税'],
      priority: 100,
    },
  ];

  // 招待费敏感词（用于风险提示）
  private readonly entertainmentKeywords = [
    '酒楼',
    '会所',
    'KTV',
    '酒吧',
    '夜总会',
    '桑拿',
    '按摩',
    '高尔夫',
    '游艇',
    '高档',
    '豪华',
    '顶级',
    '名贵',
    '奢侈品',
    '香奈儿',
    '爱马仕',
    'LV',
    '茅台',
    '五粮液',
    '中华烟',
    '和天下',
    '天叶',
  ];

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 智能分类发票
   */
  async classifyInvoice(
    invoiceId: number,
    enterpriseId: number,
  ): Promise<InvoiceAnalysis> {
    // 查询发票信息
    const [invoice] = await this.db
      .select()
      .from(schema.invoices)
      .where(
        and(
          eq(schema.invoices.id, invoiceId),
          eq(schema.invoices.enterpriseId, enterpriseId),
        ),
      )
      .limit(1);

    if (!invoice) {
      throw new Error('发票不存在');
    }

    // 解析OCR数据获取商品明细
    const ocrData = invoice.ocrData as any;
    const items = ocrData?.items || [];
    const itemNames = items.map((item: any) => item.name || '').join(' ');

    // 分类输入数据
    const inputData = {
      sellerName: invoice.sellerName || '',
      itemNames,
      amount: parseFloat(invoice.amount || '0'),
      totalAmount: parseFloat(invoice.totalAmount || '0'),
    };

    // 执行分类
    const expenseType = this.classifyByRules(inputData);

    // 分析风险
    const warnings = this.analyzeRisks(inputData, expenseType);

    // 生成建议
    const suggestions = this.generateSuggestions(expenseType, inputData);

    return {
      invoiceId,
      invoiceNo: invoice.invoiceNo,
      expenseType,
      isEntertainment: this.isEntertainmentExpense(expenseType, inputData),
      isFixedAsset: expenseType.category === '固定资产',
      isOfficeExpense:
        expenseType.category === '管理费用' &&
        expenseType.subCategory === '办公费',
      warnings,
      suggestions,
    };
  }

  /**
   * 基于规则分类
   */
  private classifyByRules(data: {
    sellerName: string;
    itemNames: string;
    amount: number;
    totalAmount: number;
  }): ExpenseClassification {
    const { sellerName, itemNames, amount } = data;
    const textToAnalyze = `${sellerName} ${itemNames}`.toLowerCase();

    const matches: Array<{
      rule: ClassificationRule;
      matchedKeywords: string[];
      score: number;
    }> = [];

    for (const rule of this.classificationRules) {
      // 检查金额条件
      if (rule.minAmount && amount < rule.minAmount) continue;
      if (rule.maxAmount && amount > rule.maxAmount) continue;

      // 检查排除关键词
      if (rule.negativeKeywords) {
        const hasNegative = rule.negativeKeywords.some((kw) =>
          textToAnalyze.includes(kw.toLowerCase()),
        );
        if (hasNegative) continue;
      }

      // 匹配关键词
      const matchedKeywords: string[] = [];
      for (const keyword of rule.keywords) {
        if (textToAnalyze.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword);
        }
      }

      if (matchedKeywords.length > 0) {
        // 计算得分：匹配关键词数 * 优先级
        const score = matchedKeywords.length * rule.priority;
        matches.push({ rule, matchedKeywords, score });
      }
    }

    // 按得分排序
    matches.sort((a, b) => b.score - a.score);

    if (matches.length > 0) {
      const bestMatch = matches[0];
      const confidence = Math.min(
        0.95,
        0.5 + bestMatch.matchedKeywords.length * 0.15,
      );

      return {
        category: bestMatch.rule.category,
        subCategory: bestMatch.rule.subCategory,
        accountCode: bestMatch.rule.accountCode,
        accountName: this.getAccountNameByCode(bestMatch.rule.accountCode),
        confidence,
        reason: `匹配关键词: ${bestMatch.matchedKeywords.join(', ')}`,
        keywords: bestMatch.matchedKeywords,
      };
    }

    // 默认分类
    return {
      category: '管理费用',
      subCategory: '其他',
      accountCode: '660299',
      accountName: '管理费用-其他',
      confidence: 0.3,
      reason: '无法识别具体类别，归入其他',
      keywords: [],
    };
  }

  /**
   * 分析风险
   */
  private analyzeRisks(
    data: {
      sellerName: string;
      itemNames: string;
      amount: number;
      totalAmount: number;
    },
    classification: ExpenseClassification,
  ): string[] {
    const warnings: string[] = [];
    const textToAnalyze = `${data.sellerName} ${data.itemNames}`.toLowerCase();

    // 招待费风险
    if (classification.subCategory === '业务招待费') {
      warnings.push(
        '业务招待费税前扣除有限制（60%且不超过营收0.5%），请注意限额',
      );

      // 检查敏感词
      const sensitiveWords = this.entertainmentKeywords.filter((kw) =>
        textToAnalyze.includes(kw.toLowerCase()),
      );
      if (sensitiveWords.length > 0) {
        warnings.push(
          `发票包含敏感词: ${sensitiveWords.join(', ')}，税务稽查风险较高`,
        );
      }
    }

    // 大额风险
    if (data.amount > 10000) {
      warnings.push(`金额较大(${data.amount}元)，建议保留完整审批流程和合同`);
    }

    // 现金交易风险
    if (data.amount > 1000 && classification.category === '管理费用') {
      warnings.push('建议通过银行转账，现金交易不利于税前扣除证明');
    }

    // 固定资产判定
    if (data.amount >= 5000 && classification.category !== '固定资产') {
      warnings.push(
        `金额${data.amount}元达到固定资产标准，建议核实是否应计入固定资产`,
      );
    }

    return warnings;
  }

  /**
   * 生成处理建议
   */
  private generateSuggestions(
    classification: ExpenseClassification,
    data: { amount: number },
  ): string[] {
    const suggestions: string[] = [];

    if (classification.category === '固定资产') {
      suggestions.push(
        '固定资产需按月计提折旧，预计使用年限请根据资产类型确定',
      );
      suggestions.push(
        '建议建立固定资产台账，记录资产编号、存放位置、使用人等信息',
      );
    }

    if (classification.subCategory === '业务招待费') {
      suggestions.push(
        '业务招待费请保留招待事由、招待对象、参与人员等信息备查',
      );
      suggestions.push(
        '建议严格控制业务招待费支出，优先考虑会议费、宣传费等替代方案',
      );
    }

    if (
      classification.category === '管理费用' &&
      classification.subCategory.includes('差旅')
    ) {
      suggestions.push('差旅费报销需附出差申请、行程单等相关证明材料');
    }

    if (data.amount > 5000) {
      suggestions.push('大额支出建议签订正式合同，并通过银行转账支付');
    }

    // 科目建议
    suggestions.push(
      `建议计入科目：${classification.accountName}(${classification.accountCode})`,
    );

    return suggestions;
  }

  /**
   * 判断是否为招待费
   */
  private isEntertainmentExpense(
    classification: ExpenseClassification,
    data: { sellerName: string; itemNames: string },
  ): boolean {
    if (classification.subCategory === '业务招待费') {
      return true;
    }

    const text = `${data.sellerName} ${data.itemNames}`.toLowerCase();
    return this.entertainmentKeywords.some((kw) =>
      text.includes(kw.toLowerCase()),
    );
  }

  /**
   * 批量分类发票
   */
  async batchClassifyInvoices(
    invoiceIds: number[],
    enterpriseId: number,
  ): Promise<InvoiceAnalysis[]> {
    const results: InvoiceAnalysis[] = [];

    for (const invoiceId of invoiceIds) {
      try {
        const analysis = await this.classifyInvoice(invoiceId, enterpriseId);
        results.push(analysis);
      } catch (error) {
        this.logger.error(`分类发票${invoiceId}失败`, error);
      }
    }

    return results;
  }

  /**
   * 根据科目代码获取科目名称（简化版）
   */
  private getAccountNameByCode(code: string): string {
    const nameMap: Record<string, string> = {
      '660201': '管理费用-办公费',
      '660202': '管理费用-邮电费',
      '66020301': '管理费用-差旅费-交通',
      '66020302': '管理费用-差旅费-住宿',
      '66020303': '管理费用-差旅费-伙食',
      '660204': '管理费用-业务招待费',
      '66020501': '管理费用-车辆费-油费',
      '66020502': '管理费用-车辆费-维修',
      '66020503': '管理费用-车辆费-保险',
      '660206': '管理费用-咨询费',
      '66020701': '管理费用-租赁费-房租',
      '66020702': '管理费用-租赁费-设备',
      '660208': '管理费用-水电费',
      '660209': '管理费用-修理费',
      '660299': '管理费用-其他',
      '660101': '销售费用-广告费',
      '660102': '销售费用-业务宣传费',
      '1601': '固定资产-电子设备',
      '1602': '固定资产-办公家具',
      '1603': '固定资产-运输设备',
      '221101': '应付职工薪酬-职工福利',
      '221102': '应付职工薪酬-社会保险',
      '221103': '应付职工薪酬-住房公积金',
      '222104': '应交税费-印花税',
    };

    return nameMap[code] || '其他';
  }

  /**
   * 获取分类统计
   */
  async getClassificationStats(
    enterpriseId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<
    {
      category: string;
      subCategory: string;
      count: number;
      totalAmount: number;
    }[]
  > {
    // 这里应该查询已分类的发票数据
    // 简化实现，返回空数组
    return [];
  }
}
