import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { DRIZZLE_DB } from '../database/database.constants';

/**
 * CRM 销售流程集成测试
 * 测试场景：创建客户 -> 添加跟进记录 -> 创建商机 -> 商机推进 -> 成交
 */
describe('CRM Sales Workflow Integration', () => {
  let crmService: CrmService;
  let mockDb: any;

  const mockCustomer = {
    id: 1,
    enterpriseId: 1,
    name: '潜在客户公司',
    phone: '13800138000',
    contactPerson: '李经理',
    address: '北京市朝阳区',
    type: 'enterprise',
    level: 'regular',
    industry: '互联网',
    tags: ['重点客户', 'B2B'],
    source: 'manual',
    assignedTo: 1,
    creditLimit: '50000',
    remark: '有采购意向',
    isDeleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFollowUp = {
    id: 1,
    customerId: 1,
    enterpriseId: 1,
    content: '初次沟通，客户对产品有浓厚兴趣',
    type: 'text',
    attachmentUrls: null,
    nextFollowUpAt: new Date('2024-01-08'),
    createdBy: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockOpportunity = {
    id: 1,
    enterpriseId: 1,
    customerId: 1,
    name: 'Q1软件采购项目',
    amount: '100000',
    stage: 'initial',
    expectedCloseDate: new Date('2024-03-31'),
    probability: 20,
    remark: '客户预算充足',
    createdBy: 1,
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

    crmService = module.get<CrmService>(CrmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('客户管理流程', () => {
    it('应该成功创建客户', async () => {
      // Mock 检查重复 - 无重复
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

      // Mock 创建客户
      const returningChain = {
        returning: jest.fn().mockResolvedValue([mockCustomer]),
      };
      const valuesChain = {
        values: jest.fn().mockReturnValue(returningChain),
      };

      mockDb.select = jest.fn().mockReturnValue(checkFromChain);
      mockDb.insert = jest.fn().mockReturnValue(valuesChain);

      const customerDto = {
        name: '潜在客户公司',
        phone: '13800138000',
        contactPerson: '李经理',
        address: '北京市朝阳区',
        type: 'enterprise' as const,
        level: 'regular' as const,
        industry: '互联网',
        tags: ['重点客户', 'B2B'],
        source: 'manual' as const,
        creditLimit: 50000,
        remark: '有采购意向',
        force: false,
      };

      const customer = await crmService.create(1, customerDto);
      expect(customer.name).toBe('潜在客户公司');
      expect(customer.level).toBe('regular');
    });

    it('应该阻止创建重复客户', async () => {
      // Mock 检查重复 - 存在重复
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

      const duplicate = await crmService.checkDuplicate(
        1,
        '已有客户',
        '13800138000',
      );
      expect(duplicate).toBe(1);

      const customerDto = {
        name: '已有客户',
        phone: '13800138000',
        type: 'enterprise' as const,
        level: 'regular' as const,
        force: false,
      };

      await expect(crmService.create(1, customerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('应该处理客户升级流程', async () => {
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
          .mockResolvedValueOnce([{ ...mockCustomer, level: 'vip' }]),
      };
      const whereUpdateChain = {
        where: jest.fn().mockReturnValue(returningChain),
      };
      const setChain = {
        set: jest.fn().mockReturnValue(whereUpdateChain),
      };

      mockDb.select = jest.fn().mockReturnValue(findFromChain);
      mockDb.update = jest.fn().mockReturnValue(setChain);

      const updated = await crmService.update(1, 1, { level: 'vip' });
      expect(updated.level).toBe('vip');
    });
  });

  describe('权限边界测试', () => {
    it('应该拒绝未绑定企业的操作', async () => {
      await expect(
        crmService.findPage({
          enterpriseId: undefined,
          page: 1,
          pageSize: 10,
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        crmService.create(undefined, {
          name: '测试',
          type: 'enterprise' as const,
          level: 'regular' as const,
          force: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('应该拒绝访问不存在的客户', async () => {
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

      await expect(
        crmService.update(999, 1, { name: '新名称' }),
      ).rejects.toThrow(NotFoundException);

      await expect(crmService.findOne(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
