import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';

export interface ScriptTemplate {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  effectiveness: number; // 成功率
}

export interface GeneratedScript {
  type: string;
  title: string;
  content: string;
  tips: string[];
  alternatives: string[];
}

@Injectable()
export class AiScriptService {
  private readonly logger = new Logger(AiScriptService.name);

  // 话术模板库
  private readonly scriptTemplates: ScriptTemplate[] = [
    {
      id: '1',
      category: '首次联系',
      title: '初次破冰',
      content:
        '您好，我是{company}的{name}，很高兴认识您。我了解到贵公司在{industry}领域很有建树，我们有一些相关的解决方案，不知道您是否有兴趣了解一下？',
      tags: ['初次', '礼貌', '专业'],
      effectiveness: 85,
    },
    {
      id: '2',
      category: '需求挖掘',
      title: '痛点探询',
      content:
        '张总，目前贵公司在{area}方面，主要遇到哪些挑战呢？我们服务过很多同行业客户，他们普遍反馈{common_pain_point}，不知道您这边情况如何？',
      tags: ['提问', '倾听', '共情'],
      effectiveness: 90,
    },
    {
      id: '3',
      category: '产品介绍',
      title: '价值呈现',
      content:
        '我们的产品可以帮助您解决{problem}，具体体现在：1）{benefit1}；2）{benefit2}；3）{benefit3}。像{case_company}这样的客户使用后，{case_result}。',
      tags: ['价值', '案例', '数据'],
      effectiveness: 88,
    },
    {
      id: '4',
      category: '价格谈判',
      title: '价值锚定',
      content:
        '我理解您对价格的考虑。其实我们的产品虽然比市面上同类产品略高，但考虑到{value_point}，以及{roi_calculation}，实际上您的投入产出比会更高。我们可以根据您的采购量，申请一个优惠方案。',
      tags: ['价值', '对比', '让步'],
      effectiveness: 82,
    },
    {
      id: '5',
      category: '异议处理',
      title: '顾虑化解',
      content:
        '您提到的{objection}确实是很多客户关心的问题。实际上，{explanation}。另外，我们还提供{guarantee}，确保您没有后顾之忧。',
      tags: ['认同', '解释', '保障'],
      effectiveness: 87,
    },
    {
      id: '6',
      category: '促成成交',
      title: '限时促单',
      content:
        '张总，如果您今天能确定下来，我可以帮您申请{special_offer}。这个优惠名额有限，而且{urgency_reason}。您看是签{option1}还是{option2}更合适？',
      tags: ['紧迫', '选择', '优惠'],
      effectiveness: 80,
    },
    {
      id: '7',
      category: '售后跟进',
      title: '满意度回访',
      content:
        '张总，产品使用了一段时间了，您感觉怎么样？有没有遇到什么问题？我们非常重视您的反馈，有任何需要随时联系我。',
      tags: ['关怀', '服务', '维护'],
      effectiveness: 92,
    },
    {
      id: '8',
      category: '挽回客户',
      title: '流失挽回',
      content:
        '张总，好久不见了。最近我们推出了{new_feature}，我觉得特别适合贵公司。不知道您最近有没有这方面的需求？我们可以约个时间详细聊聊。',
      tags: ['新品', '唤醒', '邀约'],
      effectiveness: 75,
    },
  ];

  constructor(@Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb) {}

