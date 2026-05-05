import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
}

@Injectable()
export class AiLlmService {
  private readonly logger = new Logger(AiLlmService.name);
  private readonly provider: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.provider =
      config.get<string>('AI_LLM_PROVIDER')?.toLowerCase() ?? 'mock';

    if (this.provider === 'qwen') {
      this.apiKey = config.getOrThrow<string>('AI_QWEN_API_KEY');
      this.model = config.get<string>('AI_LLM_MODEL') ?? 'qwen-turbo';
      this.baseUrl =
        config.get<string>('AI_LLM_BASE_URL') ??
        'https://dashscope.aliyuncs.com/compatible-mode/v1';
    } else if (this.provider === 'deepseek') {
      this.apiKey = config.getOrThrow<string>('AI_DEEPSEEK_API_KEY');
      this.model = config.get<string>('AI_LLM_MODEL') ?? 'deepseek-chat';
      this.baseUrl =
        config.get<string>('AI_LLM_BASE_URL') ?? 'https://api.deepseek.com/v1';
    } else {
      this.apiKey = '';
      this.model = 'mock';
      this.baseUrl = '';
      this.logger.warn(
        'AI_LLM_PROVIDER 未设置或为 "mock"，将使用 MockProvider。线上请配置真实 Provider。',
      );
    }
  }

  async chat(
    messages: LlmMessage[],
    opts: LlmChatOptions = {},
  ): Promise<string> {
    if (this.provider === 'mock') {
      return this.mockChat(messages);
    }
    return this.openAiCompatChat(messages, opts);
  }

  /**
   * 通过 OpenAI 兼容 API 调用（通义千问 DashScope / DeepSeek 均为兼容格式）
   */
  private async openAiCompatChat(
    messages: LlmMessage[],
    opts: LlmChatOptions,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(
        `LLM API 返回 ${response.status}: ${errBody.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('LLM 返回了空内容');
    }
    return content;
  }

  private mockChat(messages: LlmMessage[]): string {
    this.logger.debug('MockProvider 生成回复');
    const userMsg = messages.find((m) => m.role === 'user')?.content ?? '';

    if (userMsg.includes('发票') || userMsg.includes('invoice')) {
      return JSON.stringify({
        suggestionType: 'invoice_entry',
        confidence: 0.92,
        entries: [
          {
            accountSubject: '6601',
            debit: 100.0,
            credit: 0,
            description: '办公用品采购（AI 识别）',
          },
          {
            accountSubject: '1001',
            debit: 0,
            credit: 100.0,
            description: '银行存款支付',
          },
        ],
      });
    }

    if (userMsg.includes('凭证') || userMsg.includes('voucher')) {
      return JSON.stringify({
        suggestionType: 'voucher_suggestion',
        confidence: 0.85,
        entries: [
          {
            accountSubject: '6602',
            debit: 50.0,
            credit: 0,
            description: '管理费用（AI 建议）',
          },
          {
            accountSubject: '1002',
            debit: 0,
            credit: 50.0,
            description: '银行付款',
          },
        ],
      });
    }

    return JSON.stringify({
      suggestionType: 'classification',
      confidence: 0.78,
      entries: [
        {
          accountSubject: '6601',
          debit: 0,
          credit: 0,
          description: 'Mock 分类建议',
        },
      ],
    });
  }
}
