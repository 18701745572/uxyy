import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AiService } from './ai.service';
import { AiLlmService } from './ai.llm';
import { DRIZZLE_DB } from '../database/database.constants';
import { FinanceService } from '../finance/finance.service';
import { AI_DEFAULT_QUEUE, AI_DLQ_QUEUE } from './ai.constants';

const now = new Date('2026-05-05T10:00:00Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    enterpriseId: 1,
    userId: 1,
    taskType: 'accounting_suggestion',
    clientKey: null,
    status: 'pending',
    inputPayload: {},
    outputPayload: null,
    errorMessage: null,
    attempts: 0,
    maxAttempts: 3,
    jobId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Build a drizzle mock object where each chain method (select, insert,
 * update, from, where, etc.) returns the same mock, and `await mock`
 * resolves to `rows`.  We avoid a static `then` property (which confuses
 * NestJS DI) by using `defineProperty` with `enumerable: false`.
 */
function dbMock(rows: unknown[]) {
  const self: Record<string, unknown> = {};

  const methods = [
    'select',
    'from',
    'insert',
    'update',
    'values',
    'set',
    'where',
    'limit',
    'offset',
    'orderBy',
  ];
  for (const m of methods) {
    self[m] = jest.fn().mockReturnValue(self);
  }
  self.returning = jest.fn().mockResolvedValue(rows);

  Object.defineProperty(self, 'then', {
    enumerable: false,
    configurable: true,
    value: (resolve: (v: unknown) => void) =>
      Promise.resolve(rows).then(resolve),
  });

  return self;
}

describe('AiService', () => {
  let service: AiService;
  let aiQueue: { add: jest.Mock; getJobCounts: jest.Mock };

  beforeEach(async () => {
    aiQueue = {
      add: jest.fn().mockResolvedValue({ id: 'bullmq-job-123' }),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 1,
        completed: 5,
        failed: 0,
        delayed: 0,
        paused: 0,
      }),
    };
    const dlqQueue = {
      add: jest.fn(),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 1,
        failed: 0,
        delayed: 0,
        paused: 0,
      }),
    };
    const llm = { chat: jest.fn().mockResolvedValue('{"ok":true}') };
    const finance = {
      findVoucherBySource: jest.fn().mockResolvedValue(null),
      createVoucher: jest.fn(),
      nextVoucherNo: jest.fn().mockReturnValue('V202601010001'),
    };

    // Provide a stub database – we'll replace it on the service after compile
    const stubDb = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: getQueueToken(AI_DEFAULT_QUEUE), useValue: aiQueue },
        { provide: getQueueToken(AI_DLQ_QUEUE), useValue: dlqQueue },
        { provide: DRIZZLE_DB, useValue: stubDb },
        { provide: AiLlmService, useValue: llm },
        { provide: FinanceService, useValue: finance },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('submitTask → creates task and enqueues to BullMQ', async () => {
    (service as any).db = dbMock([row()]);

    const result = await service.submitTask(
      { taskType: 'accounting_suggestion', payload: { x: 1 } },
      1,
      1,
    );

    expect(result.id).toBe(1);
    expect(result.status).toBe('pending');
    expect(aiQueue.add).toHaveBeenCalledWith(
      'ai-process',
      expect.objectContaining({ taskId: 1 }),
      expect.objectContaining({
        jobId: expect.stringMatching(/^ai:accounting_suggestion:/),
      }),
    );
  });

  it('submitTask with clientKey → idempotent re-submit returns existing', async () => {
    (service as any).db = dbMock([row({ clientKey: 'dup-key' })]);

    const result = await service.submitTask(
      { taskType: 'accounting_suggestion', clientKey: 'dup-key', payload: {} },
      1,
      1,
    );

    expect(result.clientKey).toBe('dup-key');
    expect(aiQueue.add).not.toHaveBeenCalled();
  });

  it('getTask → returns task for valid id', async () => {
    (service as any).db = dbMock([row()]);
    const result = await service.getTask(1, 1);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
  });

  it('getTask → returns null when query resolves empty', async () => {
    (service as any).db = dbMock([]);
    const result = await service.getTask(1, 999);
    expect(result).toBeNull();
  });

  it('getQueueStats → returns main and DLQ counts', async () => {
    const stats = await service.getQueueStats();
    expect(stats.queue).toBe(AI_DEFAULT_QUEUE);
    expect(stats.dlqQueue).toBe(AI_DLQ_QUEUE);
    expect(stats.counts.completed).toBe(5);
    expect(stats.dlqCounts.completed).toBe(1);
  });

  it('markProcessing / markCompleted / markFailed → do not throw', async () => {
    (service as any).db = dbMock([]);
    await expect(service.markProcessing(1)).resolves.toBeUndefined();
    await expect(service.markCompleted(1, {})).resolves.toBeUndefined();
    await expect(service.markFailed(1, 'e', true)).resolves.toBeUndefined();
    await expect(service.markFailed(1, 'e', false)).resolves.toBeUndefined();
  });
});