  /**
   * 根据场景生成话术
   */
  async generateScript(
    customerId: number,
    scene: string,
    enterpriseId: number,
  ): Promise<GeneratedScript[]> {
    const scripts: GeneratedScript[] = [];

    // 获取客户信息
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, enterpriseId),
        ),
      );

    if (!customer) {
      return scripts;
    }

    // 获取历史跟进记录
    const followUps = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(5);

    // 获取商机信息
    const opportunities = await this.db
      .select()
      .from(schema.opportunities)
      .where(
        and(
          eq(schema.opportunities.customerId, customerId),
          eq(schema.opportunities.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.opportunities.createdAt))
      .limit(3);

    // 根据场景选择话术
    const templates = this.getTemplatesByScene(scene);

    for (const template of templates) {
      const script = await this.fillTemplate(
        template,
        customer,
        followUps,
        opportunities,
      );
      scripts.push(script);
    }

    return scripts;
  }

  /**
   * 根据客户状态智能推荐话术
   */
  async recommendScriptByCustomerStatus(
    customerId: number,
    enterpriseId: number,
  ): Promise<GeneratedScript[]> {
    const scripts: GeneratedScript[] = [];

    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, enterpriseId),
        ),
      );

    if (!customer) {
      return scripts;
    }

    // 分析客户状态
    const followUpCount = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      );

    const orderCount = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.customerId, customerId),
          eq(schema.salesOrders.enterpriseId, enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
        ),
      );

    const lastFollowUp = await this.db
      .select()
      .from(schema.followUpRecords)
      .where(
        and(
          eq(schema.followUpRecords.customerId, customerId),
          eq(schema.followUpRecords.enterpriseId, enterpriseId),
        ),
      )
      .orderBy(desc(schema.followUpRecords.createdAt))
      .limit(1);

    const daysSinceLastFollowUp = lastFollowUp[0]
      ? Math.floor(
          (Date.now() - new Date(lastFollowUp[0].createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    // 根据客户状态推荐话术
    if (followUpCount[0]?.count === 0) {
      // 新客户
      const script = await this.generateScript(
        customerId,
        '首次联系',
        enterpriseId,
      );
      scripts.push(...script);
    } else if (
      orderCount[0]?.count > 0 &&
      daysSinceLastFollowUp &&
      daysSinceLastFollowUp > 30
    ) {
      // 老客户，长时间未联系
      const script = await this.generateScript(
        customerId,
        '售后跟进',
        enterpriseId,
      );
      scripts.push(...script);
    } else if (daysSinceLastFollowUp && daysSinceLastFollowUp > 14) {
      // 跟进中断
      const script = await this.generateScript(
        customerId,
        '挽回客户',
        enterpriseId,
      );
      scripts.push(...script);
    } else {
      // 常规跟进
      const script = await this.generateScript(
        customerId,
        '需求挖掘',
        enterpriseId,
      );
      scripts.push(...script);
    }

    return scripts;
  }

  /**
   * 获取话术模板库
   */
  getScriptTemplates(category?: string): ScriptTemplate[] {
    if (category) {
      return this.scriptTemplates.filter((t) => t.category === category);
    }
    return this.scriptTemplates;
  }

  /**
   * 根据场景获取模板
   */
  private getTemplatesByScene(scene: string): ScriptTemplate[] {
    const sceneMapping: Record<string, string[]> = {
      首次联系: ['首次联系'],
      需求挖掘: ['需求挖掘'],
      产品介绍: ['产品介绍'],
      价格谈判: ['价格谈判'],
      /** 教程 / 产品用语：与「价格谈判」共用模板 */
      谈判协商: ['价格谈判'],
      异议处理: ['异议处理'],
      促成成交: ['促成成交'],
      售后跟进: ['售后跟进'],
      挽回客户: ['挽回客户'],
    };

    const categories = sceneMapping[scene] || ['首次联系'];
    return this.scriptTemplates.filter((t) => categories.includes(t.category));
  }

  /**
   * 填充模板
   */
  private async fillTemplate(
    template: ScriptTemplate,
    customer: typeof schema.customers.$inferSelect,
    followUps: (typeof schema.followUpRecords.$inferSelect)[],
    opportunities: (typeof schema.opportunities.$inferSelect)[],
  ): Promise<GeneratedScript> {
    let content = template.content;

    // 替换客户相关变量
    content = content.replace(/{customer_name}/g, customer.name || '张总');
    content = content.replace(/{company}/g, customer.name || '我们公司');
    content = content.replace(/{industry}/g, customer.industry || '相关');
    content = content.replace(/{name}/g, customer.contactPerson || '张总');

    // 替换需求挖掘相关变量
    content = content.replace(/{area}/g, customer.industry || '业务');
    content = content.replace(/{common_pain_point}/g, '效率提升和成本控制');

    // 替换产品介绍相关变量
    content = content.replace(/{problem}/g, '效率低下和成本过高的问题');
    content = content.replace(/{benefit1}/g, '提升30%的工作效率');
    content = content.replace(/{benefit2}/g, '降低20%的运营成本');
    content = content.replace(/{benefit3}/g, '提供专业的技术支持');
    content = content.replace(/{case_company}/g, '同行业标杆企业');
    content = content.replace(/{case_result}/g, '实现了显著的效益提升');

    // 替换价格谈判相关变量
    content = content.replace(/{value_point}/g, '产品质量和售后服务');
    content = content.replace(/{roi_calculation}/g, '长期使用成本更低');

    // 替换异议处理相关变量
    content = content.replace(/{objection}/g, '顾虑');
    content = content.replace(/{explanation}/g, '我们有完善的解决方案');
    content = content.replace(/{guarantee}/g, '全程技术支持和售后保障');

    // 替换促成成交相关变量
    content = content.replace(/{special_offer}/g, '特别优惠');
    content = content.replace(/{urgency_reason}/g, '活动即将结束');
    content = content.replace(/{option1}/g, '标准版');
    content = content.replace(/{option2}/g, '专业版');

    // 替换挽回客户相关变量
    content = content.replace(/{new_feature}/g, '新功能');
    content = content.replace(/{topic}/g, '行业解决方案');
    content = content.replace(/{product}/g, '产品');
    content = content.replace(/{option}/g, '推荐方案');

    // 清理未被替换的变量（兜底处理）
    content = content.replace(/\{[a-zA-Z_]+\}/g, '');

    // 根据模板类型添加提示
    const tips = this.getTipsByCategory(template.category);
    const alternatives = this.getAlternativesByCategory(template.category);

    // 清理替代话术中的变量
    const cleanedAlternatives = alternatives.map((alt) => {
      let cleaned = alt;
      cleaned = cleaned.replace(/{name}/g, customer.contactPerson || '张总');
      cleaned = cleaned.replace(/{company}/g, customer.name || '我们公司');
      cleaned = cleaned.replace(/{product}/g, '产品');
      cleaned = cleaned.replace(/{topic}/g, '行业解决方案');
      cleaned = cleaned.replace(/{option}/g, '推荐方案');
      cleaned = cleaned.replace(/\{[a-zA-Z_]+\}/g, '');
      return cleaned;
    });

    return {
      type: template.category,
      title: template.title,
      content,
      tips,
      alternatives: cleanedAlternatives,
    };
  }

  /**
   * 获取话术技巧
   */
  private getTipsByCategory(category: string): string[] {
    const tipsMap: Record<string, string[]> = {
      首次联系: [
        '保持语气友好但专业',
        '控制通话时间在2分钟内',
        '重点突出价值主张',
      ],
      需求挖掘: ['多用开放式问题', '认真倾听，适时回应', '记录客户痛点'],
      产品介绍: ['聚焦客户痛点', '用数据和案例说话', '强调差异化优势'],
      价格谈判: ['先谈价值再谈价格', '了解客户预算范围', '准备多套方案'],
      异议处理: ['先认同再解释', '不要与客户争辩', '提供证据支持'],
      促成成交: ['创造适度紧迫感', '提供二选一方案', '确认下一步行动'],
      售后跟进: ['真诚关心客户体验', '主动询问问题', '提供增值服务建议'],
      挽回客户: ['不要追问流失原因', '展示新的价值点', '给予特别优惠'],
    };

    return tipsMap[category] || ['保持专业态度', '关注客户需求'];
  }

  /**
   * 获取替代话术
   */
  private getAlternativesByCategory(category: string): string[] {
    const alternativesMap: Record<string, string[]> = {
      首次联系: [
        '您好，我是{name}，想占用您2分钟时间介绍一下我们的{product}，您现在方便吗？',
        '张总，我是{company}的{name}，朋友推荐我来联系您，听说您最近在关注{topic}？',
      ],
      需求挖掘: [
        '除了刚才提到的，还有其他方面需要改善的吗？',
        '如果这个问题解决了，对您的业务会有什么帮助？',
      ],
      促成成交: [
        '您觉得这个方案如何？如果没问题，我们可以这周就开始实施。',
        '基于您的需求，我建议选择{option}，您看呢？',
      ],
    };

    return alternativesMap[category] || [];
  }
}
