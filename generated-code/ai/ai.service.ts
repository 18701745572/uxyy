import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
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
  constructor(
    @InjectQueue('ai-ocr') private readonly ocrQueue: Queue,
    @InjectQueue('ai-suggestion') private readonly suggestionQueue: Queue,
  ) {}

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

  // 模拟 OCR 处理（实际应该调用通义千问/DeepSeek API）
  async processOcr(imageUrl: string): Promise<OcrResult> {
    // 这里模拟 OCR 处理结果
    // 实际实现应该调用外部 AI API
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
    // 提交异步任务
    const job = await this.suggestionQueue.add('smart-suggestion', {
      type: dto.type,
      enterpriseId: dto.enterpriseId,
    });

    // 简化实现，直接返回模拟建议
    const suggestions = this.generateMockSuggestions(dto.type);
    
    return { suggestions };
  }

  private generateMockSuggestions(type: string): string[] {
    const suggestions: Record<string, string[]> = {
      inventory: [
        '库存商品A库存量较低，建议及时补货',
        '商品B近30天销量下降20%，建议调整营销策略',
        '发现3个商品存在滞销风险，建议促销处理',
      ],
      finance: [
        '本月应收账款回收率低于平均水平，建议加强催收',
        '发现2笔异常大额支出，建议核实',
        '建议优化现金流，可考虑缩短应收账款周期',
      ],
      customer: [
        '客户A已30天未下单，建议跟进维护',
        '发现5个高价值潜在客户，建议重点跟进',
        '客户满意度调查显示有改善空间',
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
