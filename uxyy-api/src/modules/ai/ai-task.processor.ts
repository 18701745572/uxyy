import { Processor, Process, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AiService } from './ai.service';

export interface OcrJobData {
  imageUrl: string;
  userId: number;
  enterpriseId: number;
  callbackUrl?: string;
}

export interface SmartSuggestionJobData {
  type: 'accounting' | 'inventory' | 'customer';
  data: Record<string, any>;
  userId: number;
  enterpriseId: number;
}

@Processor('ai-tasks')
export class AiTaskProcessor {
  private readonly logger = new Logger(AiTaskProcessor.name);

  constructor(private readonly aiService: AiService) {}

  // ========== OCR 处理任务 ==========
  @Process('ocr')
  async handleOcr(job: Job<OcrJobData>) {
    this.logger.log(`Processing OCR job ${job.id} for user ${job.data.userId}`);
    
    try {
      const { imageUrl, userId, enterpriseId } = job.data;
      
      // 调用 AI 服务进行 OCR
      const result = await this.aiService.processOcr(imageUrl);
      
      this.logger.log(`OCR job ${job.id} completed successfully`);
      
      return {
        success: true,
        jobId: job.id,
        userId,
        enterpriseId,
        result,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`OCR job ${job.id} failed:`, error);
      throw error;
    }
  }

  // ========== 智能建议任务 ==========
  @Process('smart-suggestion')
  async handleSmartSuggestion(job: Job<SmartSuggestionJobData>) {
    this.logger.log(`Processing smart suggestion job ${job.id}`);
    
    try {
      const { type, data, userId, enterpriseId } = job.data;
      
      let result;
      
      switch (type) {
        case 'accounting':
          result = await this.aiService.getAccountingSuggestion(data);
          break;
        case 'inventory':
          result = await this.aiService.getInventorySuggestion(data);
          break;
        case 'customer':
          result = await this.aiService.getCustomerSuggestion(data);
          break;
        default:
          throw new Error(`Unknown suggestion type: ${type}`);
      }
      
      this.logger.log(`Smart suggestion job ${job.id} completed successfully`);
      
      return {
        success: true,
        jobId: job.id,
        userId,
        enterpriseId,
        type,
        result,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Smart suggestion job ${job.id} failed:`, error);
      throw error;
    }
  }

  // ========== 发票识别任务 ==========
  @Process('invoice-recognition')
  async handleInvoiceRecognition(job: Job<OcrJobData>) {
    this.logger.log(`Processing invoice recognition job ${job.id}`);
    
    try {
      const { imageUrl, userId, enterpriseId } = job.data;
      
      // 先进行 OCR 识别
      const ocrResult = await this.aiService.processOcr(imageUrl);
      
      if (!ocrResult.success) {
        throw new Error(`OCR failed: ${ocrResult.error}`);
      }
      
      // 解析发票信息
      const invoiceData = await this.aiService.parseInvoiceData(ocrResult);
      
      this.logger.log(`Invoice recognition job ${job.id} completed successfully`);
      
      return {
        success: true,
        jobId: job.id,
        userId,
        enterpriseId,
        invoiceData,
        rawOcr: ocrResult,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Invoice recognition job ${job.id} failed:`, error);
      throw error;
    }
  }

  // ========== 任务完成回调 ==========
  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} of type ${job.name} completed with result:`, result);
  }

  // ========== 任务失败回调 ==========
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} of type ${job.name} failed with error:`, error.message);
    
    // 这里可以添加失败通知逻辑，比如发送邮件或 webhook
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      this.logger.error(`Job ${job.id} failed permanently after ${job.attemptsMade} attempts`);
      // 记录到死信队列或发送告警
    }
  }
}
