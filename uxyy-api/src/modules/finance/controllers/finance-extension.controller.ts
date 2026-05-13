import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../../auth/role-permissions';
import { BankStatementService } from '../services/bank-statement.service';
import { InvoiceIntelligenceService } from '../services/invoice-intelligence.service';
import { VoucherTemplateService } from '../services/voucher-template.service';
import { AutoAccountingV2Service } from '../services/auto-accounting-v2.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@ApiTags('财务扩展功能')
@ApiBearerAuth()
@Controller('finance/extension')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FinanceExtensionController {
  constructor(
    private readonly bankStatementService: BankStatementService,
    private readonly invoiceIntelligenceService: InvoiceIntelligenceService,
    private readonly voucherTemplateService: VoucherTemplateService,
    private readonly autoAccountingService: AutoAccountingV2Service,
  ) {}

  // ==================== 银行流水导入 ====================

  @Get('bank/supported-banks')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取支持的银行列表' })
  getSupportedBanks() {
    return this.bankStatementService.getSupportedBanks();
  }

  @Post('bank/import')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '导入银行流水' })
  async importBankStatement(
    @Req() req: Request & { user: UserContext },
    @Body() data: {
      bankCode: string;
      bankAccount: string;
      csvContent: string;
      hasHeader?: boolean;
    },
  ) {
    const { bankCode, bankAccount, csvContent, hasHeader = true } = data;

    if (!bankCode || !bankAccount || !csvContent) {
      throw new BadRequestException('银行代码、账号和CSV内容不能为空');
    }

    // 解析CSV
    const transactions = await this.bankStatementService.parseCSV(
      bankCode,
      csvContent,
      { hasHeader },
    );

    if (transactions.length === 0) {
      throw new BadRequestException('未解析到有效交易记录，请检查CSV格式');
    }

    // 导入数据库
    return this.bankStatementService.importStatements(
      req.user.enterpriseId,
      req.user.userId,
      bankCode,
      bankAccount,
      transactions,
    );
  }

  @Get('bank/statements')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取银行流水列表' })
  @ApiQuery({ name: 'matchStatus', required: false })
  @ApiQuery({ name: 'bankAccount', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getBankStatements(
    @Req() req: Request & { user: UserContext },
    @Query('matchStatus') matchStatus?: string,
    @Query('bankAccount') bankAccount?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.bankStatementService.getStatementList(
      req.user.enterpriseId,
      {
        matchStatus,
        bankAccount,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      },
    );
  }

  @Post('bank/statements/:id/match')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '重新匹配银行流水' })
  async matchStatement(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    const results = await this.bankStatementService.matchTransactions(
      req.user.enterpriseId,
    );
    return results.find(r => r.statementId === id) || null;
  }

  @Post('bank/statements/:id/generate-voucher')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '根据银行流水生成凭证' })
  async generateVoucherFromStatement(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body('accountId') accountId?: number,
  ) {
    return this.bankStatementService.generateVoucherFromStatement(
      id,
      req.user.enterpriseId,
      req.user.userId,
      accountId,
    );
  }

  @Post('bank/batch-match')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '批量匹配所有未匹配流水' })
  async batchMatch(
    @Req() req: Request & { user: UserContext },
  ) {
    return this.bankStatementService.matchTransactions(req.user.enterpriseId);
  }

  // ==================== 发票智能分类 ====================

  @Post('invoice/:id/classify')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '智能分类发票' })
  async classifyInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    return this.invoiceIntelligenceService.classifyInvoice(
      id,
      req.user.enterpriseId,
    );
  }

  @Post('invoice/batch-classify')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '批量分类发票' })
  async batchClassifyInvoices(
    @Req() req: Request & { user: UserContext },
    @Body('ids') ids: number[],
  ) {
    return this.invoiceIntelligenceService.batchClassifyInvoices(
      ids,
      req.user.enterpriseId,
    );
  }

  // ==================== 凭证模板库 ====================

  @Get('templates')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取凭证模板列表' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  async getTemplates(
    @Req() req: Request & { user: UserContext },
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    // 确保模板已初始化
    await this.voucherTemplateService.initializeEnterpriseTemplates(
      req.user.enterpriseId,
      req.user.userId,
    );

    return this.voucherTemplateService.getTemplates(
      req.user.enterpriseId,
      {
        category,
        keyword,
        page: page ? parseInt(page, 10) : 1,
        pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      },
    );
  }

  @Get('templates/categories')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取模板分类列表' })
  async getTemplateCategories(
    @Req() req: Request & { user: UserContext },
  ) {
    return this.voucherTemplateService.getCategories(req.user.enterpriseId);
  }

  @Get('templates/:id')
  @Permissions(Permission.FIN_READ)
  @ApiOperation({ summary: '获取单个模板详情' })
  async getTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    const template = await this.voucherTemplateService.getTemplate(
      id,
      req.user.enterpriseId,
    );
    if (!template) {
      throw new BadRequestException('模板不存在');
    }
    return template;
  }

  @Post('templates')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '创建自定义凭证模板' })
  async createTemplate(
    @Req() req: Request & { user: UserContext },
    @Body() data: {
      templateCode: string;
      templateName: string;
      description?: string;
      category: string;
      summary: string;
      entries: Array<{
        accountCode: string;
        accountName: string;
        direction: 'debit' | 'credit';
        percentage: number;
        fixedAmount?: string;
        summary: string;
      }>;
    },
  ) {
    return this.voucherTemplateService.createTemplate(
      req.user.enterpriseId,
      req.user.userId,
      {
        templateCode: data.templateCode,
        templateName: data.templateName,
        description: data.description,
        category: data.category,
        isSystem: false,
        summary: data.summary,
        entries: data.entries.map(e => ({
          accountId: 0,
          accountCode: e.accountCode,
          accountName: e.accountName,
          direction: e.direction,
          percentage: e.percentage,
          fixedAmount: e.fixedAmount,
          summary: e.summary,
        })),
      },
    );
  }

  @Post('templates/:id/clone')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '复制模板' })
  async cloneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() data: { newCode: string; newName: string },
  ) {
    return this.voucherTemplateService.cloneTemplate(
      id,
      req.user.enterpriseId,
      req.user.userId,
      data.newCode,
      data.newName,
    );
  }

  @Post('templates/:id/update')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '更新模板' })
  async updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() data: {
      templateName?: string;
      description?: string;
      category?: string;
      summary?: string;
    },
  ) {
    return this.voucherTemplateService.updateTemplate(
      id,
      req.user.enterpriseId,
      req.user.userId,
      data,
    );
  }

  @Post('templates/:id/delete')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '删除自定义模板' })
  async deleteTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
  ) {
    await this.voucherTemplateService.deleteTemplate(
      id,
      req.user.enterpriseId,
    );
    return { success: true };
  }

  @Post('templates/:id/use')
  @Permissions(Permission.FIN_WRITE)
  @ApiOperation({ summary: '使用模板创建凭证' })
  async useTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: UserContext },
    @Body() data: {
      totalAmount: string;
      voucherDate?: string;
      remark?: string;
      customEntries?: Array<{
        fixedAmount?: string;
        summary?: string;
      }>;
    },
  ) {
    // 使用模板生成凭证数据
    const voucherData = await this.voucherTemplateService.useTemplate(
      id,
      req.user.enterpriseId,
      {
        templateId: id,
        totalAmount: data.totalAmount,
        voucherDate: data.voucherDate ? new Date(data.voucherDate) : new Date(),
        remark: data.remark,
        customEntries: data.customEntries,
      },
    );

    // 创建凭证
    return this.autoAccountingService.createComplexVoucher(
      {
        enterpriseId: req.user.enterpriseId,
        userId: req.user.userId,
        sourceType: 'template',
        sourceData: { templateId: id },
      },
      voucherData,
    );
  }

  @Post('templates/initialize')
  @Permissions(Permission.FIN_CONFIG)
  @ApiOperation({ summary: '初始化企业模板库' })
  async initializeTemplates(
    @Req() req: Request & { user: UserContext },
  ) {
    await this.voucherTemplateService.initializeEnterpriseTemplates(
      req.user.enterpriseId,
      req.user.userId,
    );
    return { success: true, message: '模板库初始化完成' };
  }
}
