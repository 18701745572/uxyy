import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AiService, type OcrResult } from './ai.service';

@Processor('ai-ocr')
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(private readonly aiService: AiService) {
    super();
  }

  async process(
    job: Job<{ imageUrl: string; enterpriseId: number }>,
  ): Promise<OcrResult> {
    this.logger.log(
      `Processing OCR job ${job.id} for image: ${job.data.imageUrl}`,
    );

    try {
      // 调用 AI 服务进行 OCR 识别
      const result = await this.aiService.processOcr(job.data.imageUrl);

      this.logger.log(`OCR job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`OCR job ${job.id} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} has failed with error: ${error.message}`);
  }
}

@Processor('ai-suggestion')
export class SuggestionProcessor extends WorkerHost {
  private readonly logger = new Logger(SuggestionProcessor.name);

  async process(
    job: Job<{ type: string; enterpriseId: number }>,
  ): Promise<any> {
    this.logger.log(
      `Processing suggestion job ${job.id} for type: ${job.data.type}`,
    );

    // 这里可以实现更复杂的 AI 分析逻辑
    // 例如调用大语言模型 API 进行数据分析

    return {
      type: job.data.type,
      enterpriseId: job.data.enterpriseId,
      generatedAt: new Date().toISOString(),
    };
  }
}
