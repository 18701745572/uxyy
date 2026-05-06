import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

describe('CrmController', () => {
  let controller: CrmController;
  let service: CrmService;

  const mockCrmService = {
    findPage: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findFollowUps: jest.fn(),
    createFollowUp: jest.fn(),
    updateFollowUp: jest.fn(),
    removeFollowUp: jest.fn(),
    getCustomerStats: jest.fn(),
    getOverviewStats: jest.fn(),
    checkDuplicate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [{ provide: CrmService, useValue: mockCrmService }],
    }).compile();

    controller = module.get<CrmController>(CrmController);
    service = module.get<CrmService>(CrmService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('ping', () => {
    it('returns ok', () => {
      expect(controller.ping()).toEqual({ ok: true, module: 'crm' });
    });
  });

  describe('listCustomers', () => {
    it('calls findPage with enterpriseId from request', async () => {
      mockCrmService.findPage.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      const req = { user: { enterpriseId: 1, userId: 1 } } as any;
      await controller.listCustomers(req, {
        page: 1,
        pageSize: 20,
        isDeleted: false,
      });

      expect(mockCrmService.findPage).toHaveBeenCalledWith(
        expect.objectContaining({
          enterpriseId: 1,
          page: 1,
          pageSize: 20,
        }),
      );
    });
  });

  describe('createCustomer', () => {
    it('calls create with enterpriseId and dto', async () => {
      const now = new Date();
      mockCrmService.create.mockResolvedValue({
        id: 1,
        enterpriseId: 1,
        name: 'test',
        phone: null,
        contactPerson: null,
        address: null,
        type: 'enterprise',
        level: 'regular',
        industry: null,
        tags: null,
        source: 'manual',
        assignedTo: null,
        creditLimit: null,
        remark: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });

      const req = { user: { enterpriseId: 1, userId: 1 } } as any;
      await controller.createCustomer(req, {
        name: 'test',
        type: 'enterprise',
        level: 'VIP',
        tags: ['重要'],
        force: false,
      });

      expect(mockCrmService.create).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'test' }),
      );
    });
  });

  describe('getCustomerStats', () => {
    it('calls getCustomerStats with id and enterpriseId', async () => {
      mockCrmService.getCustomerStats.mockResolvedValue({
        customerId: 1,
        followUpCount: 3,
        lastFollowUpAt: new Date().toISOString(),
        daysSinceLastFollowUp: 2,
      });

      const req = { user: { enterpriseId: 1 } } as any;
      await controller.getCustomerStats(req, 1);

      expect(mockCrmService.getCustomerStats).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getOverviewStats', () => {
    it('calls getOverviewStats with enterpriseId', async () => {
      mockCrmService.getOverviewStats.mockResolvedValue({
        totalCustomers: 100,
        newThisMonth: 5,
        typeDistribution: [],
        levelDistribution: [],
      });

      const req = { user: { enterpriseId: 1 } } as any;
      await controller.getOverviewStats(req);

      expect(mockCrmService.getOverviewStats).toHaveBeenCalledWith(1);
    });
  });

  describe('listFollowUps', () => {
    it('calls findFollowUps with customerId and enterpriseId', async () => {
      mockCrmService.findFollowUps.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      const req = { user: { enterpriseId: 1 } } as any;
      await controller.listFollowUps(req, 42, { page: 1, pageSize: 20 });

      expect(mockCrmService.findFollowUps).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 42, enterpriseId: 1 }),
      );
    });
  });
});
