import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FinanceService } from './finance.service';
import type { CreateInvoiceDto, CreateVoucherDto } from './finance.service';

@ApiTags('finance')
@ApiBearerAuth()
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ========== 发票管理 ==========
  @Get('invoices')
  @ApiOperation({ summary: '获取发票列表' })
  async getInvoices(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('type') type?: 'in' | 'out',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.findInvoicesPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      type,
      startDate,
      endDate,
    });
  }

  @Post('invoices')
  @ApiOperation({ summary: '创建发票' })
  async createInvoice(@Req() req: Request, @Body() dto: CreateInvoiceDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.createInvoice(enterpriseId, dto);
  }

  // ========== 会计科目 ==========
  @Get('account-subjects')
  @ApiOperation({ summary: '获取会计科目列表' })
  async getAccountSubjects(@Req() req: Request) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getAccountSubjects(enterpriseId);
  }

  // ========== 凭证管理 ==========
  @Get('vouchers')
  @ApiOperation({ summary: '获取凭证列表' })
  async getVouchers(
    @Req() req: Request,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.findVouchersPage({
      enterpriseId,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      startDate,
      endDate,
    });
  }

  @Post('vouchers')
  @ApiOperation({ summary: '创建凭证' })
  async createVoucher(@Req() req: Request, @Body() dto: CreateVoucherDto) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.createVoucher(enterpriseId, dto);
  }

  // ========== 财务报表 ==========
  @Get('reports/balance-sheet')
  @ApiOperation({ summary: '获取资产负债表' })
  async getBalanceSheet(
    @Req() req: Request,
    @Query('date') date: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getBalanceSheet(enterpriseId, date);
  }

  @Get('reports/income-statement')
  @ApiOperation({ summary: '获取利润表' })
  async getIncomeStatement(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getIncomeStatement(enterpriseId, startDate, endDate);
  }

  @Get('reports/cash-flow')
  @ApiOperation({ summary: '获取现金流量表' })
  async getCashFlow(
    @Req() req: Request,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getCashFlow(enterpriseId, startDate, endDate);
  }

  // ========== 应收应付 ==========
  @Get('receivables')
  @ApiOperation({ summary: '获取应收账款' })
  async getReceivables(@Req() req: Request) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getReceivables(enterpriseId);
  }

  @Get('payables')
  @ApiOperation({ summary: '获取应付账款' })
  async getPayables(@Req() req: Request) {
    const enterpriseId = (req as any).user?.enterpriseId;
    return this.financeService.getPayables(enterpriseId);
  }

  @Get('ping')
  @ApiOperation({ summary: '财务模块健康检查' })
  ping() {
    return { ok: true, module: 'finance' };
  }
}
