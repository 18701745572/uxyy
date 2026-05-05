import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiLlmService } from './ai.llm';
import { AiService } from './ai.service';
import { AI_DEFAULT_QUEUE, AI_PROCESS_JOB } from './ai.constants';

interface AiJobPayload {
  taskId: number;
  taskType: string;
  payload: Record<string, unknown>;
}

@Processor(AI_DEFAULT_QUEUE)
export class AiProcessor extends WorkerHost {
  private readonly logger = new Logger(AiProcessor.name);

  constructor(
    private readonly llm: AiLlmService,
    private readonly ai: AiService,
  ) {
    super();
  }

  @Process(AI_PROCESS_JOB)
  async process(job: Job<AiJobPayload>): Promise<Record<string, unknown>> {
    const { taskId, taskType, payload } = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = (job.opts.attempts as number) ?? 3;

    this.logger.log(
      `处理任务 taskId=${taskId} type=${taskType} attempt=${attempt}/${maxAttempts}`,
    );

    await this.ai.markProcessing(taskId);

    try {
      const messages = this.buildPrompt(taskType, payload);
      const raw = await this.llm.chat(messages, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const output = this.extractJson(raw);
      await this.ai.markCompleted(taskId, output);
      this.logger.log(`任务完成 taskId=${taskId}`);
      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      const toDlq = attempt >= maxAttempts;

      this.logger.error(
        `任务失败 taskId=${taskId} attempt=${attempt}/${maxAttempts} dlq=${toDlq}: ${message}`,
      );

      await this.ai.markFailed(taskId, message, toDlq);

      if (toDlq) {
        // 移入死信队列供人工排查
        await this.ai['dlqQueue'].add(
          'dlq',
          { taskId, taskType, payload, error: message },
          { jobId: `dlq:${taskId}:${Date.now()}` },
        );
      }

      throw err;
    }
  }

  private buildPrompt(
    taskType: string,
    payload: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const sys = '你是专业的企业财务 AI。仅输出 JSON，不输出任何其他内容。';

    let user = '';
    if (taskType === 'ocr_invoice') {
      user = `识别以下发票并输出 JSON（字段：invoiceType, amount, sellerName, buyerName, items）: ${JSON.stringify(payload)}`;
    } else if (taskType === 'accounting_suggestion') {
      user = `根据以下信息生成记账建议 JSON（字段：suggestionType, confidence 0-1, entries[{accountSubject, debit, credit, description}]）: ${JSON.stringify(payload)}`;
    } else {
      user = `对以下内容进行财务分类 JSON（字段：suggestionType, confidence 0-1, entries[{accountSubject, debit, credit, description}]）: ${JSON.stringify(payload)}`;
    }

    return [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ];
  }

  private extractJson(raw: string): Record<string, unknown> {
    let json = raw.trim();
    const m = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) json = m[1].trim();
    return JSON.parse(json) as Record<string, unknown>;
  }
}
