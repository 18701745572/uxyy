import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';
import { DRIZZLE_DB } from '../database/database.constants';
import { AiLlmService } from './ai.llm';
import { FinanceService } from '../finance/finance.service';
import { getQueueToken } from '@nestjs/bullmq';

describe('AiService', () => {
  let service: AiService;
  let mockDb: any;
  let mockQueue: any;
  let mockDlqQueue: any;
  let mockLlm: any;
  let mockFinance: any;

  const mockAiTask = {
    id: 1,
    enterpriseId: 1,
    userId: 1,
    taskType: 'invoice_analysis',
    clientKey: 'test-key',
    status: 'pending',
    inputPayload: { imageUrl: 'http://example.com/invoice.jpg' },
    outputPayload: null,
    jobId: 'job-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockDb = jest.fn();

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    mockDlqQueue = {
      add: jest.fn().mockResolvedValue({ id: 'dlq-job-123' }),
    };

    mockLlm = {
      analyzeInvoice: jest.fn().mockResolvedValue({
        type: 'input',
        amount: 1000,
        taxAmount: 100,
        invoiceDate: '2024-01-01',
      }),
      generateVoucher: jest.fn().mockResolvedValue({
        items: [
          { subjectName: '库存商品', debit: 1000, credit: 0 },
          { subjectName: '银行存款', debit: 0, credit: 1000 },
        ],
      }),
    };

    mockFinance = {
      createVoucher: jest.fn().mockResolvedValue({ id: 1 }),
      findVoucherBySource: jest.fn().mockResolvedValue(null),
      nextVoucherNo: jest.fn().mockReturnValue('V202401010001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: DRIZZLE_DB,
          useValue: mockDb,
        },
        {
          provide: getQueueToken('ai-default'),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken('ai-default-dlq'),
          useValue: mockDlqQueue,
        },
        {
          provide: AiLlmService,
          useValue: mockLlm,
        },
        {
          provide: FinanceService,
          useValue: mockFinance,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitTask', () => {
    it('should return existing task for duplicate clientKey', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([mockAiTask]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.submitTask(
        {
          taskType: 'invoice_analysis',
          clientKey: 'test-key',
          payload: {},
        },
        1,
        1,
      );

      expect(result.id).toBe(1);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getTask', () => {
    it('should return task by id', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([mockAiTask]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.getTask(1, 1);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.status).toBe('pending');
    });

    it('should return null when task not found', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.getTask(999, 1);

      expect(result).toBeNull();
    });
  });

  describe('applyVoucherFromAiTask', () => {
    it('should apply voucher from completed task', async () => {
      const completedTask = {
        ...mockAiTask,
        status: 'completed',
        outputPayload: {
          entries: [
            {
              subjectName: '库存商品',
              accountSubject: '1405',
              debit: 1000,
              credit: 0,
            },
            {
              subjectName: '银行存款',
              accountSubject: '1002',
              debit: 0,
              credit: 1000,
            },
          ],
        },
      };

      const limitChain = {
        limit: jest.fn().mockResolvedValue([completedTask]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.applyVoucherFromAiTask(1, 1, 1);

      expect(result.created).toBe(true);
      expect(mockFinance.createVoucher).toHaveBeenCalled();
    });

    it('should throw NotFoundException when task not found', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      await expect(service.applyVoucherFromAiTask(1, 1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for non-completed task', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([mockAiTask]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(limitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };
      mockDb.select = jest.fn().mockReturnValue(fromChain);

      await expect(service.applyVoucherFromAiTask(1, 1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
