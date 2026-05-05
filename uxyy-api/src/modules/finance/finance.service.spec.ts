/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { DRIZZLE_DB } from '../database/database.constants';

interface ChainableMock {
  [key: string]: jest.Mock;
}

function makeChainable(methods: string[]): ChainableMock {
  const obj: ChainableMock = {};
  for (const m of methods) {
    obj[m] = jest.fn().mockReturnValue(obj);
  }
  return obj;
}

describe('FinanceService', () => {
  let service: FinanceService;
  let mockDb: ChainableMock;

  beforeEach(async () => {
    mockDb = {};
    const selectChain = makeChainable([
      'from',
      'where',
      'orderBy',
      'limit',
      'offset',
      'groupBy',
      'leftJoin',
    ]);
    mockDb.select = jest.fn().mockReturnValue(selectChain);

    const insertChain = makeChainable(['values']);
    insertChain.returning = jest.fn();
    mockDb.insert = jest.fn().mockReturnValue(insertChain);

    const updateChain = makeChainable(['set', 'where']);
    updateChain.returning = jest.fn();
    mockDb.update = jest.fn().mockReturnValue(updateChain);

    const deleteChain = makeChainable(['where']);
    deleteChain.returning = jest.fn();
    mockDb.delete = jest.fn().mockReturnValue(deleteChain);

    const module: TestingModule = await Test.createTestingModule({
      providers: [FinanceService, { provide: DRIZZLE_DB, useValue: mockDb }],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInvoice', () => {
    it('should throw ForbiddenException when enterpriseId is undefined', async () => {
      await expect(
        service.createInvoice(undefined, {
          invoiceNo: 'INV001',
          type: 'normal',
          amount: '100.00',
          totalAmount: '100.00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when enterpriseId is NaN', async () => {
      await expect(
        service.createInvoice(NaN, {
          invoiceNo: 'INV001',
          type: 'normal',
          amount: '100.00',
          totalAmount: '100.00',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when invoice number already exists', async () => {
      const selectChain = mockDb.select();
      selectChain.limit.mockResolvedValueOnce([{ id: 1 }]);

      await expect(
        service.createInvoice(1, {
          invoiceNo: 'INV001',
          type: 'normal',
          amount: '100.00',
          totalAmount: '113.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createVoucher', () => {
    it('should throw BadRequestException when debit equals credit', async () => {
      await expect(
        service.createVoucher(1, {
          voucherNo: 'V001',
          sourceType: 'manual',
          debitAccount: '银行存款',
          creditAccount: '银行存款',
          amount: '100.00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyInvoice', () => {
    it('should throw NotFoundException when invoice not found', async () => {
      const selectChain = mockDb.select();
      selectChain.limit.mockResolvedValueOnce([]);

      await expect(service.verifyInvoice(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when invoice is not unverified', async () => {
      const selectChain = mockDb.select();
      selectChain.limit.mockResolvedValueOnce([
        {
          id: 1,
          enterpriseId: 1,
          invoiceNo: 'INV001',
          invoiceCode: null,
          type: 'normal',
          amount: '100.00',
          taxRate: '0',
          taxAmount: '0',
          totalAmount: '100.00',
          buyerName: null,
          buyerTaxNo: null,
          sellerName: null,
          sellerTaxNo: null,
          issueDate: null,
          status: 'verified',
          ocrData: null,
          sourceType: null,
          sourceId: null,
          createdBy: null,
          createdAt: new Date(),
        },
      ]);

      await expect(service.verifyInvoice(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('enterInvoice', () => {
    it('should throw BadRequestException when invoice is not verified', async () => {
      const selectChain = mockDb.select();
      selectChain.limit.mockResolvedValueOnce([
        {
          id: 1,
          enterpriseId: 1,
          invoiceNo: 'INV001',
          invoiceCode: null,
          type: 'normal',
          amount: '100.00',
          taxRate: '0',
          taxAmount: '0',
          totalAmount: '100.00',
          buyerName: null,
          buyerTaxNo: null,
          sellerName: null,
          sellerTaxNo: null,
          issueDate: null,
          status: 'unverified',
          ocrData: null,
          sourceType: null,
          sourceId: null,
          createdBy: null,
          createdAt: new Date(),
        },
      ]);

      await expect(service.enterInvoice(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('decimalToAmount', () => {
    it('should format amounts as strings in response', async () => {
      const selectChain = mockDb.select();
      selectChain.limit.mockResolvedValueOnce([]);

      const insertChain = mockDb.insert();
      insertChain.returning.mockResolvedValueOnce([
        {
          id: 1,
          enterpriseId: 1,
          invoiceNo: 'INV001',
          invoiceCode: null,
          type: 'normal',
          amount: '100.00',
          taxRate: '0.00',
          taxAmount: '0.00',
          totalAmount: '100.00',
          buyerName: null,
          buyerTaxNo: null,
          sellerName: null,
          sellerTaxNo: null,
          issueDate: null,
          status: 'unverified',
          ocrData: null,
          sourceType: null,
          sourceId: null,
          createdBy: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
      ]);

      const result = await service.createInvoice(1, {
        invoiceNo: 'INV001',
        type: 'normal',
        amount: '100.00',
        totalAmount: '100.00',
      });

      expect(typeof result.amount).toBe('string');
      expect(result.amount).toBe('100.00');
      expect(typeof result.totalAmount).toBe('string');
    });
  });
});
