import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permission } from '../auth/role-permissions';
import { requireJwtUserId } from '../../common/utils/jwt-request-context';
import { FinanceService } from './finance.service';
import {
  CreateAccountSubjectDto,
  UpdateAccountSubjectDto,
  AccountSubjectResponseDto,
} from './dto/account-subject.dto';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceListQueryDto,
  InvoiceListResponseDto,
  InvoiceResponseDto,
  OcrInvoiceResponseDto,
} from './dto/invoice.dto';
import {
  BalanceSheetQueryDto,
  BalanceSheetResponseDto,
  CashFlowQueryDto,
  CashFlowResponseDto,
  DashboardQueryDto,
  DashboardResponseDto,
  IncomeStatementQueryDto,
  IncomeStatementResponseDto,
  ArApResponseDto,
} from './dto/report.dto';
import {
  CreateVoucherDto,
  VoucherListQueryDto,
  VoucherListResponseDto,
  VoucherResponseDto,
} from './dto/voucher.dto';

function enterpriseIdFromRequest(req: Express.Request): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = (u as { enterpriseId?: unknown }).enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@ApiTags('finance')
@Controller('finance')
@UseGuards(PermissionsGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  // ==================== 占位 ====================

  @Public()
  @Get('ping')
  @ApiOperation({ summary: '财务模块占位（无需鉴权）' })
  ping() {
    return { ok: true, module: 'finance' };
  }

  // ==================== 发票 ====================

  @ApiBearerAuth()
  @Post('invoices/ocr')
  @Permissions(Permission.FIN_WRITE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'OCR 发票识别',
    description:
      '上传发票图片（jpg/png，≤5MB），返回 OCR 识别结果。使用 Qwen-VL 多模态模型进行识别。',
  })
  @UseInterceptors(FileInterceptor('file'))
  async ocrInvoice(
    @Req()
    req: Express.Request & { file?: { buffer: Buffer; mimetype: string } },
    @Body() _body: unknown,
  ): Promise<OcrInvoiceResponseDto> {
    if (!req.file) {
      throw new BadRequestException('请上传发票图片文件');
    }
    return this.finance.crInvoice(enterpriseIdFromRequest(req), req.file);
  }

  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: '未登录或未绑定企业上下文' })
  @Get('invoices')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '发票分页列表' })
  async listInvoices(
    @Req() req: Express.Request,
    @Query() query: InvoiceListQueryDto,
  ): Promise<InvoiceListResponseDto> {
    return this.finance.findInvoicePage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page,
      pageSize: query.pageSize,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @ApiBearerAuth()
  @Post('invoices')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '录入发票（手动）' })
  async createInvoice(
    @Req() req: Express.Request,
    @Body() body: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.finance.createInvoice(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Get('invoices/:id')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '发票详情' })
  async getInvoice(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceResponseDto> {
    return this.finance.findOneInvoice(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch('invoices/:id')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '修改发票（仅未验证状态）' })
  async patchInvoice(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.finance.updateInvoice(id, enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Post('invoices/:id/verify')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '验证发票 → status=verified' })
  async verifyInvoice(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<InvoiceResponseDto> {
    return this.finance.verifyInvoice(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('invoices/:id/enter')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({
    summary: '发票入账 → status=entered + 自动生成凭证',
    description:
      '入账后自动根据发票类型匹配会计科目生成凭证分录。\n\n销售类：借 银行存款 / 贷 主营业务收入\n采购类：借 库存商品 / 贷 银行存款',
  })
  async enterInvoice(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finance.enterInvoice(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('invoices/import')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({
    summary:
      'Excel/CSV 导入发票（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importInvoices(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.finance.importInvoicesFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
    );
  }

  // ==================== 会计科目 ====================

  @ApiBearerAuth()
  @Get('account-subjects')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '会计科目列表（当前企业）' })
  async listAccountSubjects(
    @Req() req: Express.Request,
  ): Promise<AccountSubjectResponseDto[]> {
    return this.finance.findAccountSubjects(enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('account-subjects')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '新增会计科目' })
  async createAccountSubject(
    @Req() req: Express.Request,
    @Body() body: CreateAccountSubjectDto,
  ): Promise<AccountSubjectResponseDto> {
    return this.finance.createAccountSubject(
      enterpriseIdFromRequest(req),
      body,
    );
  }

  @ApiBearerAuth()
  @Get('account-subjects/:id')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '会计科目详情' })
  async getAccountSubject(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AccountSubjectResponseDto> {
    return this.finance.findOneAccountSubject(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Patch('account-subjects/:id')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '修改会计科目' })
  async patchAccountSubject(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAccountSubjectDto,
  ): Promise<AccountSubjectResponseDto> {
    return this.finance.updateAccountSubject(
      id,
      enterpriseIdFromRequest(req),
      body,
    );
  }

  // ==================== 凭证 ====================

  @ApiBearerAuth()
  @Get('vouchers')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '凭证分页列表' })
  async listVouchers(
    @Req() req: Express.Request,
    @Query() query: VoucherListQueryDto,
  ): Promise<VoucherListResponseDto> {
    return this.finance.findVoucherPage({
      enterpriseId: enterpriseIdFromRequest(req),
      page: query.page,
      pageSize: query.pageSize,
      startDate: query.startDate,
      endDate: query.endDate,
      sourceType: query.sourceType,
    });
  }

  @ApiBearerAuth()
  @Post('vouchers')
  @Permissions(Permission.FIN_VOUCHER)
  @ApiOperation({
    summary: '手动创建凭证',
    description: '借方和贷方科目不能相同；金额以字符串传入避免浮点误差',
  })
  async createVoucher(
    @Req() req: Express.Request,
    @Body() body: CreateVoucherDto,
  ): Promise<VoucherResponseDto> {
    return this.finance.createVoucher(enterpriseIdFromRequest(req), body);
  }

  @ApiBearerAuth()
  @Get('vouchers/:id')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '凭证详情' })
  async getVoucher(
    @Req() req: Express.Request,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<VoucherResponseDto> {
    return this.finance.findOneVoucher(id, enterpriseIdFromRequest(req));
  }

  @ApiBearerAuth()
  @Post('vouchers/import')
  @Permissions(Permission.FIN_VOUCHER)
  @ApiOperation({
    summary:
      'Excel/CSV 导入凭证（与导出列对齐；mode=skip 跳过重复，mode=force 强制写入）',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importVouchers(
    @Req() req: Express.Request,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('mode') modeRaw?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传表格文件（xlsx / xls / csv）');
    }
    const mode = modeRaw === 'force' ? 'force' : 'skip';
    return this.finance.importVouchersFromSpreadsheet(
      enterpriseIdFromRequest(req),
      file.buffer,
      mode,
      requireJwtUserId(req),
    );
  }

  // ==================== 报表 ====================

  @ApiBearerAuth()
  @Get('reports/dashboard')
  @Permissions(Permission.FIN_REPORT)
  @ApiOperation({ summary: '经营概览报表' })
  async getDashboard(
    @Req() req: Express.Request,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardResponseDto> {
    return this.finance.getDashboard(
      enterpriseIdFromRequest(req),
      query.period,
      query.date,
    );
  }

  @ApiBearerAuth()
  @Get('reports/balance-sheet')
  @Permissions(Permission.FIN_REPORT)
  @ApiOperation({ summary: '资产负债表' })
  async getBalanceSheet(
    @Req() req: Express.Request,
    @Query() query: BalanceSheetQueryDto,
  ): Promise<BalanceSheetResponseDto> {
    return this.finance.getBalanceSheet(
      enterpriseIdFromRequest(req),
      query.asOfDate,
    );
  }

  @ApiBearerAuth()
  @Get('reports/income-statement')
  @Permissions(Permission.FIN_REPORT)
  @ApiOperation({ summary: '利润表' })
  async getIncomeStatement(
    @Req() req: Express.Request,
    @Query() query: IncomeStatementQueryDto,
  ): Promise<IncomeStatementResponseDto> {
    return this.finance.getIncomeStatement(
      enterpriseIdFromRequest(req),
      query.period,
    );
  }

  @ApiBearerAuth()
  @Get('reports/cash-flow')
  @Permissions(Permission.FIN_REPORT)
  @ApiOperation({ summary: '现金流量表' })
  async getCashFlow(
    @Req() req: Express.Request,
    @Query() query: CashFlowQueryDto,
  ): Promise<CashFlowResponseDto> {
    return this.finance.getCashFlow(enterpriseIdFromRequest(req), query.period);
  }

  @ApiBearerAuth()
  @Get('reports/ar-ap')
  @Permissions(Permission.FIN_REPORT)
  @ApiOperation({ summary: '应收应付汇总' })
  async getArAp(@Req() req: Express.Request): Promise<ArApResponseDto> {
    return this.finance.getArAp(enterpriseIdFromRequest(req));
  }
}
