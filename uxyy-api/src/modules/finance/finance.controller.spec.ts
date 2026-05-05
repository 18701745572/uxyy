import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

type FinanceServiceMock = Record<keyof FinanceService, jest.Mock>;

function mockRequest(enterpriseId: number): Request {
  return { user: { enterpriseId } } as unknown as Request;
}

describe('FinanceController', () => {
  let controller: FinanceController;
  let mockService: FinanceServiceMock;

  beforeEach(async () => {
    mockService = {
      createInvoice: jest.fn(),
      findInvoicePage: jest.fn(),
      findOneInvoice: jest.fn(),
      updateInvoice: jest.fn(),
      verifyInvoice: jest.fn(),
      enterInvoice: jest.fn(),
      createVoucher: jest.fn(),
      findVoucherPage: jest.fn(),
      findOneVoucher: jest.fn(),
      createAccountSubject: jest.fn(),
      findAccountSubjects: jest.fn(),
      findOneAccountSubject: jest.fn(),
      updateAccountSubject: jest.fn(),
      seedDefaultSubjects: jest.fn(),
      getDashboard: jest.fn(),
      getBalanceSheet: jest.fn(),
      getIncomeStatement: jest.fn(),
      getCashFlow: jest.fn(),
      getArAp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [{ provide: FinanceService, useValue: mockService }],
    }).compile();

    controller = module.get<FinanceController>(FinanceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should ping', () => {
    expect(controller.ping()).toEqual({ ok: true, module: 'finance' });
  });

  describe('listInvoices', () => {
    it('should call service.findInvoicePage with parsed query params', async () => {
      const req = mockRequest(1);
      const query = { page: 2, pageSize: 10, status: 'verified' };
      mockService.findInvoicePage.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
      });

      await controller.listInvoices(req, query);
      expect(mockService.findInvoicePage).toHaveBeenCalledWith({
        enterpriseId: 1,
        page: 2,
        pageSize: 10,
        status: 'verified',
        startDate: undefined,
        endDate: undefined,
      });
    });
  });

  describe('createInvoice', () => {
    it('should call service.createInvoice', async () => {
      const req = mockRequest(1);
      const dto = {
        invoiceNo: 'INV001',
        type: 'normal' as const,
        amount: '100.00',
        totalAmount: '113.00',
        taxRate: '13.00',
        taxAmount: '13.00',
      };
      mockService.createInvoice.mockResolvedValue({ id: 1, ...dto });

      await controller.createInvoice(req, dto);
      expect(mockService.createInvoice).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('createVoucher', () => {
    it('should call service.createVoucher', async () => {
      const req = mockRequest(1);
      const dto = {
        voucherNo: 'V001',
        sourceType: 'manual' as const,
        debitAccount: '银行存款',
        creditAccount: '主营业务收入',
        amount: '100.00',
      };
      mockService.createVoucher.mockResolvedValue({ id: 1, ...dto });

      await controller.createVoucher(req, dto);
      expect(mockService.createVoucher).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('enterInvoice', () => {
    it('should call service.enterInvoice', async () => {
      const req = mockRequest(1);
      mockService.enterInvoice.mockResolvedValue({
        invoice: { id: 1, status: 'entered' },
        voucher: { id: 1 },
        voucherNo: 'V202401150001',
      });

      await controller.enterInvoice(req, 1);
      expect(mockService.enterInvoice).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('reports', () => {
    it('should call service.getDashboard', async () => {
      const req = mockRequest(1);
      mockService.getDashboard.mockResolvedValue({
        period: '2024-01',
        salesAmount: '158000.00',
        salesOrderCount: 156,
        purchaseAmount: '98000.00',
        purchaseOrderCount: 89,
        grossProfit: '60000.00',
        grossProfitRate: '37.97%',
        pendingReceivable: '23000.00',
        pendingPayable: '15000.00',
        lowStockProducts: [],
        topSalesProducts: [],
      });

      const result = await controller.getDashboard(req, {
        period: 'month',
        date: '2024-01',
      });
      expect(result.salesAmount).toBe('158000.00');
      expect(result.grossProfitRate).toBe('37.97%');
    });

    it('should call service.getBalanceSheet', async () => {
      const req = mockRequest(1);
      mockService.getBalanceSheet.mockResolvedValue({
        period: '2024-01-31',
        assets: [],
        totalAssets: '50000.00',
        liabilities: [],
        totalLiabilities: '20000.00',
        equity: [],
        totalEquity: '30000.00',
      });

      const result = await controller.getBalanceSheet(req, {
        asOfDate: '2024-01-31',
      });
      expect(result.totalAssets).toBe('50000.00');
      expect(mockService.getBalanceSheet).toHaveBeenCalledWith(1, '2024-01-31');
    });

    it('should call service.getArAp', async () => {
      const req = mockRequest(1);
      mockService.getArAp.mockResolvedValue({
        receivables: [],
        totalReceivables: '23000.00',
        payables: [],
        totalPayables: '15000.00',
      });

      const result = await controller.getArAp(req);
      expect(result.totalReceivables).toBe('23000.00');
    });
  });
});
