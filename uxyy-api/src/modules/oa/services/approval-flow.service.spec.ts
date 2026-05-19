import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApprovalFlowService } from './approval-flow.service';
import { DRIZZLE_DB } from '../../database/database.constants';

describe('ApprovalFlowService', () => {
  let service: ApprovalFlowService;
  let mockDb: any;

  const mockFlow = {
    id: 1,
    enterpriseId: 1,
    name: '请假审批流程',
    type: 'leave',
    steps: [{ step: 1, role: 'boss' }],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockDb = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalFlowService,
        {
          provide: DRIZZLE_DB,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<ApprovalFlowService>(ApprovalFlowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFlow', () => {
    it('should create flow successfully', async () => {
      const returningChain = {
        returning: jest.fn().mockResolvedValue([mockFlow]),
      };
      const valuesChain = {
        values: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.insert = jest.fn().mockReturnValue(valuesChain);

      const result = await service.createFlow(1, {
        name: '请假审批流程',
        type: 'leave',
        steps: [{ step: 1, role: 'boss' }],
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('请假审批流程');
    });
  });

  describe('findAllFlows', () => {
    it('should return all flows', async () => {
      const orderByChain = {
        orderBy: jest.fn().mockResolvedValue([mockFlow]),
      };
      const whereChain = {
        where: jest.fn().mockReturnValue(orderByChain),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.findAllFlows(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('请假审批流程');
    });
  });

  describe('findFlowById', () => {
    it('should return flow by id', async () => {
      const whereChain = {
        where: jest.fn().mockResolvedValue([mockFlow]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.findFlowById(1, 1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw NotFoundException when flow not found', async () => {
      const whereChain = {
        where: jest.fn().mockResolvedValue([]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      await expect(service.findFlowById(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findFlowByType', () => {
    it('should return flow by type', async () => {
      const whereChain = {
        where: jest.fn().mockResolvedValue([mockFlow]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.findFlowByType('leave', 1);

      expect(result).toBeDefined();
      expect(result.type).toBe('leave');
    });

    it('should return undefined when flow not found', async () => {
      const whereChain = {
        where: jest.fn().mockResolvedValue([]),
      };
      const fromChain = {
        from: jest.fn().mockReturnValue(whereChain),
      };

      mockDb.select = jest.fn().mockReturnValue(fromChain);

      const result = await service.findFlowByType('unknown', 1);

      expect(result).toBeUndefined();
    });
  });

  describe('updateFlow', () => {
    it('should update flow successfully', async () => {
      // Mock findFlowById
      const findWhereChain = {
        where: jest.fn().mockResolvedValueOnce([mockFlow]),
      };
      const findFromChain = {
        from: jest.fn().mockReturnValue(findWhereChain),
      };

      // Mock update
      const returningChain = {
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ ...mockFlow, name: '更新后的流程' }]),
      };
      const whereUpdateChain = {
        where: jest.fn().mockReturnValue(returningChain),
      };
      const setChain = {
        set: jest.fn().mockReturnValue(whereUpdateChain),
      };

      mockDb.select = jest.fn().mockReturnValue(findFromChain);
      mockDb.update = jest.fn().mockReturnValue(setChain);

      const result = await service.updateFlow(1, 1, { name: '更新后的流程' });

      expect(result.name).toBe('更新后的流程');
    });
  });

  describe('deleteFlow', () => {
    it('should delete flow successfully', async () => {
      // Mock findFlowById
      const findWhereChain = {
        where: jest.fn().mockResolvedValueOnce([mockFlow]),
      };
      const findFromChain = {
        from: jest.fn().mockReturnValue(findWhereChain),
      };

      // Mock delete
      const returningChain = {
        returning: jest.fn().mockResolvedValueOnce([mockFlow]),
      };
      const whereDeleteChain = {
        where: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.select = jest.fn().mockReturnValue(findFromChain);
      mockDb.delete = jest.fn().mockReturnValue(whereDeleteChain);

      await service.deleteFlow(1, 1);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
