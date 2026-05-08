import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AutoAccountingService } from '../../finance/services/auto-accounting.service';
import { PurchaseOrdersService } from './purchase-orders.service';
import { DRIZZLE_DB } from '../../database/database.constants';

type MockDb = Record<string, jest.Mock>;

function chainThenable(
  methods: Record<string, jest.Mock>,
  resolvedValue?: unknown,
): MockDb {
  const t: MockDb = {
    ...methods,
    then: jest.fn((resolve: (v: unknown) => void) => {
      resolve(resolvedValue ?? []);
    }) as any,
  };
  return t;
}

function makeMockDb(): { db: MockDb; tx: MockDb } {
  const tx = chainThenable({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    execute: jest.fn(),
  });

  const db: MockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn(),
    execute: jest.fn(),
    transaction: jest
      .fn()
      .mockImplementation(async (cb: (t: MockDb) => Promise<unknown>) =>
        cb(tx),
      ),
  };

  return { db, tx };
}

function chainable(rows: unknown[]): MockDb {
  return chainThenable(
    {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue(rows),
    },
    rows,
  );
}

function mockSelectReturn(db: MockDb, rows: unknown[]): MockDb {
  const chain = chainable(rows);
  db.select = jest.fn().mockReturnValue(chain);
  return chain;
}

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService;
  let db: MockDb;
  let tx: MockDb;

  beforeEach(async () => {
    const mocks = makeMockDb();
    db = mocks.db;
    tx = mocks.tx;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: DRIZZLE_DB, useValue: db },
        {
          provide: AutoAccountingService,
          useValue: { autoAccountPurchaseOrder: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('state machine transitions', () => {
    it('should reject inbound when order is draft', async () => {
      tx.execute.mockResolvedValue({ rows: [{ id: 1, status: 'draft' }] });

      await expect(service.inbound(1, 1, { items: [] }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject inbound when order is completed', async () => {
      tx.execute.mockResolvedValue({ rows: [{ id: 1, status: 'completed' }] });

      await expect(service.inbound(1, 1, { items: [] }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject submit when order is not draft', async () => {
      const order = {
        id: 1,
        enterpriseId: 1,
        status: 'approved',
        orderNo: 'PO202401010001',
        supplierId: 1,
        totalAmount: '500.00',
        remark: null,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        cancelledAt: null,
        items: [],
      };

      // findOne calls select twice: once for order, once for items
      db.select = jest
        .fn()
        .mockReturnValueOnce(chainable([order]))
        .mockReturnValueOnce(chainable([]));

      await expect(service.submit(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should allow cancel on draft purchase order', async () => {
      tx.execute.mockResolvedValue({ rows: [{ id: 1, status: 'draft' }] });

      await expect(service.cancel(1, 1)).resolves.toEqual({
        ok: true,
        orderId: 1,
      });
    });

    it('should reject cancel on completed purchase order', async () => {
      tx.execute.mockResolvedValue({ rows: [{ id: 1, status: 'completed' }] });

      await expect(service.cancel(1, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('tenant isolation', () => {
    it('should throw ForbiddenException when enterpriseId is undefined', async () => {
      await expect(
        service.findPage({
          enterpriseId: undefined,
          page: 1,
          pageSize: 20,
        }),
      ).rejects.toThrow('当前会话未绑定企业');

      await expect(service.create(undefined, {} as never, 1)).rejects.toThrow(
        '当前会话未绑定企业',
      );
    });
  });

  describe('order not found', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      mockSelectReturn(db, []);

      await expect(service.findOne(999, 1)).rejects.toThrow(NotFoundException);
    });
  });
});
