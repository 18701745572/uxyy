import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { DRIZZLE_DB } from '../database/database.constants';

describe('CrmService', () => {
  let service: CrmService;
  let mockDb: any;

  const mockCustomer = {
    id: 1,
    enterpriseId: 1,
    name: '测试客户',
    phone: '13800138000',
    contactPerson: '张三',
    address: '北京市',
    type: 'enterprise',
    level: 'vip',
    industry: '科技',
    tags: ['重要', '长期'],
    source: 'manual',
    assignedTo: 1,
    creditLimit: '100000',
    remark: '备注信息',
    isDeleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockDb = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: DRIZZLE_DB,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDuplicate', () => {
    it('should return customer id when duplicate exists', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([{ id: 1 }]),
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

      const result = await service.checkDuplicate(1, '测试客户', '13800138000');

      expect(result).toBe(1);
    });

    it('should return null when no duplicate', async () => {
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

      const result = await service.checkDuplicate(1, '新客户', '13900139000');

      expect(result).toBeNull();
    });
  });

  describe('findPage', () => {
    it('should throw ForbiddenException when enterpriseId is missing', async () => {
      await expect(
        service.findPage({
          enterpriseId: undefined,
          page: 1,
          pageSize: 10,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    const createDto = {
      name: '新客户',
      phone: '13800138001',
      contactPerson: '李四',
      address: '上海市',
      type: 'enterprise' as const,
      level: 'regular' as const,
      industry: '金融',
      tags: ['潜在客户'],
      source: 'manual' as const,
      creditLimit: 50000,
      remark: '新客户备注',
      force: false,
    };

    it('should throw ForbiddenException when enterpriseId is missing', async () => {
      await expect(service.create(undefined, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when duplicate exists', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([{ id: 1 }]),
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

      await expect(service.create(1, createDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create customer successfully', async () => {
      // Mock duplicate check - no duplicate
      const checkLimitChain = {
        limit: jest.fn().mockResolvedValue([]),
      };
      const checkWhereChain = {
        where: jest.fn().mockReturnValue(checkLimitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const checkFromChain = {
        from: jest.fn().mockReturnValue(checkWhereChain),
      };

      // Mock insert
      const returningChain = {
        returning: jest.fn().mockResolvedValue([mockCustomer]),
      };
      const valuesChain = {
        values: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.select = jest.fn().mockReturnValue(checkFromChain);
      mockDb.insert = jest.fn().mockReturnValue(valuesChain);

      const result = await service.create(1, createDto);

      expect(result.name).toBe('测试客户');
    });

    it('should skip duplicate check when force is true', async () => {
      const returningChain = {
        returning: jest.fn().mockResolvedValue([mockCustomer]),
      };
      const valuesChain = {
        values: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.insert = jest.fn().mockReturnValue(valuesChain);

      const result = await service.create(1, { ...createDto, force: true });

      expect(result.name).toBe('测试客户');
    });
  });

  describe('findOne', () => {
    it('should throw ForbiddenException when enterpriseId is missing', async () => {
      await expect(service.findOne(1, undefined)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
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

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should return customer when found', async () => {
      const limitChain = {
        limit: jest.fn().mockResolvedValue([mockCustomer]),
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

      const result = await service.findOne(1, 1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('测试客户');
    });
  });

  describe('update', () => {
    const updateDto = {
      name: '更新后的客户名',
      phone: '13800138002',
    };

    it('should throw ForbiddenException when enterpriseId is missing', async () => {
      await expect(service.update(1, undefined, updateDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when customer not found', async () => {
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

      await expect(service.update(999, 1, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update customer successfully', async () => {
      // Mock findOne
      const findLimitChain = {
        limit: jest.fn().mockResolvedValueOnce([mockCustomer]),
      };
      const findWhereChain = {
        where: jest.fn().mockReturnValue(findLimitChain),
        and: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      const findFromChain = {
        from: jest.fn().mockReturnValue(findWhereChain),
      };

      // Mock update
      const returningChain = {
        returning: jest
          .fn()
          .mockResolvedValueOnce([{ ...mockCustomer, ...updateDto }]),
      };
      const whereUpdateChain = {
        where: jest.fn().mockReturnValue(returningChain),
      };
      const setChain = {
        set: jest.fn().mockReturnValue(whereUpdateChain),
      };

      mockDb.select = jest.fn().mockReturnValue(findFromChain);
      mockDb.update = jest.fn().mockReturnValue(setChain);

      const result = await service.update(1, 1, updateDto);

      expect(result.name).toBe('更新后的客户名');
    });
  });
});
