import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, UnrecoverableError } from 'bullmq';
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

  async process(job: Job<AiJobPayload>): Promise<Record<string, unknown>> {
    if (job.name !== AI_PROCESS_JOB) {
      throw new UnrecoverableError(
        `未知任务名: ${job.name}（期望 ${AI_PROCESS_JOB}）`,
      );
    }
    const { taskId, taskType, payload } = job.data;
    const attempt = (job.attemptsMade ?? 0) + 1;
    const maxAttempts = (job.opts.attempts as number) ?? 3;

    this.logger.log(
      `处理任务 taskId=${taskId} type=${taskType} attempt=${attempt}/${maxAttempts}`,
    );

    await this.ai.markProcessing(taskId);

    try {
      let raw: string;

      // OCR 发票识别使用多模态接口（支持图片输入）
      if (taskType === 'ocr_invoice') {
        raw = await this.processOcrInvoice(payload);
      } else {
        // 其他任务使用普通文本接口
        const messages = this.buildPrompt(taskType, payload);
        raw = await this.llm.chat(messages, {
          temperature: 0.3,
          maxTokens: 2000,
        });
      }

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

  /**
   * 处理发票 OCR 识别（使用 Qwen-VL 多模态能力）
   * 支持全字段识别：基本信息、购销方信息、商品明细、其他信息
   */
  private async processOcrInvoice(
    payload: Record<string, unknown>,
  ): Promise<string> {
    const imageUrl = payload.imageUrl as string | undefined;
    const imageBase64 = payload.imageBase64 as string | undefined;

    if (!imageUrl && !imageBase64) {
      throw new Error('OCR 任务需要提供 imageUrl 或 imageBase64');
    }

    const sysPrompt = `你是专业的发票识别 AI。请仔细识别发票图片，提取所有可见字段并以 JSON 格式输出，不要输出任何其他内容。

输出格式要求：
{
  "invoiceType": "发票类型（增值税专用发票/增值税普通发票/电子普通发票/专用发票等）",
  "invoiceCode": "发票代码（10位或12位数字）",
  "invoiceNumber": "发票号码（8位数字）",
  "invoiceDate": "开票日期（格式：YYYY-MM-DD）",
  
  "buyerName": "购买方名称",
  "buyerTaxId": "购买方纳税人识别号/统一社会信用代码",
  "buyerAddress": "购买方地址、电话",
  "buyerBank": "购买方开户行及账号",
  
  "sellerName": "销售方名称",
  "sellerTaxId": "销售方纳税人识别号/统一社会信用代码",
  "sellerAddress": "销售方地址、电话",
  "sellerBank": "销售方开户行及账号",
  
  "items": [
    {
      "name": "货物或应税劳务、服务名称",
      "specification": "规格型号（如有）",
      "unit": "单位（如有）",
      "quantity": 数量数值,
      "price": 单价数值,
      "amount": 金额数值,
      "taxRate": "税率（如：13%、6%、免税等）",
      "taxAmount": 税额数值
    }
  ],
  
  "amount": 不含税金额合计数值,
  "taxRate": "合计税率",
  "taxAmount": 税额合计数值,
  "totalAmount": 价税合计（小写）数值,
  "totalAmountCn": "价税合计（大写）",
  
  "remarks": "备注（如有）",
  "drawer": "开票人",
  "reviewer": "复核人（如有）",
  "payee": "收款人（如有）",
  
  "confidence": 0.95,
  "ocrText": "识别到的原始文本（用于人工核对）"
}`;

    const userPrompt =
      '请仔细识别这张发票图片，提取所有字段信息，包括：发票代码、号码、日期、购买方和销售方的完整信息（名称、税号、地址电话、开户行账号）、商品明细（名称、规格、单位、数量、单价、金额、税率、税额）、金额合计、价税合计大小写、备注、开票人等信息。以JSON格式返回。';

    // 支持 URL 或 Base64 图片
    const finalImageUrl = imageUrl
      ? imageUrl
      : `data:image/jpeg;base64,${imageBase64}`;

    return this.llm.chatWithImage(sysPrompt, userPrompt, finalImageUrl, {
      temperature: 0.1, // OCR 任务使用较低温度，提高准确性
      maxTokens: 4000, // 增加 token 限制以支持更多字段
    });
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
