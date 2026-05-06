import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 文本内容部分
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * 图片内容部分（支持 URL 或 Base64）
 */
export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export type MessageContent = TextContent | ImageContent;

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
}

interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

@Injectable()
export class AiLlmService {
  private readonly logger = new Logger(AiLlmService.name);
  private readonly defaultProvider: string;
  private readonly deepseekConfig: ProviderConfig;
  private readonly qwenConfig: ProviderConfig;

  constructor(private readonly config: ConfigService) {
    // 默认文本推理 Provider
    this.defaultProvider =
      config.get<string>('AI_LLM_PROVIDER')?.toLowerCase() ?? 'mock';

    // DeepSeek 配置（默认文本任务）
    this.deepseekConfig = {
      apiKey: config.get<string>('AI_DEEPSEEK_API_KEY') ?? '',
      model: config.get<string>('AI_LLM_MODEL') ?? 'deepseek-v4-flash',
      baseUrl:
        config.get<string>('AI_LLM_BASE_URL') ?? 'https://api.deepseek.com/v1',
    };

    // 阿里云百炼配置（OCR 多模态任务）
    this.qwenConfig = {
      apiKey: config.get<string>('AI_QWEN_API_KEY') ?? '',
      model: config.get<string>('AI_QWEN_MODEL') ?? 'qwen-vl-plus',
      baseUrl:
        config.get<string>('AI_QWEN_BASE_URL') ??
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
    };

    // 检查配置
    if (this.defaultProvider === 'mock') {
      this.logger.warn(
        'AI_LLM_PROVIDER 未设置或为 "mock"，将使用 MockProvider。线上请配置真实 Provider。',
      );
    }
  }

  /**
   * 默认文本聊天（使用 DeepSeek）
   */
  async chat(
    messages: LlmMessage[],
    opts: LlmChatOptions = {},
  ): Promise<string> {
    if (this.defaultProvider === 'mock') {
      return this.mockChat(messages);
    }
    // 默认使用 DeepSeek 进行文本推理
    return this.openAiCompatChat(this.deepseekConfig, messages, opts);
  }

  /**
   * 多模态 OCR 识别（使用 Qwen-VL）
   * 适用于发票识别等需要图片输入的场景
   */
  async chatWithImage(
    systemPrompt: string,
    userText: string,
    imageUrl: string,
    opts: LlmChatOptions = {},
  ): Promise<string> {
    if (this.defaultProvider === 'mock') {
      return this.mockChat([{ role: 'user', content: userText }]);
    }

    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ];

    // OCR 任务使用阿里云百炼 Qwen-VL
    return this.openAiCompatChat(this.qwenConfig, messages, opts);
  }

  /**
   * 通过 OpenAI 兼容 API 调用
   */
  private async openAiCompatChat(
    provider: ProviderConfig,
    messages: LlmMessage[],
    opts: LlmChatOptions,
  ): Promise<string> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
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
    const content = messages.find((m) => m.role === 'user')?.content ?? '';
    // 支持多模态消息（数组格式）
    const userMsg =
      typeof content === 'string'
        ? content
        : (content.find((c) => c.type === 'text')?.text ?? '');

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
