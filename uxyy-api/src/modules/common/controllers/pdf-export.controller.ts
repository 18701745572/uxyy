import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PdfExportService } from '../services/pdf-export.service';
import { Inject } from '@nestjs/common';
import { DRIZZLE_DB } from '../../database/database.constants';
import type { AppDrizzleDb } from '../../database/database.module';
import * as schema from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

interface UserContext {
  userId: number;
  enterpriseId: number;
  role?: string;
}

@Controller('export/pdf')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  constructor(
    private readonly pdfExportService: PdfExportService,
    @Inject(DRIZZLE_DB) private readonly db: AppDrizzleDb,
  ) {}

  /**
   * 导出销售订单PDF
   */
  @Get('sales-order/:orderId')
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
    res.setHeader('Content-Disposition', `attachment; filename="销售订单-${order.order.orderNo}.html"`);
    res.send(html);
  }

  /**
   * 导出报价单PDF
   */
  @Get('quotation/:quotationId')
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
      contactName: quotation.customer?.contactName,
      items: items.map(({ item, product }) => ({
        ...item,
        productName: product?.name,
        spec: product?.spec,
        unit: product?.unit,
      })),
    };

    const html = this.pdfExportService.generateQuotationHtml(quotationData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="报价单-${quotation.quotation.quotationNo}.html"`);
    res.send(html);
  }

  /**
   * 导出客户对账单PDF
   */
  @Get('statement/:customerId')
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

    const transactions = orders.map(order => ({
      date: order.createdAt,
      type: '销售单',
      docNo: order.orderNo,
      summary: '销售商品',
      debit: order.payableAmount,
      credit: '0',
    }));

    const html = this.pdfExportService.generateStatementHtml(customer, transactions, period || '本月');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="对账单-${customer.name}-${period || '本月'}.html"`);
    res.send(html);
  }

  /**
   * 导出通用报表PDF
   */
  @Get('report')
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
          { key: 'unitPrice', header: '单价', width: '15%', format: 'currency' },
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
    res.setHeader('Content-Disposition', `attachment; filename="${title || '报表'}.html"`);
    res.send(html);
  }
}
