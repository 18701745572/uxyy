import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { Queue } from 'bullmq';
import type { AppDrizzleDb } from '../database/database.module';
import { DRIZZLE_DB } from '../database/database.constants';
import { aiTasks } from '../../db/schema';
import {
  AI_DEFAULT_QUEUE,
  AI_DLQ_QUEUE,
  AI_PROCESS_JOB,
  AI_JOB_OPTS,
} from './ai.constants';
import type { AiTaskType } from './ai.constants';
import { AiLlmService } from './ai.llm';
import type { SubmitTaskDto } from './ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectQueue(AI_DEFAULT_QUEUE) private readonly aiQueue: Queue,
    @InjectQueue(AI_DLQ_QUEUE) private readonly dlqQueue: Queue,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
    private readonly llm: AiLlmService,
  ) {}

  // ── 异步任务提交 ──

  async submitTask(dto: SubmitTaskDto, enterpriseId: number, userId: number) {
    // 幂等检查
    if (dto.clientKey) {
      const existing = await this.db
        .select()
        .from(aiTasks)
        .where(
          and(
            eq(aiTasks.enterpriseId, enterpriseId),
            eq(aiTasks.taskType, dto.taskType),
            eq(aiTasks.clientKey, dto.clientKey),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        return this.toResponse(existing[0]);
      }
    }

    const [task] = await this.db
      .insert(aiTasks)
      .values({
        enterpriseId,
        userId,
        taskType: dto.taskType,
        clientKey: dto.clientKey ?? null,
        status: 'pending',
        inputPayload: dto.payload,
      })
      .returning();

    const jobId = `ai:${dto.taskType}:${dto.clientKey ?? task.id}`;
    const job = await this.aiQueue.add(
      AI_PROCESS_JOB,
      {
        taskId: task.id,
        taskType: dto.taskType,
        payload: dto.payload,
      },
      { jobId, ...AI_JOB_OPTS },
    );

    await this.db
      .update(aiTasks)
      .set({ jobId: job.id!, updatedAt: sql`now()` })
      .where(eq(aiTasks.id, task.id));

    const [updated] = await this.db
      .select()
      .from(aiTasks)
      .where(eq(aiTasks.id, task.id));

    return this.toResponse(updated);
  }

  // ── 查询 ──

  async listTasks(
    enterpriseId: number,
    filters: {
      taskType?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(aiTasks.enterpriseId, enterpriseId)];
    if (filters.taskType)
      conditions.push(eq(aiTasks.taskType, filters.taskType));
    if (filters.status) conditions.push(eq(aiTasks.status, filters.status));

    const [rows, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(aiTasks)
        .where(and(...conditions))
        .orderBy(sql`${aiTasks.createdAt} DESC`)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(aiTasks)
        .where(and(...conditions)),
    ]);

    return {
      list: rows.map((r) => this.toResponse(r)),
      pagination: { page, pageSize, total: count },
    };
  }

  async getTask(enterpriseId: number, taskId: number) {
    const [row] = await this.db
      .select()
      .from(aiTasks)
      .where(
        and(eq(aiTasks.id, taskId), eq(aiTasks.enterpriseId, enterpriseId)),
      )
      .limit(1);

    return row ? this.toResponse(row) : null;
  }

  // ── 智能建议（同步便捷接口，内部走异步任务） ──

  async getSmartSuggestions(
    type: 'inventory' | 'finance' | 'customer',
    enterpriseId: number,
    userId: number,
  ) {
    const task = await this.submitTask(
      {
        taskType: 'accounting_suggestion',
        payload: { suggestionDomain: type },
      },
      enterpriseId,
      userId,
    );

    // 同步等待 LLM 直接返回建议（不走队列轮询，方便前端快速体验）
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content:
          '你是专业的企业管理 AI。根据请求输出 3-5 条具体可执行的优化建议，每条以 "- " 开头。只输出列表。',
      },
      {
        role: 'user',
        content:
          type === 'inventory'
            ? '请为该企业提供库存优化建议（库存周转、安全库存、滞销处理、补货策略）'
            : type === 'finance'
              ? '请为该企业提供财务优化建议（现金流、成本控制、应收应付、税务）'
              : '请为该企业提供客户管理建议（客户维护、潜在挖掘、满意度、流失预警）',
      },
    ];

    try {
      const raw = await this.llm.chat(messages, {
        temperature: 0.5,
        maxTokens: 800,
      });
      const suggestions = raw
        .split('\n')
        .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('•'))
        .map((l) => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);

      return {
        task,
        suggestions:
          suggestions.length > 0 ? suggestions : ['暂无建议（可稍后重试）'],
      };
    } catch {
      return {
        task,
        suggestions: ['AI 服务暂时不可用，请稍后重试'],
      };
    }
  }

  // ── 队列统计 ──

  async getQueueStats() {
    const [counts, dlqCounts] = await Promise.all([
      this.aiQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ),
      this.dlqQueue.getJobCounts(
        'waiting',
        'active',
        'completed',
        'failed',
        'delayed',
        'paused',
      ),
    ]);

    return {
      queue: AI_DEFAULT_QUEUE,
      counts,
      dlqQueue: AI_DLQ_QUEUE,
      dlqCounts,
    };
  }

  // ── Processor 回调 ──

  async markProcessing(taskId: number) {
    await this.db
      .update(aiTasks)
      .set({ status: 'processing', updatedAt: sql`now()` })
      .where(eq(aiTasks.id, taskId));
  }

  async markCompleted(taskId: number, output: Record<string, unknown>) {
    await this.db
      .update(aiTasks)
      .set({
        status: 'completed',
        outputPayload: output,
        updatedAt: sql`now()`,
        attempts: sql`${aiTasks.attempts} + 1`,
      })
      .where(eq(aiTasks.id, taskId));
  }

  async markFailed(taskId: number, errorMessage: string, toDlq: boolean) {
    await this.db
      .update(aiTasks)
      .set({
        status: toDlq ? 'dead' : 'failed',
        errorMessage,
        updatedAt: sql`now()`,
        attempts: sql`${aiTasks.attempts} + 1`,
      })
      .where(eq(aiTasks.id, taskId));
    if (toDlq) {
      this.logger.warn(`任务 ${taskId} 已移入死信队列`);
    }
  }

  // ── 内部 ──

  private toResponse(row: typeof aiTasks.$inferSelect) {
    return {
      id: row.id,
      taskType: row.taskType,
      status: row.status,
      clientKey: row.clientKey,
      inputPayload: row.inputPayload as Record<string, unknown> | null,
      outputPayload: row.outputPayload as Record<string, unknown> | null,
      errorMessage: row.errorMessage,
      attempts: row.attempts,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
