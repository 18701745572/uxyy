import {
  Controller,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { Permission } from '../../auth/role-permissions';
import { PdfExportService } from '../services/pdf-export.service';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { FinanceService } from '../../finance/finance.service';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

function enterpriseIdFromRequest(
  req: Request & { user: UserContext },
): number | undefined {
  const u = req.user;
  if (!u || typeof u !== 'object') return undefined;
  const raw = u.enterpriseId;
  return typeof raw === 'number' && !Number.isNaN(raw) ? raw : undefined;
}

@Controller('export/pdf')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PdfExportController {
  constructor(
    private readonly pdfExportService: PdfExportService,
    private readonly financeService: FinanceService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 导出销售订单PDF
   */
  @Get('sales-order/:orderId')
  @Permissions(Permission.INV_SALES_ORDER)
  async exportSalesOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    // 获取订单详情
    const [order] = await this.db
      .select({
        order: schema.salesOrders,
        customer: schema.customers,
      })
      .from(schema.salesOrders)
      .leftJoin(
        schema.customers,
        eq(schema.salesOrders.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.salesOrders.id, orderId),
          eq(schema.salesOrders.enterpriseId, req.user.enterpriseId),
        ),
      );

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    // 获取订单明细
    const items = await this.db
      .select({
        item: schema.salesOrderItems,
        product: schema.products,
      })
      .from(schema.salesOrderItems)
      .leftJoin(
        schema.products,
        eq(schema.salesOrderItems.productId, schema.products.id),
      )
      .where(eq(schema.salesOrderItems.orderId, orderId));

    const orderData = {
      ...order.order,
      customerName: order.customer?.name,
      items: items.map(({ item, product }) => ({
        ...item,
        productName: product?.name,
        spec: product?.spec,
        unit: product?.unit,
      })),
    };

    const html = this.pdfExportService.generateSalesOrderHtml(orderData);

    // 设置响应头，返回HTML（实际生产环境可使用puppeteer转换为PDF）
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="销售订单-${order.order.orderNo}.html"`,
    );
    res.send(html);
  }

  /**
   * 导出报价单PDF
   */
  @Get('quotation/:quotationId')
  @Permissions(Permission.CRM_READ)
  async exportQuotation(
    @Param('quotationId', ParseIntPipe) quotationId: number,
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    const [quotation] = await this.db
      .select({
        quotation: schema.quotations,
        customer: schema.customers,
      })
      .from(schema.quotations)
      .leftJoin(
        schema.customers,
        eq(schema.quotations.customerId, schema.customers.id),
      )
      .where(
        and(
          eq(schema.quotations.id, quotationId),
          eq(schema.quotations.enterpriseId, req.user.enterpriseId),
        ),
      );

    if (!quotation) {
      return res.status(404).json({ message: '报价单不存在' });
    }

    const items = await this.db
      .select({
        item: schema.quotationItems,
        product: schema.products,
      })
      .from(schema.quotationItems)
      .leftJoin(
        schema.products,
        eq(schema.quotationItems.productId, schema.products.id),
      )
      .where(eq(schema.quotationItems.quotationId, quotationId));

    const quotationData = {
      ...quotation.quotation,
      customerName: quotation.customer?.name,
      contactName: quotation.customer?.contactPerson,
      items: items.map(({ item, product }) => ({
        ...item,
        productName: product?.name,
        spec: product?.spec,
        unit: product?.unit,
      })),
    };

    const html = this.pdfExportService.generateQuotationHtml(quotationData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="报价单-${quotation.quotation.quotationNo}.html"`,
    );
    res.send(html);
  }

  /**
   * 导出客户对账单PDF
   */
  @Get('statement/:customerId')
  @Permissions(Permission.FIN_READ)
  async exportStatement(
    @Param('customerId', ParseIntPipe) customerId: number,
    @Query('period') period: string,
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    const [customer] = await this.db
      .select()
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.id, customerId),
          eq(schema.customers.enterpriseId, req.user.enterpriseId),
        ),
      );

    if (!customer) {
      return res.status(404).json({ message: '客户不存在' });
    }

    // 获取交易记录（简化示例）
    const orders = await this.db
      .select()
      .from(schema.salesOrders)
      .where(
        and(
          eq(schema.salesOrders.customerId, customerId),
          eq(schema.salesOrders.enterpriseId, req.user.enterpriseId),
          eq(schema.salesOrders.status, 'completed'),
        ),
      );

    const transactions = orders.map((order) => ({
      date: order.createdAt,
      type: '销售单',
      docNo: order.orderNo,
      summary: '销售商品',
      debit: order.payableAmount,
      credit: '0',
    }));

    const html = this.pdfExportService.generateStatementHtml(
      customer,
      transactions,
      period || '本月',
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="对账单-${customer.name}-${period || '本月'}.html"`,
    );
    res.send(html);
  }

  /**
   * 导出通用报表PDF
   */
  @Get('report')
  @Permissions(Permission.INV_READ, Permission.CRM_READ)
  async exportReport(
    @Query('title') title: string,
    @Query('type') type: string,
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    let data: any[] = [];
    let columns: any[] = [];

    // 根据类型获取数据
    switch (type) {
      case 'products':
        data = await this.db
          .select()
          .from(schema.products)
          .where(eq(schema.products.enterpriseId, req.user.enterpriseId));
        columns = [
          { key: 'code', header: '商品编码', width: '15%' },
          { key: 'name', header: '商品名称', width: '25%' },
          { key: 'spec', header: '规格', width: '15%' },
          { key: 'unit', header: '单位', width: '10%' },
          {
            key: 'unitPrice',
            header: '单价',
            width: '15%',
            format: 'currency',
          },
          { key: 'status', header: '状态', width: '10%' },
        ];
        break;
      case 'customers':
        data = await this.db
          .select()
          .from(schema.customers)
          .where(eq(schema.customers.enterpriseId, req.user.enterpriseId));
        columns = [
          { key: 'name', header: '客户名称', width: '25%' },
          { key: 'company', header: '公司', width: '25%' },
          { key: 'phone', header: '电话', width: '15%' },
          { key: 'industry', header: '行业', width: '15%' },
          { key: 'level', header: '等级', width: '10%' },
        ];
        break;
      default:
        return res.status(400).json({ message: '不支持的报表类型' });
    }

    const html = this.pdfExportService.generateHtml({
      title: title || '报表',
      data,
      columns,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${title || '报表'}.html"`,
    );
    res.send(html);
  }

  // ==================== 财务报表（可打印 HTML，数据同 FinanceService 报表接口） ====================

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出资产负债表（可打印 HTML）',
    description:
      '数据与 **GET /finance/reports/balance-sheet** 一致。响应为 `text/html`，浏览器打开后可用「打印 → 另存为 PDF」。\n\n' +
      '权限：`finance:report`。',
  })
  @ApiProduces('text/html; charset=utf-8')
  @ApiQuery({
    name: 'asOfDate',
    required: false,
    example: '2026-05-08',
    description: '截止日期 YYYY-MM-DD',
  })
  @Get('finance/balance-sheet')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceBalanceSheetPdf(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const report = await this.financeService.getBalanceSheet(
      enterpriseIdFromRequest(req),
      asOfDate,
    );
    const html = this.pdfExportService.generateBalanceSheetHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="资产负债表-${report.period}.html"`,
    );
    res.send(html);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出利润表（可打印 HTML）',
    description:
      '数据与 **GET /finance/reports/income-statement** 一致。HTML 可打印为 PDF。权限：`finance:report`。',
  })
  @ApiProduces('text/html; charset=utf-8')
  @ApiQuery({
    name: 'period',
    required: false,
    example: '2026-05',
    description: '会计期间 YYYY-MM',
  })
  @Get('finance/income-statement')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceIncomeStatementPdf(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('period') period?: string,
  ) {
    const report = await this.financeService.getIncomeStatement(
      enterpriseIdFromRequest(req),
      period,
    );
    const html = this.pdfExportService.generateIncomeStatementHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="利润表-${report.period}.html"`,
    );
    res.send(html);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出现金流量表（可打印 HTML）',
    description:
      '数据与 **GET /finance/reports/cash-flow** 一致。HTML 可打印为 PDF。权限：`finance:report`。',
  })
  @ApiProduces('text/html; charset=utf-8')
  @ApiQuery({
    name: 'period',
    required: false,
    example: '2026-05',
    description: '会计期间 YYYY-MM',
  })
  @Get('finance/cash-flow')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceCashFlowPdf(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
    @Query('period') period?: string,
  ) {
    const report = await this.financeService.getCashFlow(
      enterpriseIdFromRequest(req),
      period,
    );
    const html = this.pdfExportService.generateCashFlowHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="现金流量表-${report.period}.html"`,
    );
    res.send(html);
  }

  @ApiTags('财务报表导出')
  @ApiBearerAuth()
  @ApiOperation({
    summary: '导出应收应付明细（可打印 HTML）',
    description:
      '数据与 **GET /finance/reports/ar-ap** 一致，含应收/应付明细表与合计。HTML 可打印为 PDF。权限：`finance:report`。',
  })
  @ApiProduces('text/html; charset=utf-8')
  @Get('finance/ar-ap')
  @Permissions(Permission.FIN_REPORT)
  async exportFinanceArApPdf(
    @Req() req: Request & { user: UserContext },
    @Res() res: Response,
  ) {
    const report = await this.financeService.getArAp(
      enterpriseIdFromRequest(req),
    );
    const html = this.pdfExportService.generateArApHtml(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="应收应付.html"',
    );
    res.send(html);
  }
}
