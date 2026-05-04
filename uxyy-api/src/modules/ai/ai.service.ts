import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

export interface OcrInvoiceDto {
  imageUrl: string;
  enterpriseId: number;
}

export interface OcrResult {
  success: boolean;
  invoiceType?: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  amount?: number;
  sellerName?: string;
  buyerName?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    amount: number;
  }>;
  rawText?: string;
  error?: string;
}

export interface SmartSuggestionDto {
  type: 'inventory' | 'finance' | 'customer';
  enterpriseId: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly qwenApiKey: string | undefined;
  private readonly qwenApiUrl: string;

  constructor(
    @InjectQueue('ai-ocr') private readonly ocrQueue: Queue,
    @InjectQueue('ai-suggestion') private readonly suggestionQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.qwenApiKey = this.configService.get<string>('QWEN_API_KEY');
    this.qwenApiUrl = this.configService.get<string>('QWEN_API_URL') || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';
  }

  // ========== OCR 发票识别 ==========
  async submitOcrTask(dto: OcrInvoiceDto): Promise<{ jobId: string; status: string }> {
    const job = await this.ocrQueue.add('ocr-invoice', {
      imageUrl: dto.imageUrl,
      enterpriseId: dto.enterpriseId,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    return {
      jobId: job.id!,
      status: 'pending',
    };
  }

  async getOcrResult(jobId: string): Promise<{ status: string; result?: OcrResult }> {
    const job = await this.ocrQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    
    if (state === 'completed') {
      return {
        status: 'completed',
        result: job.returnvalue as OcrResult,
      };
    } else if (state === 'failed') {
      return {
        status: 'failed',
        result: { success: false, error: job.failedReason },
      };
    } else {
      return { status: state };
    }
  }

  // 调用通义千问 API 进行 OCR 识别
  async processOcr(imageUrl: string): Promise<OcrResult> {
    // 如果没有配置 API Key，返回模拟数据（开发环境）
    if (!this.qwenApiKey) {
      this.logger.warn('QWEN_API_KEY not configured, returning mock data');
      return this.getMockOcrResult();
    }

    try {
      const response = await fetch(this.qwenApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.qwenApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          input: {
            messages: [
              {
                role: 'user',
                content: [
                  { image: imageUrl },
                  { text: '请识别这张发票的内容，提取以下信息：发票类型、发票代码、发票号码、开票日期、金额、销售方名称、购买方名称、商品明细。以JSON格式返回。' },
                ],
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // 解析 AI 返回的结果
      const content = data.output?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response from Qwen API');
      }

      // 尝试从内容中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          invoiceType: parsed.发票类型 || parsed.invoiceType,
          invoiceCode: parsed.发票代码 || parsed.invoiceCode,
          invoiceNumber: parsed.发票号码 || parsed.invoiceNumber,
          invoiceDate: parsed.开票日期 || parsed.invoiceDate,
          amount: parseFloat(parsed.金额 || parsed.amount || '0'),
          sellerName: parsed.销售方名称 || parsed.sellerName,
          buyerName: parsed.购买方名称 || parsed.buyerName,
          items: parsed.商品明细 || parsed.items,
          rawText: content,
        };
      }

      return {
        success: true,
        rawText: content,
      };
    } catch (error) {
      this.logger.error('OCR processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  private getMockOcrResult(): OcrResult {
    return {
      success: true,
      invoiceType: '增值税专用发票',
      invoiceCode: '3100123456',
      invoiceNumber: '12345678',
      invoiceDate: '2026-05-01',
      amount: 10000.00,
      sellerName: '某某科技有限公司',
      buyerName: '某某企业',
      items: [
        { name: '服务费', quantity: 1, price: 9433.96, amount: 9433.96 },
        { name: '税额', quantity: 1, price: 566.04, amount: 566.04 },
      ],
      rawText: '模拟 OCR 识别文本',
    };
  }

  // ========== 智能建议 ==========
  async getSmartSuggestions(dto: SmartSuggestionDto): Promise<{ suggestions: string[] }> {
    // 如果有 API Key，调用 AI 生成建议
    if (this.qwenApiKey) {
      try {
        const suggestions = await this.generateAiSuggestions(dto.type, dto.enterpriseId);
        return { suggestions };
      } catch (error) {
        this.logger.error('Failed to generate AI suggestions:', error);
      }
    }

    // 返回模拟建议
    const suggestions = this.generateMockSuggestions(dto.type);
    return { suggestions };
  }

  private async generateAiSuggestions(type: string, enterpriseId: number): Promise<string[]> {
    const prompt = this.buildSuggestionPrompt(type, enterpriseId);
    
    const response = await fetch(this.qwenApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.qwenApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-max',
        input: {
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Qwen API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.output?.choices?.[0]?.message?.content;
    
    // 解析建议列表
    const suggestions = content
      ?.split('\n')
      .filter((line: string) => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map((line: string) => line.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean) || [];

    return suggestions.length > 0 ? suggestions : ['暂无建议'];
  }

  private buildSuggestionPrompt(type: string, enterpriseId: number): string {
    const prompts: Record<string, string> = {
      inventory: `作为库存管理专家，请为该企业（ID: ${enterpriseId}）提供3-5条库存优化建议。请考虑：
1. 库存周转率优化
2. 安全库存设置
3. 滞销商品处理
4. 补货策略
请以 bullet point 格式返回建议。`,
      
      finance: `作为财务管理专家，请为该企业（ID: ${enterpriseId}）提供3-5条财务优化建议。请考虑：
1. 现金流管理
2. 成本控制
3. 应收应付管理
4. 税务优化
请以 bullet point 格式返回建议。`,
      
      customer: `作为客户关系管理专家，请为该企业（ID: ${enterpriseId}）提供3-5条客户管理建议。请考虑：
1. 客户维护策略
2. 潜在客户挖掘
3. 客户满意度提升
4. 客户流失预警
请以 bullet point 格式返回建议。`,
    };

    return prompts[type] || '请提供企业管理建议。';
  }

  private generateMockSuggestions(type: string): string[] {
    const suggestions: Record<string, string[]> = {
      inventory: [
        '库存商品A库存量较低，建议及时补货',
        '商品B近30天销量下降20%，建议调整营销策略',
        '发现3个商品存在滞销风险，建议促销处理',
        '建议优化安全库存设置，减少资金占用',
        '库存周转率低于行业平均水平，建议加强库存管理',
      ],
      finance: [
        '本月应收账款回收率低于平均水平，建议加强催收',
        '发现2笔异常大额支出，建议核实',
        '建议优化现金流，可考虑缩短应收账款周期',
        '成本控制良好，但仍有5%的优化空间',
        '建议建立预算预警机制，避免超支',
      ],
      customer: [
        '客户A已30天未下单，建议跟进维护',
        '发现5个高价值潜在客户，建议重点跟进',
        '客户满意度调查显示有改善空间',
        '建议建立客户分级管理体系',
        '客户流失率有所上升，建议分析原因并采取措施',
      ],
    };

    return suggestions[type] || ['暂无建议'];
  }

  // ========== 智能记账 ==========
  async autoBookkeeping(invoiceData: OcrResult): Promise<{
    success: boolean;
    voucherData?: {
      entries: Array<{
        subjectId: number;
        subjectName: string;
        debit: number;
        credit: number;
        summary: string;
      }>;
    };
    error?: string;
  }> {
    if (!invoiceData.success) {
      return { success: false, error: 'OCR 识别失败，无法自动记账' };
    }

    // 根据发票类型生成记账凭证
    const entries = [];

    if (invoiceData.invoiceType?.includes('专用')) {
      // 增值税专用发票
      const amount = invoiceData.amount || 0;
      const tax = amount * 0.06; // 假设6%税率
      const netAmount = amount - tax;

      entries.push(
        {
          subjectId: 1,
          subjectName: '管理费用',
          debit: netAmount,
          credit: 0,
          summary: `${invoiceData.sellerName} - 服务费`,
        },
        {
          subjectId: 2,
          subjectName: '应交税费-应交增值税',
          debit: tax,
          credit: 0,
          summary: '进项税额',
        },
        {
          subjectId: 3,
          subjectName: '银行存款',
          debit: 0,
          credit: amount,
          summary: `支付 ${invoiceData.sellerName} 款项`,
        },
      );
    } else {
      // 普通发票
      entries.push(
        {
          subjectId: 1,
          subjectName: '管理费用',
          debit: invoiceData.amount || 0,
          credit: 0,
          summary: `${invoiceData.sellerName} - 费用`,
        },
        {
          subjectId: 3,
          subjectName: '银行存款',
          debit: 0,
          credit: invoiceData.amount || 0,
          summary: `支付 ${invoiceData.sellerName} 款项`,
        },
      );
    }

    return {
      success: true,
      voucherData: { entries },
    };
  }
}
